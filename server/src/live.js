/**
 * Live layer — streams in-game position while running so other players see
 * ghost balls on their course. Chat rides the same WebSocket (mirrored to Mongo).
 *
 * Protocol (JSON):
 *   client -> server: { t: "pos", name, x, y, dist, tag?, trail? }
 *                     { t: "end" }
 *                     { t: "chat", name, text }
 *   server -> client: { t: "hello", id }
 *                     { t: "state", players: [{id,name,x,y,dist,tag,trail}], watching }
 *                     { t: "chat-history", messages }
 *                     { t: "chat", msg }
 *                     { t: "chat-err", error }
 */

import { WebSocketServer } from "ws";
import { sanitizeChat, cleanName, isSignedIn } from "./chat.js";
import { getDb, MAX_CHAT } from "./lib.js";
import { sanitizeEquipped } from "./cosmetics.js";

const STALE_MS = 5000;
const BROADCAST_MS = 100;
const MAX_MSG_BYTES = 700;
const CHAT_COOLDOWN_MS = 1500;

export function attachLive(server) {
  const wss = new WebSocketServer({ server, path: "/live" });
  const flying = new Map();
  let chatLog = [];
  let nextId = 1;
  let nextMsgId = 1;

  getDb()
    .then(async (db) => {
      const rows = await db
        .collection("chat")
        .find({}, { projection: { _id: 0 } })
        .sort({ id: -1 })
        .limit(MAX_CHAT)
        .toArray();
      rows.reverse();
      chatLog = [...rows, ...chatLog].slice(-MAX_CHAT);
      nextMsgId = Math.max(nextMsgId, ...rows.map((r) => r.id + 1), 1);
    })
    .catch((e) => console.error("chat history load failed:", e.message));

  wss.on("connection", (ws) => {
    ws.liveId = String(nextId++);
    ws.lastChatAt = 0;
    ws.send(JSON.stringify({ t: "hello", id: ws.liveId }));
    ws.send(JSON.stringify({ t: "chat-history", messages: chatLog }));

    ws.on("message", (buf) => {
      if (buf.length > MAX_MSG_BYTES) return;
      let m;
      try {
        m = JSON.parse(buf.toString());
      } catch {
        return;
      }
      if (m?.t === "pos" && Number.isFinite(m.x) && Number.isFinite(m.y)) {
        flying.set(ws, {
          name: cleanName(m.name) || "Runner",
          x: Math.max(-20, Math.min(20, m.x)),
          y: Math.max(0, Math.min(30, m.y)),
          dist: Math.max(0, Math.min(1_000_000, Number(m.dist) || 0)),
          tag: sanitizeEquipped(m.tag, "tag"),
          trail: sanitizeEquipped(m.trail, "trail"),
          at: Date.now(),
        });
      } else if (m?.t === "end") {
        flying.delete(ws);
      } else if (m?.t === "chat") {
        handleChat(ws, m);
      }
    });
    ws.on("close", () => flying.delete(ws));
    ws.on("error", () => flying.delete(ws));
  });

  function handleChat(ws, m) {
    if (!isSignedIn(m.name)) {
      ws.send(JSON.stringify({ t: "chat-err", error: "set a username to chat" }));
      return;
    }
    const now = Date.now();
    if (now - ws.lastChatAt < CHAT_COOLDOWN_MS) {
      ws.send(JSON.stringify({ t: "chat-err", error: "slow down a sec" }));
      return;
    }
    const text = sanitizeChat(m.text);
    if (!text) return;
    ws.lastChatAt = now;

    const msg = {
      id: nextMsgId++,
      name: cleanName(m.name),
      text,
      ts: now,
      tag: sanitizeEquipped(m.tag, "tag"),
    };
    chatLog.push(msg);
    if (chatLog.length > MAX_CHAT) chatLog.shift();
    persistChat(msg);
    const payload = JSON.stringify({ t: "chat", msg });
    for (const c of wss.clients) {
      if (c.readyState === 1) c.send(payload);
    }
  }

  function persistChat(msg) {
    getDb()
      .then(async (db) => {
        await db.collection("chat").insertOne({ ...msg });
        if (msg.id % 50 === 0) {
          await db.collection("chat").deleteMany({ id: { $lte: msg.id - MAX_CHAT } });
        }
      })
      .catch((e) => console.error("chat persist failed:", e.message));
  }

  setInterval(() => {
    const now = Date.now();
    for (const [ws, p] of flying) {
      if (now - p.at > STALE_MS || ws.readyState !== 1) flying.delete(ws);
    }
    if (wss.clients.size === 0) return;
    const payload = JSON.stringify({
      t: "state",
      players: [...flying.entries()].map(([ws, p]) => ({
        id: ws.liveId,
        name: p.name,
        x: Math.round(p.x * 10) / 10,
        y: Math.round(p.y * 10) / 10,
        dist: Math.round(p.dist),
        tag: p.tag || "tag-gold",
        trail: p.trail || "trail-none",
      })),
      watching: wss.clients.size,
    });
    for (const c of wss.clients) {
      if (c.readyState === 1) c.send(payload);
    }
  }, BROADCAST_MS).unref();

  return wss;
}
