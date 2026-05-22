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

# 3. Inicia tots els serveis
docker compose up -d

# 4. L'esquema s'aplica automàticament en el primer inici.
#    Per aplicar-lo manualment:
docker exec -i chesshub-db mysql -u root -p chesshub < database/chesshub_schema.sql
```

| Servei | URL |
|---|---|
| Frontend Angular | http://localhost:4200 |
| API CodeIgniter | http://localhost:8000 |
| Servidor Socket.IO | http://localhost:3000 |
| phpMyAdmin | http://localhost:8080 |
| MariaDB | localhost:3307 |

### Variables d'entorn

Copia `.env.example` a `.env` i configura el següent:

```dotenv
# Base de dades
MYSQL_ROOT_PASSWORD=la_teva_contrasenya_root
MYSQL_DATABASE=chesshub
MYSQL_USER=chesshub
MYSQL_PASSWORD=la_teva_contrasenya_app

# JWT
JWT_SECRET=una_cadena_aleatoria_llarga_de_com_a_minim_32_caracters

# SMTP (per als correus de restabliment de contrasenya)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=el_teu_compte@gmail.com
SMTP_PASS=la_teva_contrasenya_app_gmail_16_caracters
SMTP_FROM_NAME=ChessHub

# Frontend (usat pel backend per als enllaços dels correus)
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
│       ├── Helpers/          # jwt_helper, email_helper
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

Tots els endpoints tenen el prefix `/api/`. Les rutes protegides requereixen la capçalera `Bearer <access_token>`; les rutes d'administrador requereixen a més `role: admin` al payload JWT.

| Mètode | Endpoint | Auth | Descripció |
|---|---|---|---|
| POST | `/auth/register` | — | Crear compte |
| POST | `/auth/login` | — | Inici de sessió, retorna tokens d'accés i refresc |
| POST | `/auth/refresh` | — | Rotar token de refresc |
| POST | `/auth/logout` | JWT | Revocar token de refresc |
| POST | `/auth/forgot-password` | — | Enviar correu de restabliment |
| POST | `/auth/reset-password` | — | Restablir contrasenya via token |
| GET | `/games` | JWT | Llistar partides de l'usuari |
| POST | `/games` | JWT | Crear / unir-se a una partida al lobby |
| GET | `/games/:id` | JWT | Detalls de la partida + llista de moviments |
| GET | `/bot-games` | JWT | Llistar partides contra bot |
| POST | `/bot-games` | JWT | Iniciar una partida contra bot |
| GET | `/puzzles` | JWT | Obtenir puzzles aleatoris |
| POST | `/puzzles/:id/attempt` | JWT | Enviar intent de puzzle |
| GET | `/leaderboard` | JWT | Rànquing global per ELO |
| GET | `/profile` | JWT | Perfil propi |
| PUT | `/profile` | JWT | Actualitzar perfil |
| GET | `/players/:id` | JWT | Perfil públic d'un jugador |
| GET | `/friends` | JWT | Llista d'amics |
| POST | `/friends/request` | JWT | Enviar sol·licitud d'amistat |
| PUT | `/friends/:id` | JWT | Acceptar / rebutjar sol·licitud |
| POST | `/reports` | JWT | Enviar una denúncia |
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

13 taules — consulta [`database/chesshub_schema.sql`](database/chesshub_schema.sql) per a la definició completa.

```
users             autenticació i rols
refresh_tokens    rotació de tokens de refresc JWT (hash SHA-256)
profiles          perfil públic, ELO, estadístiques V/T/D, tema de tauler
themes            temes visuals del tauler (gestionats per l'admin)
elo_history       registre de deltes d'ELO per partida (per a la gràfica)
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
