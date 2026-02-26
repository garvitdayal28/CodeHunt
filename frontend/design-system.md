# Design Document
## Intelligent Travel Planning & Hospitality Management Platform
### Visual Identity, UI System & Content Guide

**Version:** 1.0  
**Reference Platforms:** Expedia, MakeMyTrip  
**Target:** Hackathon MVP — demo-ready, production-quality aesthetics

---

## 1. Design Philosophy — "Confident Clarity"

The platform is **mission control for your journey** — combining the trustworthiness of Expedia's structured layouts with MakeMyTrip's warmth and energy, elevated with an editorial, intelligent sensibility.

- **High information density done right.** White space is used deliberately, not generously.
- **Colour carries meaning.** Green = all clear, Amber = attention needed, Red = act now.
- **Elevation through typography.** Distinctive editorial display font for headings.
- **The disruption moment is designed as a feature.**

### Brand Identity
- **Name:** CodeHunt Trips
- **Tagline:** "Your journey, fully in sync."
- **Admin tagline:** "Every stakeholder. One signal."
- **Voice:** Reassuring for travellers, direct for admins, intelligent overall.

---

## 2. Colour System

### Primary Palette

| Token | Name | Hex | Usage |
|---|---|---|---|
| `--color-primary` | Deep Navy | `#0D1B2A` | Dark backgrounds, primary buttons, navbar |
| `--color-primary-mid` | Ocean Blue | `#1A3A5C` | Cards on dark bg, sidebar |
| `--color-primary-light` | Sky Dusk | `#2E6DA4` | Secondary buttons, links, focus rings |
| `--color-accent` | Electric Teal | `#00C2B2` | CTAs, active states, highlights |
| `--color-accent-soft` | Teal Mist | `#E0F7F5` | Accent backgrounds, badge fills |

### Neutral Palette

| Token | Name | Hex | Usage |
|---|---|---|---|
| `--color-surface` | Warm White | `#F8F9FB` | Main page background |
| `--color-surface-raised` | Card White | `#FFFFFF` | Cards, modals |
| `--color-surface-sunken` | Cool Gray | `#F0F2F5` | Input backgrounds, table stripes |
| `--color-border` | Fog | `#DDE1E7` | Borders, dividers |
| `--color-text-primary` | Ink | `#1A1F2E` | Primary body text |
| `--color-text-secondary` | Slate | `#5A6478` | Labels, captions |
| `--color-text-disabled` | Dust | `#A3ABBF` | Disabled states |

### Status / Semantic Palette

| Token | Hex | State | Usage |
|---|---|---|---|
| `--color-success` | `#1AAB6D` | Confirmed / Completed | Booking confirmed, all clear |
| `--color-success-soft` | `#E8F8F1` | Success bg | Badges, row highlights |
| `--color-warning` | `#F59E0B` | Attention / Late | Late arrival, pending |
| `--color-warning-soft` | `#FEF9EC` | Warning bg | Badges, row highlights |
| `--color-danger` | `#E8503A` | Disrupted / Missed | Flight delay, urgent |
| `--color-danger-soft` | `#FDECEA` | Danger bg | Badges, row highlights |
| `--color-info` | `#4A6CF7` | Informational | New booking, upcoming |
| `--color-info-soft` | `#EEF1FE` | Info bg | Badges, row highlights |

### Gradients
- **Hero:** `linear-gradient(135deg, #0D1B2A 0%, #1A3A5C 50%, #0E4D6E 100%)`
- **Accent:** `linear-gradient(120deg, #00C2B2 0%, #2E6DA4 100%)`

### Dark Mode (Admin Dashboards)
| Page bg | Card bg | Card border | Text primary | Text secondary |
|---|---|---|---|---|
| `#0D1B2A` | `#1A2D44` | `#243650` | `#E8EDF4` | `#8A98B0` |

---

## 3. Typography

| Token | Font | Size | Weight | Usage |
|---|---|---|---|---|
| `display-xl` | Clash Display | 56px | 600 | Hero headline |
| `display-lg` | Clash Display | 40px | 600 | Page titles |
| `display-md` | Clash Display | 28px | 500 | Section headings |
| `display-sm` | Clash Display | 22px | 500 | Sub-sections, modals |
| `body-lg` | DM Sans | 18px | 400 | Lead body text |
| `body-md` | DM Sans | 15px | 400 | Standard body, table cells |
| `body-sm` | DM Sans | 13px | 400 | Captions, helper text |
| `label-lg` | DM Sans | 14px | 600 | Buttons, tabs, nav |
| `label-sm` | DM Sans | 12px | 600 | Badges, chips |
| `mono` | JetBrains Mono | 13px | 400 | IDs, timestamps |

---

## 4. Spacing & Layout

**Base unit:** 8px. Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96px.

| Radius | Value | Usage |
|---|---|---|
| sm | 4px | Inputs, small badges |
| md | 8px | Buttons, chips |
| lg | 12px | Cards, modals |
| xl | 16px | Feature cards |
| full | 9999px | Pills, avatars |

| Shadow | Value | Usage |
|---|---|---|
| sm | `0 1px 3px rgba(0,0,0,0.08)` | Flat cards |
| md | `0 4px 12px rgba(0,0,0,0.10)` | Standard cards |
| lg | `0 8px 24px rgba(0,0,0,0.12)` | Modals, dropdowns |
| xl | `0 16px 48px rgba(0,0,0,0.16)` | Floating panels |
| teal | `0 4px 20px rgba(0,194,178,0.25)` | Accent hover |

---

## 5. Component Specs

### Buttons
- **Primary:** Teal bg, navy text, 12px 24px padding, radius-md, hover darkens + shadow-teal
- **Secondary:** Transparent, 1.5px border primary-light, hover light fill
- **Danger:** Coral red bg, white text
- **Ghost:** No bg/border, text-secondary, hover sunken bg

### Status Badges
`padding: 3px 10px`, `radius-full`, `label-sm`, `uppercase`, `0.04em spacing`
Variants: On Track, Confirmed, Disrupted, Missed, Late Arrival, Pending, Upcoming, Completed, Rescheduled

### Cards
- **Standard:** White/dark bg, 1px border, radius-lg, shadow-md, 24px padding
- **Stat:** Coloured 3px top border, large number in Clash Display
- **Alert:** Danger-soft bg, 3px left border, pulse on arrival

### Tables
- Header: Sunken bg, label-sm uppercase
- Rows: Alternating, 52px height, hover teal tint
- Status badges in every table

---

## 6. Icon Library
**Lucide React** — 1.5px stroke, 20px default, 16px inline, 24px feature sections.

---

## 7. Motion & Animation
- **Alert entry:** translateY(-12px) → 0, opacity 0→1, 300ms ease-out
- **Status badge change:** 150ms fade out, 150ms fade in
- **Stat counter:** 400ms number animation
- **LIVE pulse:** 2s ease-in-out infinite scale+opacity
- **Page load:** 80ms stagger between stat cards
- All respect `prefers-reduced-motion`
