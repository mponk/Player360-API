# Player360 API

Backend service for Player360: coach dashboard, attendance tracking, player performance ratings, daily recap, weekly trend analytics, and parent portal access.

This service is a Node.js + Express + MongoDB app.
It also serves the built production React frontend (from `public/`) so you can run the entire MVP from a single server and a single port.

---

## Features

### Coach flow

* Login as coach and get JWT
* View today's session summary (`/sessions/daily`)
* Take attendance for a session
* Rate player performance (1–5 stars + notes)
* View daily recap (highlights, concerns, risk watch)
* View weekly review (top performers, attendance %, risk alerts, tactical focus)
* All writes are tracked with coachId + timestamp for accountability

### Parent flow

* Parent login (role = "parent")
* Read-only access to their child's recent sessions:

  * attendance history
  * rating
  * coach notes
  * risk flags
* Cannot save or modify team data

### Security / roles

* JWT-based auth
* Role check per route: `coach` vs `parent`
* Parent can only see data for their own linked athlete
* Coach-only endpoints reject parent with 403

---

## Project Structure

```txt
Player360-API/
├─ server.js                # Express app entry point
├─ config/
│  └─ db.js                 # MongoDB connection
├─ middleware/
│  └─ authMiddleware.js     # JWT + role enforcement
├─ models/
│  ├─ User.js               # Coach / Parent users
│  ├─ Player.js             # Player roster
│  ├─ DailySession.js       # Per-training session data
│  ├─ WeeklyReview.js       # Weekly summary / analytics
│  └─ WellnessCheck.js      # Player wellness / risk info
├─ routes/
│  ├─ auth.js               # POST /auth/login, /auth/register
│  ├─ sessions.js           # /sessions/daily, attendance, performance, recap, weekly-review
│  ├─ parent.js             # /parent/overview (parent-only)
│  ├─ players.js            # Player CRUD (internal use)
│  ├─ wellness.js           # Wellness-related endpoints
│  ├─ reviews.js            # (future expansion)
│  └─ health.js             # GET /health
├─ utils/
│  ├─ hash.js               # password hashing
│  └─ jwt.js                # sign/verify JWT
├─ public/                  # React build (index.html + assets)
├─ seed-players.js          # seed demo players
├─ seed-parent.js           # seed parent + coach test accounts
├─ package.json
└─ .gitignore
```

---

## Environment Variables

Create a `.env` file in `Player360-API/` with:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/player360
JWT_SECRET=change_this_to_a_long_random_secret
```

* `PORT`: which port Express listens on (default 5000)
* `MONGODB_URI`: your MongoDB connection string

  * Can be local MongoDB or MongoDB Atlas
* `JWT_SECRET`: any long random string; used to sign auth tokens

**Important:** `.env` is intentionally NOT committed.

---

## Install & Run Locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Seed demo data (players + test users):

   ```bash
   node seed-players.js
   node seed-parent.js
   ```

   After seeding you should have:

   * Coach account:

     * email: `coach@test.com`
     * password: `test123`
     * role: `coach`
   * Parent account:

     * email: `parent@test.com`
     * password: `parent123`
     * role: `parent`
   * Linked demo players

3. Start the server:

   ```bash
   node server.js
   ```

4. Open browser:

   * Frontend UI login: `http://localhost:5000/login`
   * API health check: `http://localhost:5000/health`

If login succeeds and dashboard loads, you're good.

---

## Key API Endpoints

All secured endpoints require `Authorization: Bearer <token>` (JWT).

### Auth

* `POST /auth/login`

  * body: `{ "email": "...", "password": "..." }`
  * returns: `{ "token", "user": { "id", "name", "role" } }`

### Coach dashboard data

* `GET /sessions/daily`

  * returns sessionId, attendance summary, focus, notes, risk,
    plus recap highlight / concern / detailedRisk[]
  * role: coach only

* `GET /sessions/:sessionId/players`

  * returns roster with status for attendance
  * role: coach only

* `POST /sessions/:sessionId/attendance`

  * save attendance array
  * backend stores coachId + timestamp for audit
  * role: coach only

* `GET /sessions/:sessionId/performance`

* `POST /sessions/:sessionId/performance`

  * manage player ratings (1-5 stars + notes)
  * also stored with coachId + timestamp
  * role: coach only

* `GET /sessions/:sessionId/recap`

  * highlight, concern, notes, detailedRisk for a specific session
  * role: coach only

* `GET /sessions/weekly-review`

  * topPerformers, attendanceSummary, riskAlerts, focusNotes for the last 7 days
  * role: coach only

### Parent portal

* `GET /parent/overview`

  * returns only that parent's child info and last sessions
  * role: parent only (403 for coach)

---

## Production / Demo Mode

In this repo, the `public/` folder contains the built React app (the coach dashboard / parent portal frontend).
`server.js` is configured to:

1. Serve static assets from `/public`
2. Handle API under `/auth`, `/sessions`, `/parent`, etc.
3. Send `public/index.html` for non-API routes like `/`, `/attendance`, `/performance`, `/recap`, `/weekly`, `/parent`

That means:

* You can deploy JUST this repo on a server or VM
* Run `node server.js`
* Give coaches/parents ONE URL
* They can log in and use the product from their phone

No separate frontend server is required for demo.

---

## Deployment Notes

Typical deployment steps on a VPS:

1. Clone repo
2. Create `.env` with PORT / MONGODB_URI / JWT_SECRET
3. `npm install`
4. `node seed-players.js && node seed-parent.js` (first time only)
5. Use `pm2 start server.js --name player360` to keep it alive
6. Reverse proxy (nginx) from port 80 → `localhost:5000`

At that point you have:

* `/login` → UI login screen
* Whole coach workflow (attendance, performance, recap, weekly)
* Parent overview under `/parent`

---

## Roadmap / Next steps

* Harden parent data filtering
* Add export/share for weekly review
* Split into separate containers (API vs Web) if needed for scaling
* Add pushable mobile app using the same hooks logic

---
