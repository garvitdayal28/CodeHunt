# CodeHunt — Step-by-Step Development Todo List
## Intelligent End-to-End Travel Planning & Hospitality Management Platform

> **Tech Stack:** React + Vite + TailwindCSS (Frontend) | Python Flask (Backend) | Firebase Firestore + Auth | Redis | SSE

---

## 🔷 Phase 1 — Project Setup & Infrastructure
*Goal: Get the foundational infrastructure wired up so all future work has a base to build on.*

- [ ] **Backend scaffold** — Initialize Flask app in `/backend` with virtual environment and `requirements.txt`
- [ ] **Flask Blueprints structure** — Create blueprint directories: `auth`, `bookings`, `disruptions`, `admin`, `reporting`, `events`
- [ ] **Firebase project setup** — Create Firebase project, enable Firestore & Authentication, download service account key
- [ ] **Firebase Admin SDK** — Initialize `firebase_admin` in Flask, load credentials from `FIREBASE_SERVICE_ACCOUNT_JSON` env var
- [ ] **Redis setup** — Run Redis locally via Docker, configure `REDIS_URL` env var, test connection from Flask
- [ ] **Environment config** — Create `.env.example` with all required keys (`FIREBASE_SERVICE_ACCOUNT_JSON`, `REDIS_URL`, `FLASK_ENV`, `FRONTEND_ORIGIN`, `JWT_AUDIENCE`)
- [ ] **CORS config** — Install `Flask-CORS`, configure to allow requests from `FRONTEND_ORIGIN`
- [ ] **Frontend dependencies** — Install `react-router-dom`, `axios`, `firebase` (client SDK), `recharts` in `/frontend`
- [ ] **Axios interceptor** — Set up Axios instance with interceptor that attaches Firebase ID token to `Authorization` header
- [ ] **Health check endpoint** — Implement `GET /api/health` that checks Firestore + Redis connectivity
- [ ] **Structured error responses** — Create a consistent error envelope utility: `{ "error": "CODE", "message": "...", "request_id": "uuid" }`

---

## 🔷 Phase 2 — Authentication & Role-Based Access
*Goal: Users can register, log in, and be routed to the correct dashboard based on their role.*

### Backend
- [ ] **`POST /api/auth/register`** — Accept email, password, display name, and role → Create user in Firebase Auth → Set custom claim with role → Write user doc to `users` collection
- [ ] **`POST /api/auth/login`** — Verify credentials via Firebase, return token
- [ ] **`POST /api/auth/refresh`** — Handle token refresh
- [ ] **`@require_auth` decorator** — Verifies Firebase ID token on every protected route, extracts UID and role
- [ ] **`@require_role` decorator** — Extends `@require_auth` to check that the user's role matches the allowed roles for the endpoint
- [ ] **Input validation** — Set up Marshmallow or Pydantic for request body validation on auth endpoints

### Frontend
- [ ] **Firebase client SDK init** — Configure Firebase app in React with project config
- [ ] **Auth context** — Create `AuthContext` with `useAuth` hook → stores current user, token, role, loading state
- [ ] **Login page** — Email/password login form with role display after login
- [ ] **Register page** — Registration form with role selector (Traveler, Hotel Admin, Tour Operator, Platform Admin)
- [ ] **Protected route wrapper** — `<ProtectedRoute allowedRoles={[...]} />` component using React Router
- [ ] **Role-based redirect** — After login, redirect user to their role-specific dashboard route
- [ ] **Layout shell** — Create shared layout with role-aware sidebar navigation

---

## 🔷 Phase 3 — Data Model & Firestore Collections
*Goal: All Firestore collections, subcollections, security rules, and composite indexes are in place.*

- [ ] **`users` collection** — Document per user (UID as doc ID): display name, email, role, linked property/operator ID
- [ ] **`properties` collection** — Hotel property docs: name, location, room types, inventory counts, admin UID
  - [ ] `rooms` subcollection — Individual room docs: room number, type, status (AVAILABLE/OCCUPIED/MAINTENANCE)
- [ ] **`tours` collection** — Tour docs: name, description, duration, category tags, operator UID
  - [ ] `time_slots` subcollection — Slot docs: scheduled time, capacity, booked count
- [ ] **`itineraries` collection** — Per-traveler: destination, dates, lifecycle status
  - [ ] `bookings` subcollection — Hotel reservation docs with denormalized guest name + property name
  - [ ] `activities` subcollection — Activity booking docs with denormalized tour name
- [ ] **`disruption_events` collection** — Disruption records: itinerary ID, type, original/new values, timestamp, cascaded refs
- [ ] **`activity_log` collection** — Immutable audit log entries: actor UID, role, action type, resource path, timestamp, changes map
- [ ] **`alerts` collection** — Targeted admin alerts: target UID, alert type, message, source event ID, read boolean
- [ ] **Firestore composite indexes** — Define in `firestore.indexes.json`:
  - `alerts`: target_uid + read + created_at
  - `activity_log`: resource_id + created_at
  - `disruption_events`: destination + created_at
  - `itineraries/activities`: scheduled_time + status
- [ ] **Firestore security rules** — Write rules ensuring users can only access own data; admins access own property/tour data

---

## 🔷 Phase 4 — Traveler Features
*Goal: Travelers can create itineraries, search/book hotels & tours, and view a unified timeline.*

### Backend
- [ ] **`GET /api/itineraries`** — Return all itineraries for the authenticated traveler
- [ ] **`POST /api/itineraries`** — Create new itinerary (destination, dates) → status: `DRAFT`
- [ ] **`GET /api/itineraries/{id}`** — Return full itinerary with bookings + activities subcollections
- [ ] **`POST /api/bookings`** — Create hotel booking linked to itinerary, update room availability, write audit log
- [ ] **`POST /api/activities`** — Book a tour activity, decrement slot capacity, write audit log
- [ ] **Search hotels endpoint** — `GET /api/search/hotels?destination=&dates=&price_range=&rating=` with Redis cache (5-min TTL)
- [ ] **Search tours endpoint** — `GET /api/search/tours?destination=&category=&date=` with Redis cache
- [ ] **Pagination** — Implement Firestore cursor-based pagination on all list endpoints (default 20, max 100)

### Frontend
- [ ] **Traveler dashboard layout** — Main dashboard with "My Trips" overview
- [ ] **Create itinerary form** — Destination picker, date range selector
- [ ] **Hotel search & results page** — Search filters, paginated result cards with availability
- [ ] **Tour search & results page** — Category/destination filters, result cards with time slots
- [ ] **Hotel detail page** — Room types, pricing, availability calendar, "Book" button
- [ ] **Tour detail page** — Description, time slots with remaining capacity, "Book" button
- [ ] **Unified itinerary timeline** — Chronological view of all bookings + activities with lifecycle status badges
- [ ] **Booking confirmation flow** — Summary → Confirm → Success with booking ID

---

## 🔷 Phase 5 — Hotel Admin Features
*Goal: Hotel admins can manage inventory, view bookings, and receive real-time alerts.*

### Backend
- [ ] **`GET /api/admin/hotel/bookings`** — List all bookings for admin's property, filterable by date/status/room type
- [ ] **`GET /api/admin/hotel/occupancy`** — Aggregate booking data into date-keyed occupancy percentages (next 60 days)
- [ ] **`GET /api/admin/hotel/alerts`** — Fetch unread alerts for this admin's UID
- [ ] **Room inventory management endpoints** — CRUD for rooms under a property
- [ ] **Mark alert as read** — `PATCH /api/admin/hotel/alerts/{id}`

### Frontend
- [ ] **Hotel admin dashboard** — Summary cards (total bookings, check-ins today, alerts count)
- [ ] **Bookings table** — Filterable, sortable table with status badges, guest names, dates
- [ ] **Occupancy heatmap** — 60-day CSS grid calendar, color-coded by occupancy %, date click drill-down
- [ ] **Real-time alert banner** — SSE-powered banner that appears when new alerts arrive
- [ ] **Room inventory management UI** — List/add/edit rooms with status toggles
- [ ] **Alert feed panel** — List of unread alerts with dismiss/mark-read action

---

## 🔷 Phase 6 — Tour Operator Features
*Goal: Tour operators can manage tours/slots, view bookings, and handle reschedules.*

### Backend
- [ ] **Tour CRUD endpoints** — Create/update/delete tours and time slots
- [ ] **`GET /api/operator/activities`** — All activity bookings for operator's tours
- [ ] **`GET /api/operator/alerts`** — Disruption alerts with reschedule prompts
- [ ] **`POST /api/operator/reschedule`** — Offer a reschedule slot → creates alert for traveler

### Frontend
- [ ] **Tour operator dashboard** — Summary cards (active tours, upcoming bookings, alerts)
- [ ] **Tour management page** — List tours, add/edit tour details, manage time slots and capacity
- [ ] **Activity bookings table** — All bookings with status, traveler info, dates
- [ ] **Reschedule offer UI** — For "Missed" activities: show available alternate slots, one-click send reschedule offer
- [ ] **Alert feed** — SSE-powered disruption alert list with action buttons

---

## 🔷 Phase 7 — Disruption Engine (Flagship Feature)
*Goal: One-click disruption reporting triggers atomic cascading updates + real-time SSE alerts to all stakeholders.*

### Backend
- [ ] **`PATCH /api/itineraries/{id}/disruption`** — Disruption report endpoint:
  - [ ] Validate disruption payload (type, original_time, new_time)
  - [ ] Firestore batch write: update itinerary status → update booking status → mark affected activities as MISSED
  - [ ] Write `disruption_events` document with full cascade record
  - [ ] Write `activity_log` entry with before/after snapshots
  - [ ] Create targeted `alerts` documents for hotel admin + tour operator
  - [ ] Publish disruption event to Redis pub/sub channel `disruptions`
- [ ] **SSE endpoint — `GET /api/events/stream`** — Flask streaming response subscribed to Redis pub/sub, pushes events to connected admin clients
- [ ] **Redis pub/sub integration** — Publish disruption events on `disruptions` channel, SSE handler subscribes and forwards

### Frontend
- [ ] **"Report Disruption" button** — On traveler itinerary timeline, opens disruption form (type, new time, notes)
- [ ] **Disruption confirmation panel** — After reporting, show traveler that hotel + tour operator were notified
- [ ] **SSE connection hook** — `useSSE` React hook that connects to `/api/events/stream`, parses events, dispatches to state
- [ ] **Hotel Admin: live alert rendering** — Banner + booking table row status update on disruption event
- [ ] **Tour Operator: live alert rendering** — Activity status change + reschedule offer card appears
- [ ] **Status badge transitions** — Visual lifecycle badges: Upcoming → Active → Disrupted → Missed → Rescheduled → Completed

---

## 🔷 Phase 8 — Platform Admin Dashboard
*Goal: Super admin has full visibility, analytics, audit log, and export capabilities.*

### Backend
- [ ] **`GET /api/platform/overview`** — Aggregated stats: total bookings, active trips, disruption count, total revenue
- [ ] **`GET /api/platform/disruptions`** — All disruption events with date/type/destination filters
- [ ] **`GET /api/platform/audit-log`** — Full audit log with pagination and filters (actor, action type, date range)
- [ ] **`GET /api/platform/export`** — Generate CSV or PDF from any filtered dataset
- [ ] **Rate limiting** — Configure `Flask-Limiter` with Redis backend (100 req/min public, 500 authenticated)

### Frontend
- [ ] **Platform admin dashboard** — Summary cards with key metrics (bookings, revenue, disruptions, active trips)
- [ ] **Live event feed** — Real-time SSE-powered timeline of all system events
- [ ] **Disruption analytics panel** — Bar/line charts (Recharts) showing disruption trends by type, destination, time
- [ ] **Audit log viewer** — Paginated, filterable table with actor, action, resource, timestamp, before/after diff
- [ ] **Export controls** — "Export as CSV" and "Export as PDF" buttons on filtered views
- [ ] **System filters** — Global date range, property, operator, disruption type filter bar

---

## 🔷 Phase 9 — Additional Unique Features
*Goal: Implement differentiating features that elevate the platform beyond a standard CRUD app.*

### AI-Powered Trip Preference Engine
- [ ] **Preference form UI** — Travel style, budget, group size, duration inputs
- [ ] **Backend scoring endpoint** — Query Firestore by category tags (`array_contains`), apply weighted scoring, return top-ranked itinerary suggestion
- [ ] **Suggested itinerary display** — Show pre-assembled itinerary from preference results, one-click "Accept & Book"

### Traveler Sentiment Tracker
- [ ] **Post-stay review prompt** — After booking status → Completed, show review form (star rating + text)
- [ ] **Review submission endpoint** — Write review doc to Firestore, auto-create "Attention Required" alert if rating < 3
- [ ] **Hotel Admin: low-rating alert** — Surface in the same alert feed as disruption alerts

### Smart Late Check-Out Request
- [ ] **Traveler: request late check-out button** — Writes `LATE_CHECKOUT_REQUEST` alert targeting hotel admin
- [ ] **Hotel Admin: approve/deny UI** — Action card in alert feed with one-click approve/deny
- [ ] **`PATCH /api/admin/hotel/late-checkout/{id}`** — Process approval/denial, update booking, notify traveler via SSE
- [ ] **Traveler: real-time decision display** — SSE-delivered approval/denial result on their dashboard

---

## 🔷 Phase 10 — Security, Performance & Observability Hardening
*Goal: Lock down the platform for demo-readiness and production soundness.*

- [ ] **Input validation** — Marshmallow/Pydantic schemas on EVERY endpoint (not just auth)
- [ ] **Rate limiting** — Verify Flask-Limiter is active on all public and authenticated routes
- [ ] **Firestore security rules** — Test and verify rules block cross-user data access
- [ ] **Redis caching** — Verify cache hit/miss on hotel and tour search endpoints, confirm 5-min TTL
- [ ] **Idempotency keys** — Implement on booking creation endpoints to prevent duplicate bookings on retry
- [ ] **Structured request logging** — Every Flask request logged as JSON: timestamp, method, path, status, response time, UID
- [ ] **CORS verification** — Confirm only `FRONTEND_ORIGIN` is allowed
- [ ] **Token storage** — Verify Firebase ID token is stored in-memory (not localStorage)

---

## 🔷 Phase 11 — UI/UX Polish & Responsive Design
*Goal: Make every screen look and feel demo-ready with a premium, modern design.*

- [ ] **Design system** — Finalize color palette, typography (Google Fonts), spacing scale in Tailwind config
- [ ] **Dark mode support** — Optional toggle, or default dark theme for admin dashboards
- [ ] **Responsive layouts** — All dashboards work on laptop + tablet screen sizes
- [ ] **Micro-animations** — Smooth transitions on status badge changes, alert arrivals, page transitions
- [ ] **Loading states** — Skeleton loaders on all data-fetching pages
- [ ] **Empty states** — Friendly illustrations/messages when lists are empty
- [ ] **Error states** — User-friendly error messages with retry actions
- [ ] **Toast notifications** — For booking confirmations, disruption reports, alert actions

---

## 🔷 Phase 12 — Deployment & Demo Preparation
*Goal: Ship to a live URL and rehearse the 8-minute demo script.*

### Deployment
- [ ] **Dockerize Flask backend** — Write `Dockerfile` with Gunicorn as WSGI server
- [ ] **Deploy backend** — Push to Render or Railway, set all env vars
- [ ] **Deploy frontend** — Build React app (`npm run build`), deploy to Vercel or Netlify
- [ ] **Redis Cloud** — Provision free-tier Redis Cloud instance, update `REDIS_URL`
- [ ] **Firebase production project** — Confirm Firestore indexes deployed, security rules published
- [ ] **End-to-end smoke test** — Full registration → booking → disruption → recovery flow on live URLs

### Demo Prep
- [ ] **Seed demo data** — Script to populate Firestore with sample hotels, tours, users, and itineraries
- [ ] **Three-window demo setup** — Test simultaneous Traveler + Hotel Admin + Tour Operator browser windows
- [ ] **Rehearse demo script** — Walk through all 5 scenes (Setup → Booking → Disruption → Recovery → Admin View) under 8 minutes
- [ ] **Backup plan** — Record a screen capture of the full demo flow as fallback

---

> **🏁 Total estimated items: ~120 tasks across 12 phases**  
> **Priority order:** Phase 1–3 (foundation) → Phase 4–7 (core features + flagship) → Phase 8–9 (admin + unique) → Phase 10–12 (polish + ship)
