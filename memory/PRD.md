# Upwash Power Washing - Product Requirements Document

## Latest Update (Feb 24, 2026)
- **Pricing Fix**: Updated Patio and Driveway cleaning to $85 on homepage
- **Quote Requirements**: Made description and photo uploads REQUIRED for quote-based services (Home Power Washing, Construction Cleanup)

## Original Problem Statement
Build a power washing cleaning services website for "Upwash Power Washing Cleaning Services" in Burleson, TX with:
- Recycling Bin Cleaning: $15 (1), $25 (2), $8 each additional
- Patio Cleaning: $85
- Driveway Cleaning: $85
- Restaurant Dumpster Cleaning: $85 first, $45 each additional
- **Home Power Washing: Quote-based**
- **Construction Site Cleanup: Quote-based**
- Scent Bomb Add-on: $3.50 each (standalone, any service)
- Monthly Subscription: 5% discount, choose 2 days per month
- Service Area: 15-mile radius free, $1/mile beyond (AUTO-CALCULATED)
- Scheduling: Mon-Fri (weekdays only, no time slots)
- Payment: Stripe + Cash App
- SMS Reminders: Twilio integration
- Email Confirmations: Resend integration (bookings@upwashpowerwashing.com)
- Auto Follow-ups: 24-hour follow-up for quote requests
- Google Calendar: Auto-sync appointments

## Architecture

### Backend (FastAPI + MongoDB)
- `/app/backend/server.py` - Main API server
- Collections: `bookings`, `payment_transactions`, `settings`
- Stripe integration via `emergentintegrations` library
- Twilio SMS for notifications
- Resend for email confirmations
- Google Maps Routes API for distance calculation
- Google Calendar API for appointment sync

### Frontend (React + Tailwind + Shadcn UI)
- `/app/frontend/src/pages/` - Page components
- `/app/frontend/src/components/` - Shared components
- Routing: react-router-dom

## Services List
| Service | Pricing |
|---------|---------|
| Recycling Bin | $15 (1), $25 (2), +$8 each |
| Patio Cleaning | $85 |
| Driveway Cleaning | $85 |
| Dumpster Cleaning | $85 first, +$45 each |
| Home Power Washing | Quote |
| Construction Cleanup | Quote |
| Scent Bomb Add-on | $3.50 each |

## Core Features Implemented
- [x] Service listing with pricing (fixed + quote-based)
- [x] Multi-step booking wizard
- [x] Calendar with weekday-only scheduling (Mon-Fri)
- [x] Dynamic pricing calculator
- [x] Tiered pricing for recycling bins & dumpsters
- [x] Quote-based services with description & photo uploads
- [x] **Automatic distance calculation** from customer address
- [x] **Map visual** showing service location and route to Burleson
- [x] **Travel fee auto-calculated** ($1/mile beyond 15 miles)
- [x] Monthly subscription: 2 days/month, 5% discount
- [x] SMS opt-in with Twilio integration
- [x] Email confirmations via Resend
- [x] **24-hour auto follow-up** for quote requests
- [x] **Google Calendar integration** - auto-sync appointments
- [x] Admin dashboard with calendar view
- [x] Admin SMS reminder sending
- [x] Admin quote management (pending quotes, mark responded)
- [x] Admin Integrations panel (SMS + Calendar status)
- [x] Booking management (confirm/complete/cancel)

## Integrations
| Integration | Status | Notes |
|-------------|--------|-------|
| Stripe | Active | Using test key |
| Twilio | Active | User credentials |
| Resend | Active | bookings@upwashpowerwashing.com |
| Google Maps | Active | Routes API + Static Maps |
| Google Calendar | Ready | OAuth flow configured |

## API Endpoints
### Distance & Pricing
- `POST /api/calculate-distance` - Calculate distance from address to Burleson
- `POST /api/calculate-price` - Calculate service pricing with travel fee

### Google Calendar
- `GET /api/auth/google` - Get OAuth authorization URL
- `GET /api/auth/google/callback` - Handle OAuth callback
- `GET /api/auth/google/status` - Check if calendar is connected
- `POST /api/auth/google/disconnect` - Disconnect calendar

### Quote Management
- `GET /api/admin/pending-quotes` - Get quotes awaiting admin response
- `POST /api/admin/quote/{id}/respond` - Mark quote as responded
- `POST /api/admin/process-followups` - Manually trigger 24hr follow-ups

### Background Tasks
- Auto follow-up task runs hourly, sends email/SMS for quotes >24hrs old

## What's Been Implemented
**Date: Feb 24, 2026**
- Complete booking website with 4-step wizard
- 6 services: 4 fixed-price + 2 quote-based
- Automatic distance calculation using Google Maps Routes API
- **Map visual** showing route from customer to Burleson with markers
- Travel fee automatically calculated and added to invoices
- Email confirmations from verified domain
- 24-hour auto follow-up system for quote requests
- Google Calendar integration (OAuth flow + auto event creation)
- Admin dashboard with Integrations panel

## How to Connect Google Calendar
1. Go to Admin Dashboard (/admin)
2. Find the "Integrations" section
3. Click "Connect" next to Google Calendar
4. Sign in with your Google account (upwashpressurewashing@gmail.com)
5. Grant calendar access permissions
6. You'll be redirected back - calendar will show as "Connected"

Once connected, booking confirmations automatically create calendar events.

## Next Tasks (P1)
1. HoneyBook CRM sync (requires API key)

## Future Tasks (P2)
1. Customer portal for booking history
2. Advanced analytics dashboard
3. Recurring payment automation for monthly subscriptions
