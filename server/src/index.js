/**
 * jackduball-api — leaderboard + live multiplayer for Jack DuBall.
 *
 *   GET  /api/leaderboard  -> top scores
 *   POST /api/leaderboard  -> submit score (auto on game over)
 *   GET  /api/profile      -> donut balance + cosmetics
 *   POST /api/shop/buy     -> purchase cosmetic
 *   POST /api/shop/equip   -> equip owned cosmetic
 *   WS   /live             -> ghost positions + chat
 */

import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { addScore, getLeaderboard } from "./lib.js";
import { attachLive } from "./live.js";
import { bankDonuts, buyItem, equipItem, getProfile } from "./profile.js";

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "4kb" }));

const defaultOrigins = ["https://jackduball.vercel.app"];
const allowed = (process.env.ALLOWED_ORIGINS ?? defaultOrigins.join(","))
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      try {
        const ok =
          allowed.includes(origin) ||
          /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
          /\.vercel\.app$/.test(new URL(origin).hostname);
        cb(null, ok);
      } catch {
        cb(null, false);
      }
    },
  })
);

const readLimiter = rateLimit({ windowMs: 60_000, limit: 120 });
const writeLimiter = rateLimit({ windowMs: 600_000, limit: 60 });

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.get("/api/leaderboard", readLimiter, async (_req, res, next) => {
  try {
    const leaderboard = await getLeaderboard();
    res.json({ ok: true, configured: true, leaderboard });
  } catch (e) {
    next(e);
  }
});

app.post("/api/leaderboard", writeLimiter, async (req, res, next) => {
  try {
    const { username, score, donuts } = req.body || {};
    const result = await addScore(username, score);
    let profile = null;
    const banked = Math.max(0, Math.floor(Number(donuts) || 0));
    if (banked > 0 && username) {
      const bank = await bankDonuts(username, banked);
      if (bank.ok) profile = bank.profile;
    }
    const status = result.ok || profile ? 200 : 400;
    res.status(status).json({ ...result, configured: true, profile });
  } catch (e) {
    next(e);
  }
});

app.get("/api/profile", readLimiter, async (req, res, next) => {
  try {
    const result = await getProfile(req.query.username);
    const status = result.ok ? 200 : 400;
    res.status(status).json({ ...result, configured: true });
  } catch (e) {
    next(e);
  }
});

app.post("/api/shop/buy", writeLimiter, async (req, res, next) => {
  try {
    const { username, itemId } = req.body || {};
    const result = await buyItem(username, itemId);
    const status = result.ok ? 200 : 400;
    res.status(status).json({ ...result, configured: true });
  } catch (e) {
    next(e);
  }
});

app.post("/api/shop/equip", writeLimiter, async (req, res, next) => {
  try {
    const { username, itemId } = req.body || {};
    const result = await equipItem(username, itemId);
    const status = result.ok ? 200 : 400;
    res.status(status).json({ ...result, configured: true });
  } catch (e) {
    next(e);
  }
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    ok: false,
    configured: status !== 503,
    error: status >= 500 ? "server error" : err.message,
  });
});

const port = Number(process.env.PORT ?? 4000);
const server = app.listen(port, () => {
  console.log(`jackduball-api listening on :${port}`);
});

attachLive(server);
