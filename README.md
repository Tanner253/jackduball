# Jack DuBall

Roll down the 5-lane course, jump through donut hoops, and climb the leaderboard.

**Frontend:** Vercel (`index.html` + GLB assets)  
**Backend:** Render (`server/` — MongoDB + live WebSocket), same pattern as [BBALL](https://github.com/Tanner253/BBALL)

## Local dev

### Game (static)

```bash
npx vercel dev
```

Open the URL shown (usually http://localhost:3000). The client talks to the API at `http://localhost:4000` by default.

### API server

```bash
cd server
cp .env.example .env
# Edit .env — paste your MongoDB Atlas connection string
npm install
npm run dev
```

Health check: http://localhost:4000/healthz

## Deploy

### 1. MongoDB Atlas (free M0)

1. Create a cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database user + network access (`0.0.0.0/0` for Render)
3. Copy the connection string → this is `MONGODB_URI`

### 2. Render (API + live multiplayer)

1. Push this repo to GitHub
2. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
3. Point at this repo — `render.yaml` provisions **jackduball-api**
4. When prompted, set **`MONGODB_URI`** to your Atlas connection string
5. After deploy, note the URL (e.g. `https://jackduball-api.onrender.com`)

Optional env vars on Render:

| Variable | Default |
|----------|---------|
| `MONGODB_URI` | *(required)* |
| `MONGODB_DB` | `jackduball` |
| `ALLOWED_ORIGINS` | `https://jackduball.vercel.app` |

### 3. Vercel (game client)

```bash
npx vercel --prod
```

If your Render URL differs from `https://jackduball-api.onrender.com`, set before deploy:

```html
<script>window.JACKDUBALL_API_URL = 'https://your-api.onrender.com';</script>
```

Or add that snippet to `index.html`.

## API

| Endpoint | Description |
|----------|-------------|
| `GET /healthz` | Health check |
| `GET /api/leaderboard` | Top 15 high scores (best per username) |
| `POST /api/leaderboard` | `{ username, score }` — auto-called on game over |
| `WS /live` | Real-time ghost runners + chat |

### Live WebSocket (`/live`)

While playing, each client streams `{ t: "pos", name, x, y, dist }` ~10Hz. Everyone else sees semi-transparent ghost balls on their course. Chat uses `{ t: "chat", name, text }` and persists to MongoDB.

## Controls

- **A / D** or **← / →** — steer across 5 lanes
- **Spacebar** — jump through donut hoops
- **Double-tap** — jump on mobile
