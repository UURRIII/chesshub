# Pla de tests — ChessHub

Projecte de Síntesi DAW · Grup 4

Aquest document descriu l'estratègia de proves del projecte ChessHub: què
es prova, amb quines eines, com s'executa i com es reparteix la feina.

---

## 1. Objectiu i abast

Garantir que les funcionalitats principals de la plataforma funcionen
correctament i que els canvis futurs no introdueixen regressions. L'abast
cobreix les tres capes de l'aplicació:

- **Backend** — API REST (CodeIgniter 4).
- **Frontend** — aplicació SPA (Angular).
- **Servidor de temps real** — Socket.IO (Node.js).

---

## 2. Estratègia: nivells de prova

| Nivell | Què prova | On |
|--------|-----------|-----|
| **Unitari** | Funcions i serveis aïllats (sense BD ni xarxa) | Backend i Frontend |
| **Integració / contracte** | Que els serveis criden els endpoints correctes i que els endpoints responen el que toca | Frontend ↔ API |
| **Manual / acceptació** | Fluxos d'usuari complets, provats a mà sobre l'entorn de producció | Tota l'aplicació |

La piràmide de proves prioritza molts tests unitaris (ràpids i fiables),
alguns d'integració i un conjunt acotat de proves manuals d'acceptació.

---

## 3. Eines

| Capa | Framework | Ordre d'execució |
|------|-----------|------------------|
| Backend (PHP) | **PHPUnit** (inclòs amb CodeIgniter 4) | `cd backend && php vendor/bin/phpunit` |
| Frontend (Angular) | **Vitest** + utilitats de test d'Angular | `cd frontend && ng test --watch=false` |

---

## 4. Tests automàtics implementats

### Backend — `backend/tests/`
- **`unit/JwtHelperTest.php`** — autenticació JWT:
  - generació de tokens d'accés i de refresc;
  - descodificació d'un token vàlid (comprova `sub`, `role`, `iss`);
  - rebuig d'un token manipulat, d'un token invàlid i d'un token caducat;
  - rebuig d'un token signat amb un altre secret.
- **`unit/HealthTest.php`** — comprovacions bàsiques de configuració.

### Frontend — `frontend/src/app/`
- **`core/services/auth.spec.ts`** — servei d'autenticació:
  - desat de la sessió (tokens + usuari) després d'un login correcte;
  - neteja de la sessió en fer logout;
  - robustesa davant de dades corruptes al `localStorage` (no bloqueja l'app).
- **`core/services/game.spec.ts`** — servei de joc: cada mètode crida
  l'endpoint correcte de l'API amb el verb i les dades adequades
  (historial, crear partida, cerca d'usuaris, missatges, sol·licituds d'amistat).
- **`app.spec.ts`** — creació del component arrel.

---

## 5. Proves manuals d'acceptació

Checklist a verificar manualment abans de cada lliurament / exposició:

| # | Flux | Resultat esperat |
|---|------|------------------|
| 1 | Registre d'un usuari nou | Compte creat, sessió iniciada |
| 2 | Login amb credencials correctes / incorrectes | Accés / missatge d'error |
| 3 | Partida PvP completa entre dos usuaris | Moviments sincronitzats, rellotge, final correcte |
| 4 | Partida contra el bot (Stockfish) en diversos nivells | El bot respon i la dificultat varia |
| 5 | Resolució d'un puzzle | Validació correcta del moviment solució |
| 6 | Enviar i acceptar una sol·licitud d'amistat | L'amic apareix a la llista |
| 7 | Reptar un amic i xatejar-hi | Repte rebut, partida creada, xat funcional |
| 8 | Anàlisi d'una partida acabada | Estadístiques de precisió mostrades |
| 9 | Rànquing i historial de partides | Dades coherents amb les partides jugades |
| 10 | Disseny responsive (mòbil, tauleta, escriptori) | Interfície usable a totes les mides |

---

## 6. Repartiment de la feina de test

Les proves es reparteixen seguint la mateixa divisió que el desenvolupament:

- **Capa de backend i base de dades** — tests unitaris de la lògica del
  servidor (autenticació, puntuació ELO) i proves de contracte dels endpoints.
- **Capa de frontend** — tests unitaris dels serveis i components Angular.
- **Integració i acceptació** — proves manuals dels fluxos complets, fetes
  conjuntament sobre l'entorn de producció.

Cada membre de l'equip és responsable de provar la part que ha desenvolupat
i, en les proves d'acceptació, es revisen de manera creuada.

---

## 7. Criteris d'acceptació

- Tots els tests automàtics han de passar abans de cada desplegament.
- La checklist de proves manuals s'ha de completar sense errors crítics
  abans de l'exposició.
