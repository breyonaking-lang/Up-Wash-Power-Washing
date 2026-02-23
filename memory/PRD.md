# Upwash Power Washing - Product Requirements Document

## Original Problem Statement
Build a power washing cleaning services website for "Upwash Power Washing Cleaning Services" in Burleson, TX with:
- Recycling Bin Cleaning: $15 (1), $25 (2), $8 each additional
- Patio Cleaning: $30
- Driveway Cleaning: $30
- Restaurant Dumpster Cleaning: $70 first, $45 each additional
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

## User Personas
1. **Residential Customer** - Homeowners needing bin/patio/driveway cleaning
2. **Commercial Customer** - Restaurants needing dumpster cleaning
3. **Business Owner (Admin)** - Managing bookings and calendar

## Core Requirements (Static)
- [x] Service listing with pricing
- [x] Multi-step booking wizard
- [x] Calendar with weekday-only scheduling (Mon-Fri)
- [x] Dynamic pricing calculator
- [x] Tiered pricing for recycling bins
- [x] Tiered pricing for dumpsters ($70 first, $45 additional)
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
- Updated pricing: dumpster $70/$45, scent bomb $3.50
- Monthly subscription: choose 2 weekdays, 5% discount
- Removed time slots - date only selection
- SMS opt-in checkbox for text reminders
- Twilio SMS integration:
  - Booking confirmation SMS
  - Payment confirmation SMS
  - Admin "Send Reminder" button
- Admin dashboard with stats and booking management
- Mobile-responsive design

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] Core booking flow
- [x] Updated pricing structure
- [x] Monthly subscription (2 days, 5%)
- [x] Payment integration
- [x] SMS integration (Twilio)
- [x] Admin calendar view

### P1 (Important) - Pending
- [ ] HoneyBook API integration (requires API key)
- [ ] Email confirmation notifications

### P2 (Nice to Have)
- [ ] Google Calendar sync for admin
- [ ] Customer account/login
- [ ] Customer booking history
- [ ] Review/testimonial system

## Next Tasks
1. Get HoneyBook API key for CRM sync
2. Add email notification system
3. Upgrade Twilio to paid account for production SMS
