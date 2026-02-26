# Product Requirements Document
## Intelligent End-to-End Travel Planning & Hospitality Management Platform

**Version:** 1.0  
**Type:** Hackathon MVP  
**Last Updated:** February 2026  
**Status:** Draft


---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [User Personas](#4-user-personas)
5. [System Architecture Overview](#5-system-architecture-overview)
6. [Core Features](#6-core-features)
7. [Unique Differentiator Feature — Automated Disruption Sync](#7-unique-differentiator-feature--automated-disruption-sync)
8. [Additional Unique Features](#8-additional-unique-features)
9. [Role-Based Access Control](#9-role-based-control)
10. [Data Model Overview](#10-data-model-overview)
11. [API Contract Summary](#11-api-contract-summary)
12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [Deployment Architecture](#13-deployment-architecture)
14. [Demo Script](#14-demo-script)
15. [Evaluation Criteria Mapping](#15-evaluation-criteria-mapping)
16. [Out of Scope for MVP](#16-out-of-scope-for-mvp)

---

## 1. Executive Summary

Tourism and Hospitality ecosystems are broken at the seams. A traveler books a flight on one platform, a hotel on another, and a city tour through a third. None of these systems talk to each other. When reality changes — a delayed flight, a cancelled activity, an early check-out — the traveler becomes the human middleware, making phone calls and sending emails to manually sync every party involved.

This platform eliminates that problem. It is a unified, full-stack, cloud-ready system where travelers, hotel operators, tour operators, and platform admins all operate inside the same ecosystem. Changes in one part of the system automatically cascade to every dependent party in real time.

The platform is designed to be demo-ready for a hackathon while being architecturally sound enough for real-world adoption at scale.

---

## 2. Problem Statement

### Current Pain Points

**For Travelers:**
- Fragmented booking journeys across multiple disconnected platforms
- No unified view of their full itinerary (flights, hotels, activities)
- Must manually communicate disruptions to every service provider
- No proactive alerts or recovery options when plans change

**For Hotel Admins:**
- No real-time visibility into late arrivals or early check-outs
- Manual coordination with front desk and night auditor teams
- Operational dashboards are either absent or disconnected from live booking data
- No system-generated audit trail for accountability

**For Tour Operators:**
- Blind to traveler schedule changes until it is too late
- Revenue lost from missed tours that could have been rescheduled
- No automated way to offer alternatives or recover a disrupted booking

**For Platform Admins:**
- No single pane of glass to monitor the health of the entire ecosystem
- No exportable reporting for business and operational review
- Inability to detect and act on patterns like overbooking or demand spikes

---

## 3. Goals & Success Metrics

### Primary Goals
- Deliver a unified platform that connects all four stakeholder roles
- Demonstrate real-time cross-silo state synchronization
- Meet all functional and technical requirements from the problem statement
- Win the hackathon by showing real-world architectural thinking

### Success Metrics

| Metric | Target |
|---|---|
| Booking lifecycle stages covered | 6 (Search → Book → Confirm → Active → Disrupted → Completed) |
| Roles supported | 4 (Traveler, Hotel Admin, Tour Operator, Platform Admin) |
| Time to propagate a disruption event across all dashboards | Under 5 seconds |
| API endpoints documented with request/response examples | 100% |
| Core business paths covered by tests | At least 5 |
| Exportable report formats | CSV and PDF |

---

## 4. User Personas

### Persona 1 — Aanya (The Traveler)
- 28 years old, frequent leisure traveler
- Books trips across multiple platforms today and finds it stressful to manage
- Wants one place to see her full itinerary and wants to be reassured that if something goes wrong, the right people already know

### Persona 2 — Rajan (The Hotel Admin)
- Front desk manager at a mid-size hotel
- Currently receives late arrival notifications via WhatsApp from a shared group
- Wants a proper dashboard with real-time alerts so the night auditor is always prepared

### Persona 3 — Meera (The Tour Operator)
- Runs day tours and city experiences
- Loses significant revenue when travelers miss tours without warning
- Wants automatic notifications and the ability to offer reschedule slots without manual back-and-forth

### Persona 4 — Dev (The Platform Admin)
- Oversees the entire platform ecosystem
- Needs visibility into all bookings, all disruptions, revenue trends, and system health
- Regularly exports reports for management review

---

## 5. System Architecture Overview

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) + TailwindCSS |
| Backend | Python / Flask |
| Database | Firebase Firestore (NoSQL document store) |
| Authentication | Firebase Authentication + Custom JWT claims |
| Caching | Redis |
| Real-Time Delivery | Server-Sent Events (SSE) over Flask |
| Deployment | Docker + Render / Railway (frontend via Vercel or Netlify) |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│              React Frontend (Vite + Tailwind)        │
│   Traveler UI | Hotel Admin | Tour Op | Super Admin  │
└────────────────────────┬────────────────────────────┘
                         │ REST API + SSE
┌────────────────────────▼────────────────────────────┐
│                   Flask Backend                      │
│   Auth Blueprint | Booking Blueprint                 │
│   Disruption Engine | Notification Service           │
│   Reporting Blueprint                                │
└──────────────┬─────────────────┬───────────────────┘
               │                 │
    ┌──────────▼──────┐   ┌──────▼──────────────┐
    │    Firebase     │   │       Redis          │
    │  Firestore (DB) │   │  Cache + SSE Pub/Sub │
    │  Firebase Auth  │   │                      │
    └─────────────────┘   └──────────────────────┘
```

### Key Architectural Decisions

**React (Vite) Frontend** is structured into four role-specific dashboard views. React Router handles role-based route protection on the client side. Axios is used for API calls with an interceptor that attaches the Firebase ID token to every request header automatically.

**Flask Backend** is organised into Blueprints, one per domain (auth, bookings, disruptions, admin, reporting). This mirrors the modular service pattern required by the problem statement without the overhead of true microservices. Flask's built-in streaming support handles SSE delivery natively.

**Firebase Firestore** serves as the primary datastore. As a NoSQL document database, data is organised into collections and documents rather than tables and rows. Relationships between entities (e.g., an itinerary and its bookings) are handled via document references and denormalized fields. Firestore's composite indexes are configured in `firestore.indexes.json` to support the filtered queries required by admin dashboards.

**Firebase Authentication** handles user identity — registration, login, password reset, and session management. When a user logs in, Firebase issues a signed ID token (a standard JWT). The Flask backend verifies this token on every protected request using the Firebase Admin SDK. Custom claims (the user's role: TRAVELER, HOTEL_ADMIN, TOUR_OPERATOR, PLATFORM_ADMIN) are written to the token at registration time, enabling RBAC at the API layer without an additional database lookup.

**Redis** serves two purposes: caching high-read-volume data such as hotel listings and tour availability (with a 5-minute TTL), and acting as the pub/sub backbone for the Disruption Engine. When a disruption event fires, the Flask backend publishes it to a Redis channel. The SSE stream handler subscribes to that channel and pushes the event down to all connected admin clients in real time.

**Server-Sent Events (SSE)** provide the real-time connection from Flask to the React admin dashboards. Admin clients open a persistent GET connection to `/api/events/stream` on page load. The Flask SSE endpoint subscribes to Redis and forwards any incoming disruption messages down the stream. This is one-directional (server to client), which is all that is needed for alert delivery.

---

## 6. Core Features

### 6.1 Authentication & Authorization

Authentication is handled by **Firebase Authentication**. Users register and log in through Firebase's client SDK on the React frontend. On successful login, Firebase issues a signed ID token — a standard JWT — which the React app stores in memory (not localStorage, to prevent XSS exposure) and attaches to every API request via an Axios interceptor.

At registration time, a Flask endpoint calls the Firebase Admin SDK to write a **custom claim** onto the user's token, embedding their role (TRAVELER, HOTEL_ADMIN, TOUR_OPERATOR, PLATFORM_ADMIN). Every protected Flask route uses a decorator that calls `firebase_admin.auth.verify_id_token()` to validate the token and extract the role claim. No database lookup is required to determine permissions — the role lives in the verified token itself.

On the React side, React Router's protected route wrappers read the decoded token's role claim to determine which dashboard to render and which navigation options to show. A user with a HOTEL_ADMIN role cannot navigate to or load traveler itinerary routes — the guard redirects them before any API call is made.

Firebase handles token refresh automatically on the client side. ID tokens expire after 1 hour and are silently refreshed by the Firebase SDK.

### 6.2 Itinerary Builder (Traveler)

A traveler can create a trip by setting a destination and travel dates. The system then allows them to:
- Search and book hotels from the available inventory
- Browse and book tours and activities linked to that destination
- View their full trip on a unified timeline that shows all bookings in chronological order

Each element of the itinerary carries a **lifecycle status** — Upcoming, Active, Disrupted, Missed, Completed. These statuses transition automatically based on system events or manual triggers.

### 6.3 Hotel & Inventory Management (Hotel Admin)

Hotel admins manage their property's room inventory, set pricing, and view all reservations in a table with filtering by date, status, and room type. They receive real-time alerts for:
- New bookings
- Cancellations
- Late arrivals (triggered by the Disruption Engine)
- Upcoming check-ins in the next 24 hours

### 6.4 Tour & Activity Management (Tour Operator)

Tour operators list their experiences with available time slots and capacity limits. The system automatically manages slot availability as bookings come in. When a disruption event marks a booking as "Missed," the operator's dashboard surfaces a reschedule prompt for that traveler.

### 6.5 Operational Dashboard (Platform Admin)

The super admin sees a bird's-eye view of the entire platform:
- Total bookings, active trips, disruptions, and revenue — all in summary cards
- A live feed of system events with timestamps
- Filters by date range, property, operator, or disruption type
- The ability to export any filtered view as CSV or PDF

### 6.6 Audit Log

Every significant action — a booking created, a status changed, a disruption triggered, an alert sent — writes a structured entry to the ActivityLog table. The log captures the actor (user ID and role), the action type, the affected resource, and a before/after state snapshot. This log is viewable by admins and exportable for compliance review.

### 6.7 Search & Discovery

Travelers can search for hotels and tours with filters for destination, price range, rating, and dates. Results are paginated, and the backend serves them from a Redis cache for performance on high-volume reads. Hotel and tour detail pages provide drill-down views with availability calendars.

---

## 7. Unique Differentiator Feature — Automated Disruption Sync

### 7.1 Overview

This is the flagship feature that separates this platform from a standard booking CRUD app. It is a real-time, cross-stakeholder state synchronization engine. When a single disruption event is reported, the system automatically identifies every downstream dependency and pushes targeted, role-appropriate alerts to each party simultaneously — with no manual coordination required.

### 7.2 The Problem It Solves

When a traveler's flight is delayed by 9 hours, today's reality is:
1. Traveler calls the hotel to explain late arrival
2. Traveler messages the tour operator to cancel the afternoon tour
3. Hotel staff writes a sticky note on the reservation
4. Tour operator manually removes the traveler from the slot

This platform collapses all of that into a single action.

### 7.3 User Flow

**Step 1 — Traveler Reports Delay**

On the traveler's itinerary timeline, there is a "Report Disruption" button next to each travel segment. The traveler selects "Flight Delayed" and inputs the new estimated arrival time. This is submitted to the backend.

**Step 2 — Backend Disruption Engine Activates**

The Flask backend receives the PATCH request and verifies the Firebase ID token. Once authenticated, the Disruption Engine executes the following sequence using a **Firestore batch write** — all document updates are committed atomically so that a partial failure does not leave the system in an inconsistent state:

- Updates the Itinerary document's status field from `ON_TRACK` to `DISRUPTED` and sets the new arrival time
- Queries the `bookings` subcollection on the Itinerary document and updates the relevant booking's status to `LATE_ARRIVAL`
- Queries the `activities` subcollection and marks any activity whose `scheduled_time` falls before the new arrival as `MISSED — PENDING_RESCHEDULE`
- Writes an entry to the top-level `activity_log` collection with the actor's UID, the action type, and a before/after snapshot of every document that changed
- Publishes a disruption event payload to a Redis pub/sub channel named `disruptions`

The batch write is submitted to Firestore in one network round-trip. If it fails, no documents are changed and an error is returned to the client.

**Step 3 — Real-Time Alert Delivery via SSE**

Admin dashboards maintain an open Server-Sent Events connection to the backend. When the disruption event is published to Redis, the backend pushes it down the SSE stream to all connected and relevant admin clients immediately.

**Step 4 — Role-Specific Alert Rendering**

Each dashboard receives the same event payload but renders a different alert:

- **Hotel Admin Dashboard:** A banner alert appears — "Guest [Name] delayed. New arrival: 11:00 PM. Action: Notify night auditor. Hold reservation." The reservation row in the bookings table also updates its status badge from "Expected" to "Late Arrival."

- **Tour Operator Dashboard:** The activity row for the affected booking changes to an amber "Missed" status. A "Reschedule Offer" card appears with available alternative time slots. The operator can send an automated reschedule invite to the traveler in one click.

- **Traveler Dashboard:** A confirmation panel appears on their itinerary — "Your hotel has been notified. Your city tour is ready to be rescheduled." This is the emotional resolution — the traveler knows the system handled it.

### 7.4 Lifecycle State Transition Diagram

```
Itinerary Status Flow:

  [Draft] → [Confirmed] → [On Track] → [Disrupted] → [Recovering] → [Completed]
                                              ↓
                                         [Missed] (for individual activities)
```

Every arrow in this diagram represents a state transition that is logged, timestamped, and auditable.

### 7.5 Why This Feature Wins the Hackathon

- It directly and visibly solves the "data silos" problem stated in the brief
- It demonstrates lifecycle state transitions, operational alerts, audit logging, and real-time architecture all in one feature
- The three-browser-window demo — one click, three simultaneous UI updates — is visually undeniable
- It shows judges that the team understands enterprise travel tech, not just CRUD apps

---

## 8. Additional Unique Features

### 8.1 AI-Powered Trip Preference Engine

**What it does:** Instead of blank search boxes, the traveler fills out a lightweight preference form — travel style (adventure, relaxation, culture), budget range, group size, and trip duration. The system generates a personalized itinerary suggestion with pre-selected hotels and activities that match the profile.

**Why it's unique:** Most booking platforms are search-first. This is intent-first. The traveler describes what they want to experience, and the platform does the assembly.

**How to implement:** The preference form submits to a Flask endpoint that runs a scoring algorithm against hotel and tour documents fetched from Firestore. Tours and hotels carry an array field of category tags (e.g., `["adventure", "budget", "family"]`). Firestore's `array_contains` query operator filters documents by matching tags, and the Flask backend applies a weighted scoring function to rank the results. The top-scoring combination is returned as a suggested itinerary. No external AI API is needed — a well-designed scoring function is sufficient for the MVP and is faster and more reliable in a demo environment.

### 8.2 Occupancy Heatmap for Hotel Admins

**What it does:** Hotel admins see a calendar-style heatmap showing their room occupancy density for the next 60 days. High-occupancy dates appear in deep color, low-occupancy dates in light color. Clicking a date opens a drill-down showing which rooms are booked and which are available.

**Why it's unique:** Most hotel admin tools show tables. A visual heatmap gives immediate operational intelligence at a glance — admins can spot gaps, identify peak periods, and make pricing decisions without running a query.

**How to implement:** A Flask endpoint queries Firestore for all booking documents under a given property where `check_in_date` and `check_out_date` overlap the next 60 days. The results are aggregated in Python into a date-keyed dictionary of occupancy percentages and returned to the frontend. The React component renders the heatmap as a CSS grid where each cell's background color intensity is calculated from the occupancy percentage. No charting library is required.

### 8.3 Traveler Sentiment Tracker (Post-Stay Reviews with Admin Intelligence)

**What it does:** After a stay or tour is marked Completed, the traveler receives a prompt to rate their experience. Reviews are stored and displayed publicly. But on the admin side, any review below a 3-star rating automatically surfaces as an "Attention Required" flag on the Hotel Admin dashboard with the specific review text highlighted.

**Why it's unique:** It closes the feedback loop within the platform and gives admins an early warning system for service quality issues. Most hackathon projects build reviews as a display feature — this makes reviews operational.

**How to implement:** The review submission Flask endpoint checks the rating value before writing the review document to Firestore. If the rating falls below the threshold, it simultaneously writes an alert document to the `alerts` collection with the `target_uid` set to the property's admin UID. The hotel admin dashboard's alert query picks this up in the same feed as disruption alerts, with no separate polling required.

### 8.4 Disruption Analytics Panel (Platform Admin)

**What it does:** A dedicated analytics section for the platform admin showing disruption trends over time — how many disruptions occurred this month, what types were most common (flight delays vs cancellations), which destinations had the highest disruption rates, and average recovery time (time from disruption reported to reschedule accepted).

**Why it's unique:** It turns raw operational events into business intelligence. It demonstrates that the platform is not just reactive but capable of identifying systemic patterns.

**How to implement:** All disruption records are already written to the `disruption_events` Firestore collection with timestamps, types, and destination fields. The analytics Flask endpoint queries this collection with date range filters and groups results by type and destination in Python before returning the aggregated data. The React frontend renders the output as simple bar and line charts using a lightweight library like Recharts.

### 8.5 Smart Late Check-Out Request Flow

**What it does:** A traveler can request a late check-out directly from their itinerary dashboard. The request appears on the Hotel Admin's dashboard as a pending action card. The admin can approve or deny it in one click, and the traveler's dashboard updates in real time with the decision.

**Why it's unique:** It is a miniature version of the Disruption Sync applied to a common hospitality workflow. It showcases that the SSE infrastructure can power multiple real-time interaction types, not just disruption alerts, demonstrating architectural versatility.

**How to implement:** This reuses the same SSE delivery mechanism and `alerts` Firestore collection built for the Disruption Sync. A new `LATE_CHECKOUT_REQUEST` alert type is added. The traveler's request writes an alert document targeting the hotel admin's UID. The admin's approval or denial writes back to the traveler's alerts and updates the booking document's status. The SSE stream delivers both events in real time, requiring no new infrastructure — only two new Flask route handlers and two new React UI components.

---

## 9. Role-Based Access Control

| Feature / Endpoint | Traveler | Hotel Admin | Tour Operator | Platform Admin |
|---|---|---|---|---|
| View & build personal itinerary | ✅ | ❌ | ❌ | ✅ |
| Report disruption | ✅ | ❌ | ❌ | ✅ |
| View hotel bookings & alerts | ❌ | ✅ | ❌ | ✅ |
| Manage room inventory | ❌ | ✅ | ❌ | ✅ |
| View tour bookings & alerts | ❌ | ❌ | ✅ | ✅ |
| Offer reschedule slots | ❌ | ❌ | ✅ | ✅ |
| View all platform data | ❌ | ❌ | ❌ | ✅ |
| Export reports | ❌ | ✅ (own) | ✅ (own) | ✅ (all) |
| View audit log | ❌ | ✅ (own) | ✅ (own) | ✅ (all) |
| Approve late check-out | ❌ | ✅ | ❌ | ✅ |

---

## 10. Data Model Overview

Because Firebase Firestore is a NoSQL document database, data is structured as **collections of documents** rather than relational tables. There are no JOINs. Related data is either stored as subcollections, document references, or selectively denormalized (duplicated) on the document that needs it for fast reads. The trade-off is slightly more storage in exchange for significantly faster, index-friendly queries.

### Collection Structure

**`users` collection**
Each document represents one account. Stores the user's display name, email, role (mirrored from the Firebase custom claim for Firestore query purposes), and any profile metadata such as a linked property ID for hotel admins or a linked operator ID for tour operators. The document ID is the Firebase UID, so no secondary lookup is ever needed to find a user.

**`itineraries` collection**
Each document belongs to one traveler (referenced by Firebase UID). Stores the destination, travel dates, and the top-level lifecycle status. Two subcollections hang off each itinerary document:
- `bookings` subcollection — holds all hotel reservation documents for this itinerary
- `activities` subcollection — holds all tour/activity booking documents for this itinerary

This structure means a single query for an itinerary and its contents requires only two additional subcollection fetches, not a JOIN across multiple tables.

**`properties` collection**
Each document is a hotel property managed by one Hotel Admin user. Stores property name, location, room type inventory counts, and the admin's Firebase UID. A `rooms` subcollection holds individual room records with their current status (AVAILABLE, OCCUPIED, MAINTENANCE).

**`tours` collection**
Each document is a tour or experience managed by one Tour Operator. Stores the tour name, description, duration, category tags (used by the preference engine), and a `time_slots` subcollection where each slot document holds the scheduled time, capacity, and current booked count.

**`disruption_events` collection**
A top-level collection where each document records one disruption occurrence. Stores the triggering itinerary ID, disruption type, original and new values, timestamp, and an array of the cascaded update references it produced. This powers the disruption analytics panel for platform admins.

**`activity_log` collection**
The audit trail. Each document is an immutable log entry storing the actor UID, actor role, action type (e.g., `ITINERARY_DISRUPTED`, `BOOKING_STATUS_CHANGED`, `ACTIVITY_MISSED`), the affected document path, a timestamp, and a `changes` map holding before and after values. Documents are never updated or deleted — only appended.

**`alerts` collection**
Each document is a targeted alert for a specific admin user. Stores the target user's UID, the alert type, message content, the source disruption event ID, and a `read` boolean. The admin dashboards query this collection filtered by `target_uid == current_user.uid AND read == false` to show their unread alert feed.

### Firestore Indexing Strategy

Firestore automatically indexes every single field. Composite indexes — required for queries that filter and sort on multiple fields simultaneously — must be declared explicitly in `firestore.indexes.json`. The following composite indexes are required for this platform:

- `alerts`: `target_uid ASC, read ASC, created_at DESC` — for the admin unread alert feed
- `activity_log`: `resource_id ASC, created_at DESC` — for the drill-down audit view on a specific booking or itinerary
- `disruption_events`: `destination ASC, created_at DESC` — for the disruption analytics panel filtered by destination
- `itineraries` (subcollection `activities`): `scheduled_time ASC, status ASC` — for the disruption cascade query that finds activities affected by the new arrival time

### Data Denormalization Decisions

In Firestore, it is common and recommended to duplicate certain fields across documents to avoid multi-collection reads. This platform denormalizes the following:

- The traveler's display name is stored on their `bookings` documents so the Hotel Admin dashboard can display guest names without a separate `users` lookup
- The property name is stored on `bookings` documents so the traveler's itinerary timeline can display it without fetching the full property document
- The tour name is stored on `activities` documents for the same reason

---

## 11. API Contract Summary

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user with role |
| POST | `/api/auth/login` | Authenticate and receive JWT |
| POST | `/api/auth/refresh` | Refresh an expiring token |

### Itineraries & Bookings

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/itineraries` | Get all itineraries for the logged-in traveler |
| POST | `/api/itineraries` | Create a new itinerary |
| GET | `/api/itineraries/{id}` | Get full itinerary with all linked bookings and activities |
| PATCH | `/api/itineraries/{id}/disruption` | Report a disruption — triggers the Disruption Engine |
| POST | `/api/bookings` | Create a hotel booking linked to an itinerary |
| POST | `/api/activities` | Add an activity booking to an itinerary |

### Hotel Admin

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/hotel/bookings` | List all bookings for the admin's property with filters |
| GET | `/api/admin/hotel/occupancy` | Occupancy data aggregated by date (powers the heatmap) |
| GET | `/api/admin/hotel/alerts` | All pending alerts for this property |
| PATCH | `/api/admin/hotel/late-checkout/{id}` | Approve or deny a late check-out request |

### Tour Operator

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/operator/activities` | All activity bookings for the operator's tours |
| GET | `/api/operator/alerts` | Pending disruption alerts with reschedule prompts |
| POST | `/api/operator/reschedule` | Offer a reschedule slot to a disrupted traveler |

### Platform Admin

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/platform/overview` | Aggregated summary stats — bookings, revenue, disruptions |
| GET | `/api/platform/disruptions` | All disruption events with filters |
| GET | `/api/platform/audit-log` | Full audit log with filters and pagination |
| GET | `/api/platform/export` | Export any filtered dataset as CSV or PDF |

### Real-Time

| Type | Endpoint | Description |
|---|---|---|
| SSE | `/api/events/stream` | Admin clients connect here to receive live alerts |
| GET | `/api/health` | Health check endpoint for observability |

### Example: Disruption Report Request

```
PATCH /api/itineraries/ITN-4821/disruption

Request Body:
{
  "disruption_type": "FLIGHT_DELAY",
  "affected_segment": "inbound_flight",
  "original_time": "2026-03-15T14:00:00Z",
  "new_time": "2026-03-15T23:00:00Z",
  "notes": "Flight delayed due to weather"
}

Response:
{
  "itinerary_id": "ITN-4821",
  "status": "DISRUPTED",
  "cascaded_updates": [
    {
      "type": "BOOKING",
      "id": "BKG-991",
      "new_status": "LATE_ARRIVAL",
      "alert_sent_to": "hotel_admin_user_id_77"
    },
    {
      "type": "ACTIVITY",
      "id": "ACT-334",
      "new_status": "MISSED",
      "reschedule_prompt_sent_to": "tour_operator_user_id_12"
    }
  ],
  "audit_log_id": "LOG-20240315-882"
}
```

---

## 12. Non-Functional Requirements

### Security
- **Authentication** is delegated entirely to Firebase Auth. Flask never handles raw passwords — it only verifies Firebase-issued tokens using the Admin SDK's `verify_id_token()` function
- **Role enforcement** is done via Firebase custom claims verified server-side on every protected Flask route through a shared `@require_role` decorator
- **Input validation** is enforced on all Flask endpoints using a schema validation library (Marshmallow or Pydantic) before any data is written to Firestore — no raw user input reaches the database
- **Rate limiting** is applied using `Flask-Limiter` with Redis as the storage backend — 100 requests per minute per IP for public endpoints, 500 for authenticated users
- **Firestore Security Rules** provide a second layer of defence. Even if the Flask backend is bypassed, Firestore rules ensure users can only read and write documents they own. For example, a traveler's token cannot read another traveler's itinerary collection
- **Secrets management** — Firebase service account credentials, Redis URL, and any other secrets are loaded exclusively from environment variables. A `.env.example` file documents the required keys without values. No secrets are committed to version control
- **HTTPS** is enforced on all deployed environments

### Performance
- All list endpoints (bookings, alerts, tours, activity log) are paginated. Firestore cursor-based pagination (`start_after`) is used rather than offset pagination, which degrades at scale
- Default page size is 20 documents; maximum is 100
- Hotel availability and tour listing endpoints are served from **Redis cache** with a 5-minute TTL. The cache key includes the destination and date range. Cache is invalidated when a new booking is created or slot capacity changes
- The Disruption Engine uses a **Firestore batch write** to commit all cascaded document updates in a single atomic round-trip rather than sequential individual writes
- The Flask SSE endpoint subscribes to a Redis pub/sub channel. This means the SSE stream itself is non-blocking — Flask runs the SSE handler using a generator, keeping the connection open without holding a thread per client

### Observability
- Every Flask request is logged as a structured JSON entry via Python's `logging` module, capturing: timestamp, HTTP method, path, status code, response time in milliseconds, and the Firebase UID of the authenticated user
- The `/api/health` endpoint checks and reports the status of all dependencies — Firestore reachability (via a test document read), Redis ping, and Flask application status — returning a structured JSON response
- Error responses from the Flask API follow a consistent envelope: `{ "error": "DESCRIPTIVE_CODE", "message": "human readable explanation", "request_id": "uuid" }`

### Reliability
- The Disruption Engine uses a **Firestore batch write** for the cascade update. If the batch fails, Firestore rolls back all changes atomically — no partial state is ever written
- Booking creation endpoints support an **idempotency key** passed in the request header. The key is stored in Redis with a short TTL. If the same key is received twice (e.g., on network retry), the second request returns the original response without creating a duplicate booking
- Firestore's built-in replication and Firebase Auth's managed infrastructure remove the need for the team to manage database backups or auth service uptime during the hackathon

---

## 13. Deployment Architecture

### Environments

- **Local Development:** Flask dev server + Vite dev server running concurrently. A local Redis instance runs in Docker. Firestore and Firebase Auth connect to the live Firebase project (or the Firebase Emulator Suite for fully offline development)
- **Staging:** Flask backend deployed to Render or Railway. React frontend deployed to Vercel or Netlify. Redis hosted on Redis Cloud free tier. Firebase project separate from production
- **Production / Demo:** Same services as staging, promoted via environment variable swap. Firebase project is the production project

### Component Deployment

- **React Frontend** is built to static assets (`npm run build`) and deployed to Vercel or Netlify. These platforms provide a CDN, HTTPS, and continuous deployment from the main branch automatically
- **Flask Backend** is containerised with Docker and deployed to Render or Railway as a web service. The `Dockerfile` defines the Python environment and starts the Flask app with Gunicorn as the production WSGI server
- **Firebase Firestore + Firebase Auth** are fully managed by Google. No infrastructure to provision or maintain. The Flask backend connects via the Firebase Admin SDK using a service account key loaded from an environment variable
- **Redis** is hosted on Redis Cloud (free tier is sufficient for hackathon load) or as a Docker container in the same environment as the Flask backend. The connection URL is passed via environment variable

### Environment Variable Management

All configuration is environment-variable driven. The following variables must be set in each environment and are documented (without values) in `.env.example`:

- `FIREBASE_SERVICE_ACCOUNT_JSON` — Base64-encoded Firebase Admin SDK service account credentials
- `REDIS_URL` — Full Redis connection string
- `FLASK_ENV` — `development` or `production`
- `FRONTEND_ORIGIN` — The React app's URL, used for CORS configuration on Flask
- `JWT_AUDIENCE` — The Firebase project ID, used for token verification

### CORS Configuration

Flask is configured with `Flask-CORS` to accept requests only from the known frontend origin. The allowed origin is read from the `FRONTEND_ORIGIN` environment variable so it differs correctly between local, staging, and production without code changes.

---

## 14. Demo Script

This is the story you tell judges during the live demonstration. It should take approximately 8 minutes.

**Scene 1 — The Setup (1 minute)**
Show the platform admin dashboard. Point out the summary cards — total bookings, active trips, disruption rate. Explain that this is the single pane of glass for the whole ecosystem.

**Scene 2 — The Traveler Books a Trip (2 minutes)**
Log in as Aanya the traveler. Use the preference form to generate a suggested itinerary. Show the unified timeline that assembles her hotel booking and city tour in chronological order. Highlight that everything is on one screen.

**Scene 3 — The Disruption (3 minutes)**
This is the centrepiece. With three browser windows open side by side — Traveler, Hotel Admin, Tour Operator — click "Report Flight Delay" on the traveler screen and update the arrival to 11 PM.

Watch the judges' faces as both admin screens update simultaneously. Walk through what each dashboard now shows: the hotel admin has a late arrival alert with the action recommendation, the tour operator has the "Missed" status and a reschedule offer ready to send. Return to the traveler screen and show them the confirmation that both parties were automatically notified.

Narrate: "No phone calls. No WhatsApp groups. One action, three stakeholders synchronized in under 5 seconds."

**Scene 4 — The Recovery (1 minute)**
The tour operator clicks "Send Reschedule Offer." The traveler receives the alternative slot. They accept. The activity status updates from "Missed" to "Rescheduled." The audit log entry for the entire lifecycle is shown.

**Scene 5 — The Admin View (1 minute)**
Switch to the platform admin. Show the disruption analytics panel. Show the occupancy heatmap on the hotel admin view. Export a report as CSV. Point out the audit log with every state transition timestamped.

---

## 15. Evaluation Criteria Mapping

| Evaluation Criterion | How This Platform Addresses It |
|---|---|
| Functional completeness | All four roles implemented, full booking lifecycle, disruption engine, audit log, export |
| System scalability | Redis caching with TTL, Firestore cursor pagination, stateless JWT via Firebase, CDN-served frontend |
| Security posture | Firebase Auth token verification on every request, Firestore Security Rules as second layer, input validation via Marshmallow, rate limiting via Flask-Limiter + Redis |
| UX clarity | Role-specific dashboards, real-time SSE alerts, visual heatmap, unified traveler timeline |
| Real-world adoption | Firebase + Flask are production-proven at scale; architecture is extensible to microservices; demo-able to non-technical stakeholders |

---

## 16. Out of Scope for MVP

The following features are intentionally excluded from the MVP to maintain a focused, completable scope for the hackathon. They are documented here as the roadmap for post-hackathon development.

- Real flight API integration (Amadeus, Skyscanner) — disruption is manually triggered in MVP
- Payment processing via payment gateway — bookings are confirmed without real transactions
- Native mobile application — web-responsive only
- Multi-language and multi-currency support
- Third-party calendar sync (Google Calendar, iCal)
- Machine learning-based demand forecasting
- Full microservices separation — MVP uses modular monolith

---

*This PRD was written for a hackathon submission. All architectural decisions prioritize demonstrability, correctness, and real-world soundness within a time-constrained build.*

---

## 17. External Hotel API Integration (Planned Enhancement)

**Goal:** Replace static/seeded hotel data with real hotel listings from an external API while keeping the booking lifecycle, admin dashboard, and disruption engine unchanged.

### Approach: Hybrid Model
- **Search/Discovery** → Calls RapidAPI (Booking.com unofficial API) or Amadeus Hotel Search API
- **Booking/Management** → Stored entirely in Firestore, managed by hotel admins on TripAllied
- **Fallback** → If API is unavailable, gracefully degrades to Firestore-seeded data

### API Options Evaluated
| API | Free Tier | Coverage |
|---|---|---|
| RapidAPI Booking.com | 500 req/mo | Full Booking.com inventory with photos, reviews, pricing |
| Amadeus Hotel Search | 500 calls/mo (test) | 150K+ hotels via GDS |
| Makcorps | Limited free | Price comparison across OTAs |

### Implementation Scope
- New backend service: `services/hotel_api_service.py` (API client + Redis cache)
- Update `GET /api/search/hotels` to call external API with Redis caching (15-min TTL)
- Store external hotel ID in booking documents for reference
- **Zero frontend changes required** — existing hotel cards already display all needed fields
