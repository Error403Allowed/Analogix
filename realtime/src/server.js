/**
 * realtime/src/server.js
 *
 * Entry point for the Analogix Yjs WebSocket realtime server.
 *
 * Deploy this to Railway / Fly.io / Render — anywhere that keeps a
 * persistent Node process alive (NOT Vercel serverless).
 *
 * Environment variables required:
 *   DATABASE_URL          — Postgres connection string (Supabase pooler URL)
 *   REALTIME_JWT_SECRET   — shared secret with Next.js /api/groq/realtime-token
 *   ALLOWED_ORIGINS       — comma-separated allowed CORS origins
 *   PORT                  — (optional) defaults to 4000
 */

import { createServer } from "http";
import { WebSocketServer } from "ws";
import { jwtVerify } from "jose";
import pg from "pg";
import { getOrCreateRoom, handleConnection } from "./rooms.js";

const PORT = Number(process.env.PORT ?? 4000);
const JWT_SECRET = new TextEncoder().encode(
  process.env.REALTIME_JWT_SECRET ?? "analogix-realtime-dev-secret-change-in-prod",
);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((s) => s.trim());

// ── Postgres pool ─────────────────────────────────────────────────────────────
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
});
pool.on("error", (err) => console.error("[pg] pool error:", err));

// ── HTTP server (health check) ────────────────────────────────────────────────
const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
  } else {
    res.writeHead(404);
    res.end();
  }
});

// ── WebSocket server ──────────────────────────────────────────────────────────
const wss = new WebSocketServer({
  server: httpServer,
  verifyClient: ({ origin }) => {
    // Allow connections from allowed origins (or same-origin).
    if (!origin) return true;
    return ALLOWED_ORIGINS.some(
      (allowed) => origin === allowed || origin.startsWith(allowed),
    );
  },
});

wss.on("connection", async (ws, req) => {
  try {
    // 1. Parse token from query string: wss://host/doc?token=JWT
    const url = new URL(req.url ?? "/", "http://localhost");
    const token = url.searchParams.get("token");

    if (!token) {
      ws.close(4001, "Missing token");
      return;
    }

    // 2. Verify JWT.
    let payload;
    try {
      const { payload: p } = await jwtVerify(token, JWT_SECRET);
      payload = p;
    } catch {
      ws.close(4001, "Invalid or expired token");
      return;
    }

    const { sub: userId, docId, name, color } = payload;

    if (!docId || !userId) {
      ws.close(4001, "Invalid token claims");
      return;
    }

    console.log(`[ws] connect user=${userId} doc=${docId}`);

    // 3. Get or create the in-memory room for this doc.
    const room = await getOrCreateRoom(pool, docId);

    // 4. Handle the connection lifecycle.
    handleConnection(ws, room, pool, userId, name ?? "Student", color ?? "#2563eb");
  } catch (err) {
    console.error("[ws] connection error:", err);
    ws.close(1011, "Internal error");
  }
});

httpServer.listen(PORT, () => {
  console.log(`[server] Analogix realtime server listening on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[server] SIGTERM received — shutting down");
  wss.close();
  await pool.end();
  process.exit(0);
});
