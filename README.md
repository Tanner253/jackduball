# Jack DuBall

Roll down the 5-lane course, jump through donut hoops, smash obstacles, and climb the leaderboard.

## Local dev

```bash
npm install
python -m http.server 8765
```

Open http://localhost:8765 — API routes need `vercel dev` for leaderboard/chat locally:

```bash
npx vercel dev
```

## Leaderboard & chat storage

Scores and chat use a **single JSON document** in [Vercel KV](https://vercel.com/docs/storage/vercel-kv) (Redis).

1. In the Vercel dashboard → your project → **Storage** → Create **KV** database
2. Connect it to the project (sets `KV_*` env vars automatically)
3. Redeploy

Without KV, the game still runs; leaderboard/chat APIs return empty data.

## Deploy

```bash
npx vercel --prod
```

## Controls

- **A / D** or **← / →** — steer across 5 lanes
- **Spacebar** — jump through donut hoops
- **Drag** on main menu — orbit camera around Jack
- **Scroll** on main menu — zoom camera
