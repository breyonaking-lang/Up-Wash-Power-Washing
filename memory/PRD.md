# Upwash Power Washing - Product Requirements Document

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
- Service Area: 15-mile radius free, $1/mile beyond
- Scheduling: Mon-Fri (weekdays only, no time slots)
- Payment: Stripe + Cash App
- SMS Reminders: Twilio integration for text notifications
- Email Confirmations: Resend integration

## Architecture

### Backend (FastAPI + MongoDB)
- `/app/backend/server.py` - Main API server
- Collections: `bookings`, `payment_transactions`
- Stripe integration via `emergentintegrations` library
- Twilio SMS for notifications
- Resend for email confirmations

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

## Core Requirements (Static)
- [x] Service listing with pricing (fixed + quote-based)
- [x] Multi-step booking wizard
- [x] Calendar with weekday-only scheduling (Mon-Fri)
- [x] Dynamic pricing calculator
- [x] Tiered pricing for recycling bins & dumpsters
- [x] Quote-based services (Home Power Washing, Construction Cleanup)
- [x] Quote description field and photo uploads
- [x] Scent bomb standalone add-on ($3.50 each)
- [x] Monthly subscription: 2 days/month, 5% discount
- [x] Travel fee calculation ($1/mile beyond 15 miles)
- [x] Customer info: name, address, phone, SMS opt-in
- [x] Stripe payment integration
- [x] Twilio SMS integration
- [x] Resend email confirmations
- [x] Admin dashboard with calendar view
- [x] Admin SMS reminder sending
- [x] Booking management (confirm/complete/cancel)
- [x] Admin view of quote details and photos

## What's Been Implemented
**Date: Feb 24, 2026**
- Complete booking website with 4-step wizard
- 6 services: 4 fixed-price + 2 quote-based
- Monthly subscription: choose 2 weekdays, 5% discount
- SMS opt-in with Twilio integration
- Email confirmations via Resend (sandbox mode - needs domain verification for production)
- Quote-based service support with description text and photo uploads
- Admin dashboard with stats and booking management
- Admin view shows quote details and customer photos
- Mobile-responsive design

## Integrations
| Integration | Status | Notes |
|-------------|--------|-------|
| Stripe | Active | Using test key |
| Twilio | Active | Using user credentials |
| Resend | Active | Sandbox mode - customer emails need domain verification |

## Next Tasks (P1)
1. Verify domain in Resend for production email sending
2. Google Calendar integration (user approved Emergent-managed auth)
3. HoneyBook CRM sync (deferred, requires API key)

## Future Tasks (P2)
1. Customer portal for booking history
2. Advanced analytics dashboard
3. Recurring payment automation for monthly subscriptions
