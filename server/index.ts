import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { seedDatabase } from "./seed";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from './stripeClient';
import { WebhookHandlers } from './webhookHandlers';
import adminRoutes from './routes/admin';
import { startDailyDigestJob } from './dailyDigest';

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

async function initStripe() {
  const { databaseUrl } = await import('./db');

  if (!databaseUrl) {
    console.warn('DATABASE_URL not set, skipping Stripe initialization');
    return;
  }

  try {
    console.log('Initializing Stripe schema...');
    await runMigrations({ databaseUrl });
    console.log('Stripe schema ready');

    const stripeSync = await getStripeSync();

    console.log('Setting up managed webhook...');
    const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0];
    if (!replitDomain) {
      console.warn('REPLIT_DOMAINS not set, skipping webhook setup');
      return;
    }
    const webhookBaseUrl = `https://${replitDomain}`;
    const { webhook, uuid } = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`,
      {
        enabled_events: ['*'],
        description: 'Managed webhook for Stripe sync',
      }
    );
    console.log(`Webhook configured: ${webhook.url} (UUID: ${uuid})`);

    console.log('Syncing Stripe data...');
    stripeSync.syncBackfill()
      .then(() => {
        console.log('Stripe data synced');
      })
      .catch((err: any) => {
        console.error('Error syncing Stripe data:', err);
      });
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
  }
}

let appReady = false;

(async () => {
  const port = parseInt(process.env.PORT || "5000", 10);

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", ready: appReady });
  });

  app.post(
    '/api/stripe/webhook/:uuid',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const signature = req.headers['stripe-signature'];

      if (!signature) {
        return res.status(400).json({ error: 'Missing stripe-signature' });
      }

      try {
        const sig = Array.isArray(signature) ? signature[0] : signature;

        if (!Buffer.isBuffer(req.body)) {
          console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
          return res.status(500).json({ error: 'Webhook processing error' });
        }

        const { uuid } = req.params;
        await WebhookHandlers.processWebhook(req.body as Buffer, sig, uuid);

        res.status(200).json({ received: true });
      } catch (error: any) {
        console.error('Webhook error:', error.message);
        res.status(400).json({ error: 'Webhook processing error' });
      }
    }
  );

  app.use(
    express.json({
      limit: '10mb',
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false, limit: '10mb' }));

  app.get("/start", (_req, res) => {
    res.redirect(301, "/create");
  });

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        log(logLine);
      }
    });

    next();
  });

  await registerRoutes(httpServer, app);
  app.use("/api/admin", adminRoutes);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);

      (async () => {
        try {
          const { checkDbConnectivity, ensureTablesExist } = await import('./db');
          const connected = await checkDbConnectivity();

          if (connected) {
            try {
              await ensureTablesExist();
            } catch (error: any) {
              console.error("[DB] Table initialization failed:", error?.message || error);
            }
          }

          appReady = true;
          log("All routes registered and app is fully ready");

          if (process.env.SEED_DB === 'true') {
            try {
              await seedDatabase();
            } catch (error: any) {
              const code = error?.code || 'UNKNOWN';
              console.error(`[SEED] Database seeding failed (${code}):`, error?.message || error);
            }
          } else if (process.env.NODE_ENV !== 'production') {
            try {
              await seedDatabase();
            } catch (error: any) {
              console.error(`[SEED] Database seeding failed:`, error?.message || error);
            }
          }

          try {
            await initStripe();
          } catch (error) {
            console.error('Stripe initialization failed:', error);
          }

          try {
            startDailyDigestJob();
          } catch (error) {
            console.error('Daily digest job failed to start:', error);
          }
        } catch (error: any) {
          console.error("[STARTUP] Background initialization failed:", error?.message || error);
        }
      })();
    },
  );
})();
