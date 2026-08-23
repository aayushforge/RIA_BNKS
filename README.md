# HISAB — Your Smart Finance Companion

<img src="assets/logo.png" alt="HISAB" width="360">

**HISAB** is a fintech + green-business platform that helps individuals track personal finances and helps small businesses manage money **and** finance eco-friendly equipment — without requiring a credit score.

> BNKS Hackathon project.

---

## ✨ Key Differentiators

- 🚫 **No credit score required** — loan eligibility is based on transaction & repayment history
- 🌱 **Green equipment financing** — solar panels, efficient machinery, eco-upgrades
- 🏦 **Microfinance integration** — small, accessible loans for individuals & micro-businesses
- 🔀 **Dual-mode dashboard** — one platform, Personal or Business view
- 🔒 **Privacy-first** — encrypted data, GDPR-aligned consent, role-based access
- 🇳🇵 **Built for Nepal** — NRs currency, English/Nepali toggle, Nepal tax tools on the roadmap

---

## 🗂 Project Structure

```
/hisab-project/
├── index.html                 # Landing / public page
├── about.html                 # Mission, team, impact
├── login.html                 # Login + Google button + OTP modal
├── register.html              # Personal/Business tabs + OTP verification
├── personal-dashboard.html    # Personal finance dashboard
├── business-dashboard.html    # Business finance + green loans dashboard
├── css/
│   ├── style.css              # Core design system
│   ├── dark-mode.css          # Dark theme overrides
│   └── responsive.css         # Breakpoints
├── js/
│   ├── main.js                # Theme/language toggle, session, toasts
│   ├── auth.js                # Login/register/OTP flow (API + demo fallback)
│   ├── dashboard.js           # Data layer + rendering for both dashboards
│   └── charts.js              # Chart.js wrappers (pie/line/bar)
├── backend/
│   ├── app.py                 # Flask app factory (CORS, JWT)
│   ├── models.py              # MongoDB document schemas/helpers
│   ├── routes.py              # All REST API endpoints
│   ├── database.py            # MongoDB connection + indexes
│   └── requirements.txt
├── assets/
│   ├── logo.png / logo.svg    # HISAB logo (light)
│   ├── logo-dark.png/.svg     # HISAB logo (dark mode)
│   └── icons/favicon.png
├── .env.example
└── README.md
```

---

## 🚀 Getting Started

### 1. Frontend (static, no build step)

The frontend is plain HTML/CSS/JS — no bundler required.

```bash
# from the project root
python3 -m http.server 8080
# open http://localhost:8080
```

**The frontend works standalone**, even without the backend running: `js/auth.js` and `js/dashboard.js` automatically fall back to a local "demo mode" (backed by `localStorage`) if the API at `API_BASE` is unreachable — perfect for offline demos. A toast will tell you when demo mode is active. In demo mode, the OTP code is shown as a toast + logged to the browser console (`[HISAB DEMO] OTP for ...`).

To point the frontend at a real backend, set `window.HISAB_API_BASE` before `js/auth.js` loads (defaults to `http://localhost:5000/api`).

### 2. Backend (Flask + MongoDB)

```bash
cd backend
python3 -m venv venv && source venv/bin/activate      # optional but recommended
pip install -r requirements.txt

cp ../.env.example ../.env      # fill in real values (Mongo URI, JWT secret, SMTP creds)

# make sure MongoDB is running locally, or point DATABASE_URL at Atlas
python app.py
# API now live at http://localhost:5000/api
```

Health check: `GET http://localhost:5000/api/health` and `GET http://localhost:5000/api/health/db`.

If `EMAIL_HOST`/`EMAIL_USERNAME`/`EMAIL_PASSWORD` are not set, OTP emails are printed to the backend console instead of sent — handy for local dev.

---

## 🔒 Security & Privacy

- Passwords hashed with **bcrypt**, never stored in plaintext
- **JWT** access tokens (`flask-jwt-extended`), 60-minute default expiry
- **Email OTP** (4-digit) verification on registration, auto-expiring after 10 minutes
- **Auto-logout** on the frontend after 15 minutes of inactivity (see `js/main.js`)
- Password policy enforced client- and server-side: 8+ characters, a digit, a special character
- Every finance/loan/dashboard API route is `@jwt_required` and scoped to the authenticated user only
- Unregistered visitors can browse `index.html`/`about.html` only — all dashboards check for a valid session and redirect to `login.html` otherwise
- GDPR-aligned consent checkbox on registration; see `.env.example` for the config secrets kept out of source control

---

## 📊 Dashboards

**Personal** — budget portfolio, expense pie chart, income/expense tracking, loan management with calendar reminders, savings goals with progress bars, CSV/PDF report export, budget alerts at 80% of income, AI-style spending tips.

**Business** — revenue/P&L/profit-margin overview, Green Equipment Loans table (status, disbursement, repayment schedule, progress), loan application (equipment cost, justification, expected ROI, document upload), budget breakdown pie chart, repayment tracker with receipt-style confirmation, green-impact estimate, and roadmap cards for inventory/invoicing/tax/payroll tools.

Both dashboards include a lightweight rule-based chatbot assistant (`initChatbot()` in `dashboard.js`) as a placeholder for the Phase 6 AI assistant.

---

## 🧠 AI/ML Roadmap (Phase 6)

The current build ships **heuristic v1** insights (`GET /api/analytics/insights` and the client-side `aiTips()` helper): top spending category, 80%-of-income warnings, and repayment-based credit-alternative messaging. Smart categorization, anomaly detection, predictive cash-flow forecasting and a trained credit-scoring-alternative model are tracked as Phase 2/3 roadmap items (see below).

---

## 🗺 Implementation Roadmap

**MVP (this build):** auth + OTP, personal & business dashboards, income/expense tracking, pie charts, green equipment loans, repayment tracking, calendar reminders, dark/light mode, core security.

**Phase 2:** real AI-powered analytics, full multi-language content, mobile app, payment gateway, document management, transactional email/SMS, social login, mobile OTP 2FA.

**Phase 3:** ML-based credit scoring alternative, smart investment suggestions, automated Nepal tax calculation, P2P lending, carbon footprint calculator, sustainability score, blockchain exploration.

---

## 🔌 Backend API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register user (sends OTP) |
| POST | `/api/auth/verify-otp` | Verify OTP → creates account & returns JWT |
| POST | `/api/auth/resend-otp` | Resend OTP |
| POST | `/api/auth/login` | Login → returns JWT |
| POST | `/api/auth/forgot-password` | Request password reset code |
| GET | `/api/user/profile` | Get current user profile |
| PUT | `/api/user/profile` | Update current user profile |
| POST | `/api/finance/income` | Add income transaction |
| POST | `/api/finance/expense` | Add expense transaction |
| GET | `/api/finance/summary` | Income/expense/savings summary + category breakdown |
| GET | `/api/finance/transactions` | List transactions |
| POST | `/api/loan/apply` | Apply for a loan (personal or green business loan) |
| GET | `/api/loan/status` | List the user's loans |
| POST | `/api/loan/repay` | Record a repayment |
| GET | `/api/loan/schedule` | Repayment history for a loan |
| GET/POST | `/api/savings/goals` | List / create savings goals |
| POST | `/api/savings/goals/<id>/contribute` | Contribute toward a goal |
| POST | `/api/dashboard/preferences` | Save dashboard/theme preferences |
| GET | `/api/analytics/insights` | AI-style spending insights |

All routes except `/auth/*` and `/health*` require `Authorization: Bearer <token>`.

---

## 🗄 Database Schema (MongoDB collections)

`users`, `transactions`, `loans`, `repayments`, `savings`, `otps` — see `backend/models.py` for exact document shape and `backend/database.py` for indexes (unique email, TTL-expiring OTPs, etc.).

---

## 🎨 Design System

- **Colors:** Primary `#2C3E50` (navy), Secondary `#27AE60` (green), Accent `#F39C12` (gold), Light bg `#F8F9FA` / Dark bg `#1A1A2E`
- **Typography:** Poppins (headers bold, body regular) via Google Fonts
- **Icons:** Font Awesome, monochrome/outline style only
- **Themes:** Dark/Light toggle (`css/dark-mode.css`), persisted in `localStorage`
- **Language:** English/Nepali toggle (`data-i18n` attributes, dictionary in `js/main.js`)

---

## © License

© 2026 HISAB. Built for the Green Fintech Hackathon 🌱
