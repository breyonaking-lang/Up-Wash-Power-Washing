# Upwash Power Washing - Product Requirements Document

## Original Problem Statement
Build a power washing cleaning services website for "Upwash Power Washing Cleaning Services" in Burleson, TX with:
- Recycling Bin Cleaning: $15 (1), $25 (2), $8 each additional
- Patio Cleaning: $30
- Driveway Cleaning: $30
- Restaurant Dumpster Cleaning: $120 + $3 scent bombs
- Monthly Plans: 10% discount, 2x weekly
- Service Area: 15-mile radius free, $1/mile beyond
- Scheduling: Mon-Fri, 9AM-6PM, hourly
- Payment: Stripe + Cash App
- Integration: HoneyBook (booking/CRM sync)

## Architecture

### Backend (FastAPI + MongoDB)
- `/app/backend/server.py` - Main API server
- Collections: `bookings`, `payment_transactions`
- Stripe integration via `emergentintegrations` library

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
- [x] Time slot selection (9AM-6PM, hourly)
- [x] Dynamic pricing calculator
- [x] Tiered pricing for recycling bins
- [x] Monthly plan discount (10%)
- [x] Travel fee calculation ($1/mile beyond 15 miles)
- [x] Stripe payment integration
- [x] Admin dashboard with calendar view
- [x] Booking management (confirm/complete/cancel)

## What's Been Implemented
**Date: Feb 21, 2026**
- Complete booking website with 4-step wizard
- All services with correct pricing
- Calendar integration with availability checking
- Stripe checkout integration (test mode)
- Admin dashboard with stats and booking management
- Contact page with business info
- Mobile-responsive design
- Professional UI following design guidelines

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] Core booking flow
- [x] Payment integration
- [x] Admin calendar view

### P1 (Important) - Future
- [ ] HoneyBook API integration (requires API key)
- [ ] Email confirmation notifications
- [ ] SMS reminders
- [ ] Customer account/login

### P2 (Nice to Have)
- [ ] Google Calendar sync for admin
- [ ] Recurring booking management UI
- [ ] Customer booking history
- [ ] Review/testimonial system
- [ ] Service area map visualization

## Next Tasks
1. Get HoneyBook API key from client for full CRM sync
2. Add email notification system (SendGrid/Resend)
3. Implement customer login for booking history
4. Add Google Calendar sync for admin
