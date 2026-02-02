import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Health check endpoint
  app.get(api.health.check.path, (_req, res) => {
    res.json({ status: "ok" });
  });

  // Note: All data operations are handled directly by the frontend communicating with Supabase.
  // This server primarily serves the static frontend assets.

  return httpServer;
}
