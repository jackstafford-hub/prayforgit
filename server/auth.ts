import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { pool } from "./db";
import bcrypt from "bcrypt";
import { registerSchema, loginSchema } from "@shared/schema";
import { z } from "zod";
import { sendWelcomeEmail, sendPasswordResetEmail } from "./emailService";
import crypto from "crypto";

const SALT_ROUNDS = 10;
const isProduction = process.env.NODE_ENV === "production";

export function getSession() {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET environment variable is required for security");
  }
  
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    pool: pool,
    createTableIfMissing: true,
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
      secure: isProduction,
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

  // Diagnostic endpoint to test auth components
  app.get("/api/auth/debug", async (req, res) => {
    const results: Record<string, any> = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
    };
    
    // Test 1: Check if users table exists and is accessible
    try {
      const { pool } = await import('./db');
      const tableCheck = await pool.query("SELECT COUNT(*) as count FROM users");
      results.usersTableAccessible = true;
      results.usersCount = tableCheck.rows[0]?.count;
    } catch (error: any) {
      results.usersTableAccessible = false;
      results.usersTableError = error?.message || error;
    }
    
    // Test 2: Check if users table has correct columns
    try {
      const { pool } = await import('./db');
      const columnCheck = await pool.query("SELECT id, email, password, first_name, last_name FROM users LIMIT 0");
      results.usersColumnsCorrect = true;
    } catch (error: any) {
      results.usersColumnsCorrect = false;
      results.usersColumnsError = error?.message || error;
    }
    
    // Test 3: Check bcrypt functionality
    try {
      const testHash = await bcrypt.hash("testpassword", 10);
      results.bcryptWorks = true;
      results.bcryptHashLength = testHash.length;
    } catch (error: any) {
      results.bcryptWorks = false;
      results.bcryptError = error?.message || error;
    }
    
    // Test 4: Check session store
    try {
      results.sessionExists = !!req.session;
      results.sessionId = req.session?.id?.substring(0, 8) + '...';
    } catch (error: any) {
      results.sessionError = error?.message || error;
    }
    
    console.log("[AUTH DEBUG]", JSON.stringify(results, null, 2));
    res.json(results);
  });

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
        emailOptIn: data.emailOptIn || false,
      });

      // Set session and save explicitly for Safari compatibility
      req.session.userId = user.id;
      
      sendWelcomeEmail(data.email, data.firstName).catch(() => {});
      
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("[AUTH] Session save error during registration:", saveErr);
          return res.status(500).json({ message: "Failed to create session" });
        }
        
        console.log(`[AUTH] Session created: userId=${user.id}, sessionId=${req.session.id}, op=register`);
        
        res.json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        });
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        console.error("[AUTH] Registration validation error:", error.errors);
        return res.status(400).json({ message: error.errors[0]?.message || "Invalid input" });
      }
      const errorCode = error?.code || 'UNKNOWN';
      const errorMessage = error?.message || error?.toString() || "Unknown error";
      const errorStack = error?.stack || 'No stack trace';
      console.error(`[AUTH] Registration error details:`);
      console.error(`  - Code: ${errorCode}`);
      console.error(`  - Message: ${errorMessage}`);
      console.error(`  - Stack: ${errorStack}`);
      console.error(`  - Full error:`, error);
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
          console.error("[AUTH] Session save error during login:", saveErr);
          return res.status(500).json({ message: "Failed to create session" });
        }
        
        console.log(`[AUTH] Session created: userId=${user.id}, sessionId=${req.session.id}, op=login`);
        
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
      console.error(`[AUTH] Login error: code=${errorCode}`, error?.message || error);
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

  // Forgot password - request reset link
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email is required" });
      }

      const token = crypto.randomUUID();
      const expiry = new Date(Date.now() + 60 * 60 * 1000);

      const userFound = await storage.setResetToken(email.toLowerCase().trim(), token, expiry);

      if (userFound) {
        const baseUrl = process.env.APP_BASE_URL
          || (isProduction ? 'https://prayforchange.org' : `http://localhost:5000`);
        const resetUrl = `${baseUrl}/reset-password?token=${token}`;
        sendPasswordResetEmail(email, resetUrl).catch(() => {});
      }

      res.json({ message: "If an account exists with that email, a reset link has been sent." });
    } catch (error: any) {
      console.error("[AUTH] Forgot password error:", error?.message || error);
      res.json({ message: "If an account exists with that email, a reset link has been sent." });
    }
  });

  // Reset password - set new password with token
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "This reset link is invalid or has expired. Please request a new one." });
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      await storage.resetPassword(user.id, hashedPassword);

      console.log(`[AUTH] Password reset successful for userId=${user.id}`);
      res.json({ message: "Your password has been reset successfully. You can now sign in." });
    } catch (error: any) {
      console.error("[AUTH] Reset password error:", error?.message || error);
      res.status(500).json({ message: "Failed to reset password. Please try again." });
    }
  });

  // Get current user
  app.get("/api/auth/user", async (req, res) => {
    console.log(`[AUTH] /api/auth/user requested, sessionId=${req.session.id}, userId=${req.session.userId || 'none'}`);
    
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
