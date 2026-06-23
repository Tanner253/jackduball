import { addChatMessage, readStore } from '../lib/store.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    if (req.method === 'GET') {
      const since = Number(req.query?.since || 0);
      const doc = await readStore();
      const chat = since > 0 ? doc.chat.filter((m) => m.ts > since) : doc.chat;
      return res.status(200).json({ chat });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const message = String(body.message || '').trim();
      if (!message) {
        return res.status(400).json({ error: 'Message required' });
      }
      const chat = await addChatMessage(body);
      return res.status(200).json({ chat });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('chat error:', error);
    return res.status(500).json({ error: 'Storage unavailable. Link Vercel KV to this project.' });
  }
}
