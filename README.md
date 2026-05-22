# ChessHub

A full-stack real-time chess platform built as a synthesis project for the DAW programme (2025–2026). Play against other users or Stockfish, solve puzzles, track your ELO, and compete on the leaderboard — all in the browser.

**Live demo → [http://grup4.infla.cat](http://grup4.infla.cat)**

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development (Docker)](#local-development-docker)
  - [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [API Overview](#api-overview)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Demo Credentials](#demo-credentials)
- [Authors](#authors)

---

## Features

| Feature | Description |
|---|---|
| **Real-time PvP** | Challenge any online player; moves sync instantly via Socket.IO |
| **Time controls** | Bullet (1 min, 2 min), Blitz (3 min, 5 min, 10 min), Rapid (15 min, 30 min) |
| **Bot matches** | Play against Stockfish at 20 difficulty levels |
| **Post-game analysis** | Stockfish annotates every move: brilliant, great, good, inaccuracy, mistake, blunder |
| **ELO rating** | Dynamic Elo system; full history graph on your profile |
| **Puzzles** | Admin-curated puzzles by difficulty (beginner → expert) and theme tag |
| **Leaderboard** | Global ranking by ELO |
| **Friends & chat** | Send friend requests, chat in real time |
| **Profile** | Avatar upload, bio, stats (W/D/L), ELO evolution chart |
| **Board themes** | Multiple board colour schemes selectable from the profile |
| **Reports** | Flag cheaters or toxic players; admins review in the panel |
| **Admin panel** | Manage users, puzzles and reports; view platform stats |
| **JWT auth** | Secure access tokens (8 h) + rotating refresh tokens (7 d) |
| **Email** | Password reset and verification via SMTP |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 21 (standalone components, signals) |
| Backend API | CodeIgniter 4 · PHP 8.2 |
| Real-time server | Node.js · Express 5 · Socket.IO 4 |
| Database | MariaDB 11 |
| Cache / pub-sub | Redis |
| Container runtime | Docker |
| Orchestration | Kubernetes (K3s) |
| Image registry | Harbor (`kube0.lacetania.cat`) |
| Auth | JWT (HS256) |
| Chess engine | Stockfish (via UCI) |

---

## Architecture

```
Browser
  │
  ├─ HTTP/REST ──► CodeIgniter 4 API  ──► MariaDB
  │                   (PHP-FPM / nginx)
  │
  └─ WebSocket ──► Socket.IO server   ──► MariaDB
                   (Node.js)           └► Redis (pub-sub, presence)
```

All three services run as separate Kubernetes deployments inside the `grup4` namespace. Ingress handles TLS termination and routes `/api/` to the PHP backend, `/socket.io/` to the Node server, and everything else to the Angular SPA.

> **Note:** WebSocket upgrade is disabled (`upgrade: false`) because the school proxy does not support the HTTP → WS upgrade handshake. Socket.IO runs on long-polling transport only.

---

## Getting Started

### Prerequisites

- Docker 24+ and Docker Compose v2
- Node.js 20+ (for local socket server development)
- PHP 8.2 + Composer (for local backend development without Docker)

### Local Development (Docker)

```bash
# 1. Clone the repository
git clone git@github.com:OriolTorraTudela/chesshub.git
cd chesshub

# 2. Copy the environment file and fill in the values
cp .env.example .env
# Edit .env with your local values (see Environment Variables below)

# 3. Start all services
docker compose up -d

# 4. The schema is applied automatically on first start.
#    To apply it manually:
docker exec -i chesshub-db mysql -u root -p chesshub < database/chesshub_schema.sql
```

| Service | URL |
|---|---|
| Angular frontend | http://localhost:4200 |
| CodeIgniter API | http://localhost:8000 |
| Socket.IO server | http://localhost:3000 |
| phpMyAdmin | http://localhost:8080 |
| MariaDB | localhost:3307 |

### Environment Variables

Copy `.env.example` to `.env` and set the following:

```dotenv
# Database
MYSQL_ROOT_PASSWORD=your_root_password
MYSQL_DATABASE=chesshub
MYSQL_USER=chesshub
MYSQL_PASSWORD=your_app_password

# JWT
JWT_SECRET=a_long_random_string_at_least_32_chars

# SMTP (for password reset emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_account@gmail.com
SMTP_PASS=your_16_char_gmail_app_password
SMTP_FROM_NAME=ChessHub

# Frontend (used by the backend for email links)
FRONTEND_URL=http://localhost:4200
```

For the Kubernetes deployment copy `k8s/secrets.example.yaml` to `k8s/secrets.yaml`, fill in the values, and apply:

```bash
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/
```

---

## Project Structure

```
chesshub/
├── backend/                  # CodeIgniter 4 REST API
│   └── app/
│       ├── Controllers/Api/  # AuthController, GameController, PuzzleController …
│       ├── Filters/          # JwtFilter, AdminFilter, ThrottleFilter
│       ├── Helpers/          # jwt_helper, email_helper
│       └── Models/           # UserModel, GameModel, PuzzleModel …
│
├── frontend/                 # Angular 21 SPA
│   └── src/app/
│       ├── core/             # Services, guards, interceptors
│       └── features/         # auth · game · puzzles · profile · admin · friends …
│
├── socket-server/            # Node.js real-time server
│   └── server.js             # Socket.IO events: lobby, game, friends, chat
│
├── database/
│   └── chesshub_schema.sql   # Full schema (13 tables)
│
├── k8s/                      # Kubernetes manifests
│   ├── backend.yaml
│   ├── frontend.yaml
│   ├── socket.yaml
│   ├── mariadb.yaml
│   ├── redis.yaml
│   └── secrets.example.yaml  # Template — never commit secrets.yaml
│
└── docker-compose.yml        # Local development stack
```

---

## API Overview

All endpoints are prefixed with `/api/`. Protected routes require a `Bearer <access_token>` header; admin routes additionally require `role: admin` in the JWT payload.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Create account |
| POST | `/auth/login` | — | Login, returns access + refresh tokens |
| POST | `/auth/refresh` | — | Rotate refresh token |
| POST | `/auth/logout` | JWT | Revoke refresh token |
| POST | `/auth/forgot-password` | — | Send reset email |
| POST | `/auth/reset-password` | — | Reset password via token |
| GET | `/games` | JWT | List user's games |
| POST | `/games` | JWT | Create / join a lobby game |
| GET | `/games/:id` | JWT | Game details + move list |
| GET | `/bot-games` | JWT | List bot games |
| POST | `/bot-games` | JWT | Start a bot game |
| GET | `/puzzles` | JWT | Get random puzzles |
| POST | `/puzzles/:id/attempt` | JWT | Submit puzzle attempt |
| GET | `/leaderboard` | JWT | Global ELO ranking |
| GET | `/profile` | JWT | Own profile |
| PUT | `/profile` | JWT | Update profile |
| GET | `/players/:id` | JWT | Public player profile |
| GET | `/friends` | JWT | Friends list |
| POST | `/friends/request` | JWT | Send friend request |
| PUT | `/friends/:id` | JWT | Accept / reject request |
| POST | `/reports` | JWT | Submit a report |
| GET | `/admin/stats` | Admin | Platform statistics |
| GET | `/admin/users` | Admin | Paginated user list |
| PUT | `/admin/users/:id` | Admin | Update role / active status |
| DELETE | `/admin/users/:id` | Admin | Delete user |
| GET | `/admin/puzzles` | Admin | Paginated puzzle list |
| POST | `/admin/puzzles` | Admin | Create puzzle |
| PUT | `/admin/puzzles/:id` | Admin | Update puzzle |
| DELETE | `/admin/puzzles/:id` | Admin | Delete puzzle |
| GET | `/admin/reports` | Admin | Paginated report list |
| PUT | `/admin/reports/:id` | Admin | Review / resolve report |
| GET | `/admin/games` | Admin | Paginated games list |

---

## Database Schema

13 tables — see [`database/chesshub_schema.sql`](database/chesshub_schema.sql) for the full definition.

```
users             authentication and roles
refresh_tokens    JWT refresh token rotation (SHA-256 hashed)
profiles          public profile, ELO, W/D/L stats, board theme
themes            board colour themes (admin-managed)
elo_history       per-game ELO delta log (for the chart)
games             PvP games
moves             PvP move history (SAN + UCI + FEN)
bot_games         games against Stockfish
bot_moves         Stockfish game move history
game_analysis     post-game Stockfish analysis results (JSON)
puzzles           chess puzzles with solution (UCI moves)
puzzle_attempts   per-user puzzle attempt log
reports           user reports (cheating, harassment, …)
```

---

## Deployment

The production environment runs on a K3s cluster at `grup4.infla.cat` managed by the school (`lacetania.cat`). Images are built and pushed to the school's Harbor registry on every release.

```bash
# Build and push manually
docker build -t kube0.lacetania.cat/grup4/chesshub-backend:latest ./backend
docker build -t kube0.lacetania.cat/grup4/chesshub-frontend:latest ./frontend
docker build -t kube0.lacetania.cat/grup4/chesshub-socket:latest   ./socket-server

docker push kube0.lacetania.cat/grup4/chesshub-backend:latest
docker push kube0.lacetania.cat/grup4/chesshub-frontend:latest
docker push kube0.lacetania.cat/grup4/chesshub-socket:latest

# Rolling restart
kubectl -n grup4 rollout restart deployment/chesshub-backend
kubectl -n grup4 rollout restart deployment/chesshub-frontend
kubectl -n grup4 rollout restart deployment/chesshub-socket
```

---

## Demo Credentials

The live demo at **[http://grup4.infla.cat](http://grup4.infla.cat)** has a pre-seeded admin account for evaluation purposes.

| Role | Email | Password |
|---|---|---|
| Admin | `uri@gmail.com` | `1qazZAQ!` |

The admin panel is accessible at `/admin` and lets you inspect users, manage puzzles, review reports and view platform statistics.

> Regular user accounts can be created freely via the registration page.

---

## Authors

**Oriol Torra** — Grup 4, DAW 2025–2026 · [oriol.torra24@lacetania.cat](mailto:oriol.torra24@lacetania.cat)

---

*Projecte Síntesi DAW · Institut Lacetania · Curs 2025–2026*
