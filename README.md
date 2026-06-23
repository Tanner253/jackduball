# Jack DuBall

Roll down the 5-lane course, jump through donut hoops, and climb the leaderboard.

- **Game:** Vercel → https://jackduball.vercel.app
- **API:** Render → https://jackduball.onrender.com

## Render deploy (same as BBALL)

**Do not use Docker.** There is no Dockerfile. This is a plain Node server in `server/`.

### Option A — Blueprint (easiest)

1. Render Dashboard → **New** → **Blueprint**
2. Connect repo `Tanner253/jackduball`
3. Render reads `render.yaml` and creates a **Node** service
4. Paste **`MONGODB_URI`** when asked (MongoDB Atlas connection string)
5. Deploy

### Option B — Manual (match BBALL settings)

1. **Delete** the broken Docker service if you created one
2. **New** → **Web Service** → connect GitHub repo
3. Settings:

| Field | Value |
|-------|--------|
| **Language / Runtime** | **Node** (not Docker) |
| **Root Directory** | `server` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Health Check Path** | `/healthz` |

4. Environment variables:
   - `MONGODB_URI` = your Atlas connection string *(required)*
   - `MONGODB_DB` = `jackduball`
   - `ALLOWED_ORIGINS` = `https://jackduball.vercel.app`

5. Deploy → check https://jackduball.onrender.com/healthz returns `{"ok":true}`

## MongoDB Atlas

1. Free M0 cluster at mongodb.com/cloud/atlas
2. Database user + Network Access (`0.0.0.0/0`)
3. Copy connection string → `MONGODB_URI` on Render

## Local API dev

```bash
cd server
cp .env.example .env
# paste MONGODB_URI into .env
npm install
npm run dev
```

API runs on http://localhost:4000

## Vercel (game client)

```bash
npx vercel --prod
```

Production API URL is already set to `https://jackduball.onrender.com` in `index.html`.

## API

| Route | Purpose |
|-------|---------|
| `GET /healthz` | Health check |
| `GET /api/leaderboard` | Top 15 scores |
| `POST /api/leaderboard` | Submit score |
| `WS /live` | Live ghost runners + chat |
