# ChessHub

Plataforma d'escacs en temps real de pila completa, desenvolupada com a projecte de síntesi del cicle DAW (2025–2026). Juga contra altres usuaris o contra Stockfish, resol puzzles, segueix el teu ELO i competeix al rànquing — tot des del navegador.

**Demo en viu → [http://grup4.infla.cat](http://grup4.infla.cat)**

---

## Taula de continguts

- [Funcionalitats](#funcionalitats)
- [Tecnologies](#tecnologies)
- [Arquitectura](#arquitectura)
- [Posada en marxa](#posada-en-marxa)
  - [Requisits previs](#requisits-previs)
  - [Desenvolupament local (Docker)](#desenvolupament-local-docker)
  - [Variables d'entorn](#variables-dentorn)
- [Estructura del projecte](#estructura-del-projecte)
- [Resum de l'API](#resum-de-lapi)
- [Esquema de base de dades](#esquema-de-base-de-dades)
- [Desplegament](#desplegament)
- [Credencials de demo](#credencials-de-demo)
- [Autors](#autors)

---

## Funcionalitats

| Funcionalitat | Descripció |
|---|---|
| **PvP en temps real** | Desafia qualsevol jugador en línia; els moviments se sincronitzen a l'instant via Socket.IO |
| **Controls de temps** | Bullet (1 min, 2 min), Blitz (3 min, 5 min, 10 min), Ràpid (15 min, 30 min) |
| **Partides contra bot** | Juga contra Stockfish a 20 nivells de dificultat |
| **Anàlisi postpartida** | Stockfish anota cada moviment: brillant, excel·lent, bé, imprecisió, error, blunder |
| **Rànquing ELO** | Sistema Elo dinàmic; gràfica d'evolució completa al perfil |
| **Puzzles** | Puzzles curats per l'admin per dificultat (principiant → expert) i etiqueta temàtica |
| **Rànquing global** | Classificació mundial per ELO |
| **Amics i xat** | Envia sol·licituds d'amistat i xateja en temps real |
| **Perfil** | Pujada d'avatar, biografia, estadístiques (V/T/D), gràfica d'ELO |
| **Temes de tauler** | Diversos esquemes de colors del tauler seleccionables des del perfil |
| **Denúncies** | Reporta tramposos o comportament tòxic; els admins ho revisen al panell |
| **Panell d'administració** | Gestió d'usuaris, puzzles i denúncies; estadístiques de la plataforma |
| **Autenticació JWT** | Tokens d'accés segurs (8 h) + tokens de refresc rotatoris (7 d) |

---

## Tecnologies

| Capa | Tecnologia |
|---|---|
| Frontend | Angular 21 (components autònoms, signals) |
| API backend | CodeIgniter 4 · PHP 8.2 |
| Servidor en temps real | Node.js · Express 5 · Socket.IO 4 |
| Base de dades | MariaDB 11 |
| Caché / pub-sub | Redis |
| Contenidors | Docker |
| Orquestració | Kubernetes (K3s) |
| Registre d'imatges | Harbor (`kube0.lacetania.cat`) |
| Autenticació | JWT (HS256) |
| Motor d'escacs | Stockfish (via UCI) |

---

## Arquitectura

```
Navegador
  │
  ├─ HTTP/REST ──► API CodeIgniter 4  ──► MariaDB
  │                   (PHP-FPM / nginx)
  │
  └─ WebSocket ──► Servidor Socket.IO ──► MariaDB
                   (Node.js)            └► Redis (pub-sub, presència)
```

Els tres serveis s'executen com a desplegaments Kubernetes independents dins del namespace `grup4`. L'Ingress gestiona la terminació TLS i enruta `/api/` cap al backend PHP, `/socket.io/` cap al servidor Node i la resta cap a la SPA Angular.

> **Nota:** La millora a WebSocket està desactivada (`upgrade: false`) perquè el proxy de l'escola no admet el handshake HTTP → WS. Socket.IO funciona únicament amb transport long-polling.

---

## Posada en marxa

### Requisits previs

- Docker 24+ i Docker Compose v2
- Node.js 20+ (per al desenvolupament local del servidor de sockets)
- PHP 8.2 + Composer (per al desenvolupament local del backend sense Docker)

### Desenvolupament local (Docker)

```bash
# 1. Clona el repositori
git clone git@github.com:OriolTorraTudela/chesshub.git
cd chesshub

# 2. Copia el fitxer d'entorn i omple els valors
cp .env.example .env
# Edita .env amb els teus valors locals (vegeu Variables d'entorn)

# 3. Aixeca la base de dades i phpMyAdmin amb Docker
docker compose up -d

# 4. L'esquema s'aplica automàticament en el primer inici.
#    Per aplicar-lo manualment:
docker exec -i chesshub-db mariadb -u root -p chesshub < database/chesshub_schema.sql
```

`docker compose` només aixeca la **base de dades** i **phpMyAdmin**. Els tres serveis de l'aplicació s'executen manualment durant el desenvolupament:

```bash
# Backend (CodeIgniter) — des de ./backend
php spark serve --port 8000     # http://localhost:8000

# Servidor de sockets — des de ./socket-server
npm install && node server.js   # http://localhost:3001

# Frontend (Angular) — des de ./frontend
npm install && ng serve         # http://localhost:4200
```

| Servei | URL | Com s'aixeca |
|---|---|---|
| Frontend Angular | http://localhost:4200 | `ng serve` |
| API CodeIgniter | http://localhost:8000 | `php spark serve --port 8000` |
| Servidor Socket.IO | http://localhost:3001 | `node server.js` |
| phpMyAdmin | http://localhost:8080 | `docker compose` |
| MariaDB | localhost:3307 | `docker compose` |

### Variables d'entorn

Copia `.env.example` a `.env` i configura el següent:

```dotenv
# Base de dades (usat per docker-compose)
MYSQL_ROOT_PASSWORD=la_teva_contrasenya_root
MYSQL_DATABASE=chesshub
MYSQL_USER=chesshub
MYSQL_PASSWORD=la_teva_contrasenya_app

# JWT — ha de ser idèntic al backend i al servidor de sockets
JWT_SECRET=una_cadena_aleatoria_llarga_de_com_a_minim_32_caracters

# CORS i frontend
ALLOWED_ORIGINS=http://localhost:4200
FRONTEND_URL=http://localhost:4200
```

Per al desplegament a Kubernetes, copia `k8s/secrets.example.yaml` a `k8s/secrets.yaml`, omple els valors i aplica:

```bash
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/
```

---

## Estructura del projecte

```
chesshub/
├── backend/                  # API REST CodeIgniter 4
│   └── app/
│       ├── Controllers/Api/  # AuthController, GameController, PuzzleController …
│       ├── Filters/          # JwtFilter, AdminFilter, ThrottleFilter
│       ├── Helpers/          # jwt_helper
│       └── Models/           # UserModel, GameModel, PuzzleModel …
│
├── frontend/                 # SPA Angular 21
│   └── src/app/
│       ├── core/             # Serveis, guards, interceptors
│       └── features/         # auth · game · puzzles · profile · admin · friends …
│
├── socket-server/            # Servidor en temps real Node.js
│   └── server.js             # Esdeveniments Socket.IO: lobby, partida, amics, xat
│
├── docs/                     # Documentació del projecte
│   ├── Memoria_ChessHub.docx         # Memòria del projecte
│   ├── Manual_Tecnic_ChessHub.docx   # Manual tècnic
│   ├── Manual_Usuari_ChessHub.docx   # Manual d'usuari
│   ├── PLA_DE_TESTS.md               # Pla de proves
│   ├── arquitectura.svg / .png       # Diagrama d'arquitectura
│   └── er-model.mmd / .png           # Diagrama entitat-relació
│
├── database/
│   └── chesshub_schema.sql   # Esquema complet (13 taules)
│
├── k8s/                      # Manifests Kubernetes
│   ├── backend.yaml
│   ├── frontend.yaml
│   ├── socket.yaml
│   ├── mariadb.yaml
│   ├── redis.yaml
│   └── secrets.example.yaml  # Plantilla — mai no facis commit de secrets.yaml
│
└── docker-compose.yml        # Entorn de desenvolupament local
```

---

## Resum de l'API

Tots els endpoints tenen el prefix `/api/v1/`. Les rutes protegides requereixen la capçalera `Bearer <access_token>`; les rutes d'administrador requereixen a més que l'usuari tingui `role: admin` a la base de dades.

| Mètode | Endpoint | Auth | Descripció |
|---|---|---|---|
| POST | `/auth/register` | — | Crear compte |
| POST | `/auth/login` | — | Inici de sessió, retorna tokens d'accés i refresc |
| POST | `/auth/refresh` | — | Rotar token de refresc |
| POST | `/auth/logout` | — | Revocar token de refresc |
| GET | `/users/me` | JWT | Perfil propi |
| PUT | `/users/me` | JWT | Actualitzar perfil (bio, tema, contrasenya…) |
| POST | `/users/me/avatar` | JWT | Pujar avatar |
| GET | `/users/:id` | JWT | Perfil públic d'un jugador |
| GET | `/users/:id/stats` | JWT | Estadístiques d'un jugador |
| GET | `/users/:id/elo-history` | — | Historial d'ELO (per a la gràfica) |
| POST | `/users/:id/report` | JWT | Denunciar un jugador |
| GET | `/leaderboard` | — | Rànquing global per ELO |
| GET | `/friends` | JWT | Llista d'amics |
| GET | `/friends/requests` | JWT | Sol·licituds rebudes i enviades |
| GET | `/friends/search?q=` | JWT | Cercar jugadors |
| POST | `/friends/request/:id` | JWT | Enviar sol·licitud d'amistat |
| POST | `/friends/:id/accept` | JWT | Acceptar sol·licitud |
| DELETE | `/friends/:id` | JWT | Eliminar amistat / rebutjar / cancel·lar |
| GET | `/messages/unread` | JWT | Nombre de missatges sense llegir |
| GET | `/messages/:id` | JWT | Conversa amb un amic |
| POST | `/messages/:id` | JWT | Enviar missatge directe |
| GET | `/games` | JWT | Llistar partides de l'usuari |
| POST | `/games` | JWT | Crear una partida al lobby |
| GET | `/games/waiting` | JWT | Partides esperant rival |
| GET | `/games/active` | JWT | Partides en curs (espectador) |
| GET | `/games/history` | JWT | Historial de partides (PvP + bot) |
| GET | `/games/:id` | JWT | Detalls de la partida + moviments |
| POST | `/games/:id/move` | JWT | Registrar un moviment |
| POST | `/games/:id/join` | JWT | Unir-se a una partida |
| POST | `/games/:id/resign` | JWT | Abandonar |
| POST | `/games/:id/finish` | JWT | Finalitzar (escac i mat, taules, temps…) |
| GET | `/bot-games` | JWT | Llistar partides contra bot |
| POST | `/bot-games` | JWT | Iniciar una partida contra bot |
| GET | `/bot-games/:id` | JWT | Detalls de la partida contra bot |
| POST | `/bot-games/:id/move` | JWT | Registrar moviment contra bot |
| POST | `/bot-games/:id/finish` | JWT | Finalitzar partida contra bot |
| GET | `/puzzles` | — | Obtenir puzzles aleatoris |
| GET | `/puzzles/:id` | — | Detalls d'un puzzle |
| POST | `/puzzles/:id/attempt` | JWT | Enviar intent de puzzle |
| POST | `/analysis/game/:id` | JWT | Analitzar una partida PvP |
| POST | `/analysis/bot-game/:id` | JWT | Analitzar una partida contra bot |
| GET | `/admin/stats` | Admin | Estadístiques de la plataforma |
| GET | `/admin/users` | Admin | Llista d'usuaris paginada |
| PUT | `/admin/users/:id` | Admin | Actualitzar rol / estat actiu |
| DELETE | `/admin/users/:id` | Admin | Eliminar usuari |
| GET | `/admin/puzzles` | Admin | Llista de puzzles paginada |
| POST | `/admin/puzzles` | Admin | Crear puzzle |
| PUT | `/admin/puzzles/:id` | Admin | Actualitzar puzzle |
| DELETE | `/admin/puzzles/:id` | Admin | Eliminar puzzle |
| GET | `/admin/reports` | Admin | Llista de denúncies paginada |
| PUT | `/admin/reports/:id` | Admin | Revisar / resoldre denúncia |
| GET | `/admin/games` | Admin | Llista de partides paginada |

---

## Esquema de base de dades

15 taules — consulta [`database/chesshub_schema.sql`](database/chesshub_schema.sql) per a la definició completa.

```
users             autenticació i rols
refresh_tokens    rotació de tokens de refresc JWT (hash SHA-256)
profiles          perfil públic, ELO, estadístiques V/T/D, tema de tauler
themes            temes visuals del tauler (gestionats per l'admin)
elo_history       registre de deltes d'ELO per partida (per a la gràfica)
friendships       relacions d'amistat entre usuaris (sol·licituds i acceptades)
direct_messages   missatges directes entre amics
games             partides PvP
moves             historial de moviments PvP (SAN + UCI + FEN)
bot_games         partides contra Stockfish
bot_moves         historial de moviments de partides contra bot
game_analysis     resultats de l'anàlisi postpartida de Stockfish (JSON)
puzzles           puzzles d'escacs amb solució (moviments UCI)
puzzle_attempts   registre d'intents de puzzle per usuari
reports           denúncies d'usuaris (trampes, assetjament, …)
```

---

## Desplegament

L'entorn de producció s'executa en un clúster K3s a `grup4.infla.cat` gestionat per l'escola (`lacetania.cat`). Les imatges es construeixen i es pugen al registre Harbor de l'escola en cada versió.

```bash
# Construcció i pujada manual
docker build -t kube0.lacetania.cat/grup4/chesshub-backend:latest ./backend
docker build -t kube0.lacetania.cat/grup4/chesshub-frontend:latest ./frontend
docker build -t kube0.lacetania.cat/grup4/chesshub-socket:latest   ./socket-server

docker push kube0.lacetania.cat/grup4/chesshub-backend:latest
docker push kube0.lacetania.cat/grup4/chesshub-frontend:latest
docker push kube0.lacetania.cat/grup4/chesshub-socket:latest

# Reinici progressiu
kubectl -n grup4 rollout restart deployment/chesshub-backend
kubectl -n grup4 rollout restart deployment/chesshub-frontend
kubectl -n grup4 rollout restart deployment/chesshub-socket
```

---

## Credencials de demo

La demo en viu a **[http://grup4.infla.cat](http://grup4.infla.cat)** disposa d'un compte d'administrador pre-creat per a l'avaluació.

| Rol | Correu | Contrasenya |
|---|---|---|
| Administrador | `uri@gmail.com` | `1qazZAQ!` |

El panell d'administració és accessible a `/admin` i permet inspeccionar usuaris, gestionar puzzles, revisar denúncies i consultar les estadístiques de la plataforma.

> Els comptes d'usuari regulars es poden crear lliurement des de la pàgina de registre.

---

## Autors

**Oriol Torra** — Grup 4, DAW 2025–2026 · [oriol.torra24@lacetania.cat](mailto:oriol.torra24@lacetania.cat)

---

*Projecte Síntesi DAW · Institut Lacetania · Curs 2025–2026*
