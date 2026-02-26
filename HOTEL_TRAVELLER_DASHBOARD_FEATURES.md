# Hotel Admin and Traveller Dashboard Feature Suggestions

## Context from Current Backend
- Hotel Admin APIs already available:
  - `GET /api/admin/hotel/bookings`
  - `GET /api/admin/hotel/occupancy`
  - `GET /api/admin/hotel/alerts`
  - `PATCH /api/admin/hotel/alerts/<alert_id>`
  - `PATCH /api/admin/hotel/late-checkout/<booking_id>`
- Traveller APIs already available:
  - Itinerary: `GET/POST /api/itineraries`, `GET /api/itineraries/<id>`
  - Booking: `POST /api/bookings`
  - Activity booking: `POST /api/activities`
  - Search: `GET /api/search/hotels`, `GET /api/search/tours`
  - Disruption handling: `PATCH /api/itineraries/<id>/disruption`

## Hotel Admin Dashboard Features

### Must-Have (Can be built quickly using existing backend)
- Booking inbox with filters:
  - Show all bookings for the admin's property.
  - Filter by status (`CONFIRMED`, `LATE_ARRIVAL`, etc.).
- Occupancy heatmap and summary cards:
  - Daily occupancy % for next 60 days.
  - Cards: today occupancy, next 7 days avg, peak day.
- Alerts center:
  - Unread alerts list with mark-as-read action.
  - Alert grouping by type (`LATE_ARRIVAL`, late checkout requests).
- Late checkout decision panel:
  - Approve/deny from one-click action.
  - Show decision history for each booking.
- Guest ETA impact board:
  - Surface disruption-driven late arrivals from alerts.
  - Show expected new arrival time and impacted bookings.

### Good Next Features (Need moderate backend extension)
- Room inventory management:
  - Room type wise inventory, availability calendar, blackout dates.
- Dynamic pricing and rate plans:
  - Weekend/festival pricing, min-night constraints.
- Booking lifecycle actions:
  - Check-in/check-out status transitions.
  - Partial cancellation and no-show workflows.
- Guest communication module:
  - Pre-arrival messages, upsell offers, arrival instructions.
- Operational dashboard:
  - Housekeeping status, pending arrivals/departures, SLA alerts.

### Advanced Features
- Overbooking guardrails and auto-reallocation suggestions.
- Revenue analytics:
  - ADR, RevPAR, occupancy trend, channel split.
- Disruption automation:
  - Auto-send check-in window updates during delays.

## Traveller Dashboard Features

### Must-Have (Can be built quickly using existing backend)
- Smart trip timeline:
  - Unified itinerary view combining hotel bookings + activities.
- Hotel and tour discovery with filters:
  - Destination, price range, rating, category.
- One-click booking flow:
  - Book hotel into selected itinerary.
  - Book activity/tour into itinerary.
- Disruption reporting assistant:
  - Report delay/cancellation quickly.
  - Show what got auto-updated (bookings and activities).
- Alerts and actions panel:
  - Late checkout decision updates.
  - Suggested alternatives for missed activities.

### Good Next Features (Need moderate backend extension)
- Booking management:
  - Modify dates, cancel booking, request refund.
- Late checkout request from traveller side:
  - Submit request and track approval state.
- In-trip support center:
  - Contact hotel, operator, and platform support.
- Cost and budget tracker:
  - Total trip spend, category-wise breakdown.
- Saved searches and price watch alerts.

### Advanced Features
- AI replan flow during disruptions:
  - Suggest new hotel/activity combinations based on new arrival time.
- Personalized recommendations:
  - Interests-based hotels/activities and seasonal plans.
- Loyalty and rewards layer:
  - Points, badges, and redemption options.

## Suggested Implementation Order
- Phase 1:
  - Hotel: bookings, occupancy, alerts, late checkout decision UI.
  - Traveller: itinerary timeline, search + booking, disruption report UX.
- Phase 2:
  - Hotel: inventory + check-in/check-out lifecycle.
  - Traveller: booking edits/cancellations + late checkout request.
- Phase 3:
  - Analytics, AI replanning, personalization.
