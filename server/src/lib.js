/**
 * MongoDB + leaderboard helpers for jackduball-api.
 */

import { MongoClient } from "mongodb";

export const MAX_SCORES = 15;
export const MAX_CHAT = 500;

const NAME_MAX = 20;

let clientPromise = null;

export async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    const err = new Error("MONGODB_URI is not configured");
    err.status = 503;
    throw err;
  }
  if (!clientPromise) {
    clientPromise = MongoClient.connect(uri)
      .then(async (client) => {
        const db = client.db(process.env.MONGODB_DB || "jackduball");
        await Promise.all([
          db.collection("leaderboard").createIndex({ score: -1, ts: 1 }),
          db.collection("leaderboard").createIndex({ key: 1 }, { unique: true }),
          db.collection("chat").createIndex({ id: -1 }),
        ]);
        return db;
      })
      .catch((e) => {
        clientPromise = null;
        throw e;
      });
  }
  return clientPromise;
}

export function cleanUsername(raw) {
  return String(raw ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, NAME_MAX);
}

export function usernameKey(name) {
  return cleanUsername(name).toLowerCase();
}

export async function getLeaderboard() {
  const db = await getDb();
  return db
    .collection("leaderboard")
    .find({})
    .sort({ score: -1, ts: 1 })
    .limit(MAX_SCORES)
    .project({ _id: 0, username: 1, score: 1, ts: 1 })
    .toArray();
}

export async function addScore(username, score) {
  const cleanName = cleanUsername(username);
  const cleanScore = Math.max(0, Math.floor(Number(score) || 0));
  if (!cleanName || cleanScore <= 0) {
    return { ok: false, error: "Invalid username or score." };
  }

  const db = await getDb();
  const col = db.collection("leaderboard");
  const key = usernameKey(cleanName);
  const existing = await col.findOne({ key });

  if (existing && cleanScore <= existing.score) {
    const board = await getLeaderboard();
    return { ok: true, leaderboard: board, saved: false };
  }

  const doc = {
    key,
    username: cleanName,
    score: cleanScore,
    ts: Date.now(),
  };

  if (existing) {
    await col.updateOne({ key }, { $set: doc });
  } else {
    await col.insertOne(doc);
  }

  const all = await col.find({}).sort({ score: -1, ts: 1 }).toArray();
  if (all.length > MAX_SCORES) {
    const drop = all.slice(MAX_SCORES).map((r) => r.key);
    await col.deleteMany({ key: { $in: drop } });
  }

  const board = await getLeaderboard();
  return { ok: true, leaderboard: board, saved: true };
}
