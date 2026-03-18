# MindPal AI

**Multimodal Emotional Companion & Mental Health Early Warning System**

Privacy-first, introvert-friendly, non-clinical. An AI system that acts as a gentle emotional companion, observes patterns over time, and offers calm support and early emotional wellness awareness — without diagnosis or medical language.

---

## Quick start

### Backend (FastAPI)

```bash
cd mindpal-ai/backend
# Optional: create venv and activate
# python -m venv venv && .\venv\Scripts\activate  (Windows)
pip install -r requirements.txt
# Uses in-memory DB by default (no MongoDB required). Set USE_IN_MEMORY_DB=false and MONGODB_URI for real DB.
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API base: **http://localhost:8000**. Docs: **http://localhost:8000/docs**.

### Frontend (React + Vite)

```bash
cd mindpal-ai/frontend
npm install
npm run dev
```

Set API URL (e.g. in `.env`):

```env
VITE_API_URL=http://localhost:8000/api
```

Then open **http://localhost:5173** (or the port Vite prints).

---

## Folder structure

```
mindpal-ai/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, router registration
│   │   ├── config.py            # Settings (JWT, DB, CORS)
│   │   ├── database.py          # MongoDB or in-memory DB
│   │   ├── database_memory.py    # In-memory store (no MongoDB)
│   │   ├── api/
│   │   │   ├── deps.py           # get_current_user_id (JWT)
│   │   │   └── routes/          # Auth, mood, journal, forest, support, etc.
│   │   ├── models/              # Pydantic schemas (user, mood, journal, risk, …)
│   │   ├── services/            # auth_service, chat_service
│   │   └── ai/                  # risk_engine, healing_engine, sentiment, emotion_face
│   ├── requirements.txt
│   └── .env.example             # Optional: JWT_SECRET, MONGODB_URI, USE_IN_MEMORY_DB
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── context/AuthContext.tsx
│   │   ├── components/Layout.tsx
│   │   └── pages/               # Dashboard, Mood, Journal, Forest, Companion, Support, …
│   ├── package.json
│   └── .env                     # VITE_API_URL
│
└── README.md                    # This file
```

---

## API overview

All endpoints under `/api`. Protected routes require header: `Authorization: Bearer <token>`.

| Area | Method | Path | Description |
|------|--------|------|-------------|
| **Auth** | POST | `/api/auth/signup` | Register |
| | POST | `/api/auth/login` | Login (returns `access_token`, `user`) |
| **Mood** | GET | `/api/mood` | List mood entries |
| | POST | `/api/mood` | Create mood (emoji + optional color) |
| **Journal** | GET | `/api/journal` | List entries (text optional for privacy mode) |
| | POST | `/api/journal` | Create (body: `text`, optional `store_emotion_only`) |
| **Dashboard** | GET | `/api/dashboard` | Risk summary, mood graph, streak, activity (no internal state) |
| **Emotion snap** | GET | `/api/emotion/streak` | Streak days |
| | POST | `/api/emotion/snap/json` | Submit emotion (e.g. from client face model) |
| **Forest** | GET | `/api/forest` | Trees + animals (from snaps), streak |
| | POST | `/api/forest/activity` | Record calm activity (calm_animal, water_plant, simple_puzzle) |
| | GET | `/api/forest/activities` | List recent activities |
| **Companion** | GET | `/api/companion-character` | Get/create companion (name, traits, starter) |
| | POST | `/api/chat/message` | Send message; GET `/api/chat/history` for history |
| **Support** | GET | `/api/support` | Gentle suggestions (breathing, tasks, music); optional escalation if consented |
| **Consent** | GET/POST | `/api/consent` | Privacy consent |
| **Trusted contact** | GET/POST | `/api/trusted-contact` | Optional contact for gentle escalation |
| **Baseline** | GET | `/api/emotional-baseline/questions` | Choice-based baseline questions |
| | POST | `/api/emotional-baseline` | Submit baseline |
| | GET | `/api/emotional-baseline/latest` | Latest baseline |
| **30-day reflection** | GET | `/api/reflection-30d/questions` | Reflection questions |
| | POST | `/api/reflection-30d` | Submit reflection |
| | GET | `/api/reflection-30d/compare` | Gentle baseline vs reflection message |
| **Behavior** | GET/POST | `/api/behavior` | Sleep, screen time, activity (silent monitoring) |

---

## Environment (backend)

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | (dev default) | Secret for JWT; set in production |
| `JWT_EXPIRE_MINUTES` | 10080 (7 days) | Token expiry |
| `MONGODB_URI` | `mongodb://localhost:27017` | Used only if not in-memory |
| `MONGODB_DB` | `mindpal` | DB name |
| `USE_IN_MEMORY_DB` | `True` | If True, no MongoDB needed |
| `CORS_ORIGINS` | (see main.py) | Allowed frontend origins |

---

## Future improvements

- **Voice** – Optional short voice clips; extract features (e.g. librosa), store only emotion score; no raw audio.
- **Real ML** – Replace rule-based risk/sentiment with small trained models (e.g. RandomForest, lightweight transformers) where appropriate.
- **Face emotion** – Integrate MediaPipe or a small CNN for live/daily snap emotion; keep pipeline mockable.
- **Typing/screen metrics** – Optional behavioral signals (e.g. typing rhythm, screen time) for long-term analysis only; no user-facing alerts.
- **Offline / PWA** – Service worker and local caching for journal/forest when offline.
- **i18n** – Localize UI and all user-facing strings (including support messages).
- **Audit log** – Optional audit trail for consent and data access for compliance.
- **Export** – Let users export their data (mood, journal summaries, forest) in a portable format.

---

## Important notes

- **No diagnosis** – The system never diagnoses; internal states (e.g. stable / mild concern / needs support) are used only for suggestions and never shown as labels.
- **Escalation** – The optional “reach out to someone you trust or a professional” message appears only when the internal state suggests need for support **and** the user has set a trusted contact with consent. Wording is non-alarming; user stays in control.
- **Privacy** – Journal can store only emotion scores (`store_emotion_only`); raw text is not persisted in that mode. No raw audio is stored.
