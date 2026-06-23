import { kv } from '@vercel/kv';

const STORE_KEY = 'jackduball:document';
const MAX_SCORES = 50;
const MAX_CHAT = 120;

export function emptyStore() {
  return { scores: [], chat: [] };
}

export async function readStore() {
  try {
    const doc = await kv.get(STORE_KEY);
    if (!doc || typeof doc !== 'object') return emptyStore();
    return {
      scores: Array.isArray(doc.scores) ? doc.scores : [],
      chat: Array.isArray(doc.chat) ? doc.chat : []
    };
  } catch (error) {
    console.error('readStore failed:', error.message);
    return emptyStore();
  }
}

export async function writeStore(doc) {
  await kv.set(STORE_KEY, {
    scores: doc.scores.slice(0, MAX_SCORES),
    chat: doc.chat.slice(-MAX_CHAT)
  });
}

export async function addScore(entry) {
  const doc = await readStore();
  doc.scores.push({
    username: String(entry.username || 'Anonymous').slice(0, 20),
    score: Math.max(0, Math.floor(Number(entry.score) || 0)),
    donuts: Math.max(0, Math.floor(Number(entry.donuts) || 0)),
    ts: Date.now()
  });
  doc.scores.sort((a, b) => b.score - a.score);
  doc.scores = doc.scores.slice(0, MAX_SCORES);
  await writeStore(doc);
  return doc.scores;
}

export async function addChatMessage(entry) {
  const doc = await readStore();
  doc.chat.push({
    username: String(entry.username || 'Anonymous').slice(0, 20),
    message: String(entry.message || '').slice(0, 200),
    ts: Date.now()
  });
  doc.chat = doc.chat.slice(-MAX_CHAT);
  await writeStore(doc);
  return doc.chat;
}

export { MAX_SCORES, MAX_CHAT };
