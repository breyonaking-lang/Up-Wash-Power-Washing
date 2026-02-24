# Upwash Power Washing - Product Requirements Document

## Original Problem Statement
Build a power washing cleaning services website for "Upwash Power Washing Cleaning Services" in Burleson, TX with:
- Recycling Bin Cleaning: $15 (1), $25 (2), $8 each additional
- Patio Cleaning: $30
- Driveway Cleaning: $30
- Restaurant Dumpster Cleaning: $70 first, $45 each additional
- **Home Power Washing: Quote-based**
- **Construction Site Cleanup: Quote-based**
- Scent Bomb Add-on: $3.50 each (standalone, any service)
- Monthly Subscription: 5% discount, choose 2 days per month
- Service Area: 15-mile radius free, $1/mile beyond
- Scheduling: Mon-Fri (weekdays only, no time slots)
- Payment: Stripe + Cash App
- SMS Reminders: Twilio integration for text notifications

## Architecture

### Backend (FastAPI + MongoDB)
- `/app/backend/server.py` - Main API server
- Collections: `bookings`, `payment_transactions`
- Stripe integration via `emergentintegrations` library
- Twilio SMS for notifications

### Frontend (React + Tailwind + Shadcn UI)
- `/app/frontend/src/pages/` - Page components
- `/app/frontend/src/components/` - Shared components
- Routing: react-router-dom

## Services List
| Service | Pricing |
|---------|---------|
| Recycling Bin | $15 (1), $25 (2), +$8 each |
| Patio Cleaning | $30 |
| Driveway Cleaning | $30 |
| Dumpster Cleaning | $70 first, +$45 each |
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
- [x] Scent bomb standalone add-on ($3.50 each)
- [x] Monthly subscription: 2 days/month, 5% discount
- [x] Travel fee calculation ($1/mile beyond 15 miles)
- [x] Customer info: name, address, phone, SMS opt-in
- [x] Stripe payment integration
- [x] Twilio SMS integration
- [x] Admin dashboard with calendar view
- [x] Admin SMS reminder sending
- [x] Booking management (confirm/complete/cancel)

## What's Been Implemented
**Date: Feb 21, 2026**
- Complete booking website with 4-step wizard
- 6 services: 4 fixed-price + 2 quote-based
- Monthly subscription: choose 2 weekdays, 5% discount
- SMS opt-in with Twilio integration
- Admin dashboard with stats and booking management
- Mobile-responsive design

## Next Tasks
1. Get HoneyBook API key for CRM sync
2. Add email notification system
3. Upgrade Twilio to paid account for production SMS
