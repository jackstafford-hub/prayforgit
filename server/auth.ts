import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { databaseUrl } from "./db";
import bcrypt from "bcrypt";
import { registerSchema, loginSchema } from "@shared/schema";
import { z } from "zod";

const SALT_ROUNDS = 10;

export function getSession() {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET environment variable is required for security");
  }
  
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: databaseUrl,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  });
}

declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Register with email/password
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

      // Create user
      const user = await storage.createUser({
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName || null,
      });

      // Set session and save explicitly for Safari compatibility
      req.session.userId = user.id;
      
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Session save error during registration:", saveErr);
          return res.status(500).json({ message: "Failed to create session" });
        }
        
        if (process.env.NODE_ENV === 'production') {
          console.log(`[AUTH] Session created for user ${user.id} (register)`);
        }
        
        res.json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        });
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        console.error("Registration validation error:", error.errors);
        return res.status(400).json({ message: error.errors[0]?.message || "Invalid input" });
      }
      const errorCode = error?.code || 'UNKNOWN';
      const errorMessage = error?.message || error?.toString() || "Unknown error";
      console.error("Registration error:", errorMessage, error?.stack);
      if (process.env.LOG_DB_DIAGNOSTICS === 'true') {
        console.log(`[DB_DIAG] register failed: code=${errorCode}, op=getUserByEmail|createUser`);
      }
      res.status(500).json({ message: "Failed to create account. Please try again." });
    }
  });

  // Login with email/password
  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(data.email);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Verify password
      const isValid = await bcrypt.compare(data.password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Set session and save explicitly for Safari compatibility
      req.session.userId = user.id;

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Session save error during login:", saveErr);
          return res.status(500).json({ message: "Failed to create session" });
        }
        
        if (process.env.NODE_ENV === 'production') {
          console.log(`[AUTH] Session created for user ${user.id} (login)`);
        }
        
        res.json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        });
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message || "Invalid input" });
      }
      const errorCode = error?.code || 'UNKNOWN';
      console.error("Login error:", error);
      if (process.env.LOG_DB_DIAGNOSTICS === 'true') {
        console.log(`[DB_DIAG] login failed: code=${errorCode}, op=getUserByEmail`);
      }
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/api/auth/user", async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      console.log(`[AUTH] /api/auth/user requested, session.userId: ${req.session.userId || 'undefined'}`);
    }
    
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};
