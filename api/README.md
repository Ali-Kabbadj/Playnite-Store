
#  GamesNexus Public API

[← Back to Root README](../README.md) | [Read Architecture](../docs/ARCHITECTURE_AND_PIPELINE.md)

This is the high-performance, read-only backend API that powers the Playnite extension. It is built for extreme speed, utilizing **Fastify**, **PostgreSQL**, and **Redis** to ensure that when a user clicks on a game in Playnite, the details load instantly.

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Fastify (with `@fastify/cors`)
- **Language:** TypeScript
- **Database:** PostgreSQL (`pg` module)
- **Caching:** Redis

## 🚀 Getting Started

### 1. Prerequisites

- Node.js (v18 or higher)
- A running PostgreSQL instance (with the database populated)
- A running Redis instance (default: `localhost:6379`)

### 2. Installation

Navigate to the `/api` directory and install the dependencies:

```bash
cd api
npm install
```

### 3. Environment Variables

Create a `.env` file in the `/api` directory. You can copy the variables from `.env.example` if available, or use the following:

```env
PORT=3456
HOST=0.0.0.0
DATABASE_URL=postgres://postgres:3248@localhost:5432/playnitedb
REDIS_URL=redis://localhost:6379
```

### 4. Running the Server

**For Development (Auto-reloading):**

```bash
npm run dev
```

**For Production:**

```bash
npm run build
npm run start
```

## 📡 Endpoints Overview

All endpoints are prefixed with `/api/v1/`.

- `GET /games` - Fetch paginated games (supports search, filtering by genre, platform, source, etc.)
- `GET /games/:id` - Fetch deep details for a single game (hydrated with repacks, media, platforms, etc.)
- `GET /genres` - Get all available genres.
- `GET /platforms` - Get all available platforms.
- `GET /providers` & `/sources` - Get repack sources.

## 🧠 Caching Strategy

To prevent hammering the database, responses are aggressively cached using Redis. Global lists (like `/genres`) are cached for 24 hours, while individual game details are cached for 1 hour. If you update data via the Admin Panel, the caches will eventually expire and pull the fresh data.

```

```
