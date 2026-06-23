import { addScore, readStore } from '../lib/store.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    if (req.method === 'GET') {
      const doc = await readStore();
      return res.status(200).json({ scores: doc.scores });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const scores = await addScore(body);
      return res.status(200).json({ scores });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('leaderboard error:', error);
    return res.status(500).json({ error: 'Storage unavailable. Link Vercel KV to this project.' });
  }
}
