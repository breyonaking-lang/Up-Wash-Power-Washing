# Upwash Power Washing - Product Requirements Document

## Project Overview
Professional power washing service application for Upwash Power Washing in Burleson, TX. Full-stack application with customer booking, admin portal, and contractor management.

## Tech Stack
- **Frontend**: React, TailwindCSS, Shadcn/UI, Framer Motion
- **Backend**: FastAPI (Python), MongoDB
- **Payments**: Square SDK (Apple Pay, Google Pay)
- **Authentication**: JWT-based for Admin and Contractor portals

## URLs
- **Preview**: https://admin-control-138.preview.emergentagent.com
- **Admin Portal**: /admin/login → /admin/dashboard
- **Contractor Portal**: /contractor/login → /contractor/dashboard

## Credentials
- **Admin**: Hughes0108 / Godfirst7!
- **Contractor**: ajb123 / upwash_test_123

---

## Core Features Implemented

### 1. Services Available
- Recycling Bin Cleaning ($15/bin)
- Patio Cleaning ($85)
- Driveway Cleaning ($85)
- Restaurant Dumpster Cleaning ($85 first, $45 each additional)
- Home Power Washing (Quote)
- Construction Site Cleanup (Quote)
- **Commercial Properties** (Quote) - Schools, apartments, office buildings

### 2. Booking System
- **Single Service**: Pick a specific date
- **Monthly Subscription** (5% discount):
  - Choose how many days per month (1-6 days)
  - Select specific days of the month (1st-31st)
  - First service charged at booking
  - Future services charged 3 days in advance
- Scent Bombs available as add-on ($10 each) or standalone

### 3. Admin Portal Features
- **Dashboard Overview**: Total bookings, pending, completed, revenue stats
- **Calendar View**: All bookings by date, color-coded (Subscription/Paid/Unpaid)
- **Unpaid Subscriptions Tab**: Failed payment tracking with reactivate/cancel options
- **Client Portal**: Customer list with booking history
- **Contractor Management**: Create/edit contractors, reset passwords
- **Route Management**: Assign bookings to routes and contractors
- **Messages**: Real-time chat with contractors (with audio notifications)
- **Inquiry Messages**: Contact form submissions from website
- **Daily Bible Verse**: Rotating verse on dashboard

### 4. Contractor Portal Features
- View assigned routes and stops
- Mark tasks complete or "unable to complete" (with photo/notes)
- Real-time chat with admin
- In-app notifications for new assignments

### 5. Payment Processing
- Square integration for secure payments
- Apple Pay / Google Pay support
- 8.25% sales tax on all purchases
- Recurring payment processing for subscriptions

---

## Recently Completed (Dec 2025)

### Session Updates:
1. **Commercial Properties Service** - Added to services page with quote pricing
2. **Subscription Logic Overhaul**:
   - Changed from "days of week" to "days of month" (1-31)
   - Added "How many days per month" selector (1-6)
   - Billing info: First service charged at booking, then 3 days before each service
3. **Admin Calendar Page** - Full calendar view with booking data, month navigation
4. **Unpaid Subscriptions Page** - Track failed subscription payments, reactivate/cancel options
5. **Failed Payment Handling** - Auto-notification to clients, removal from routes

---

## Database Schema

### Key Collections:
- `users` - Admin and contractor accounts
- `bookings` - All bookings with subscription fields:
  - `monthly_service_days`: [1, 15] (array of days 1-31)
  - `service_days_per_month`: 2 (number 1-6)
  - `subscription_status`: active/payment_failed/cancelled
  - `next_payment_date`: "2026-03-12"
- `routes` - Daily route assignments
- `messages` - Admin-contractor chat
- `inquiries` - Contact form submissions
- `customer_notifications` - Payment reminders and alerts

---

## API Endpoints

### Public
- `POST /api/bookings` - Create booking
- `POST /api/calculate-price` - Get pricing
- `POST /api/create-payment` - Square payment
- `GET /api/services` - List services
- `POST /api/inquiries` - Submit contact form

### Admin (JWT Protected)
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/bookings` - All bookings
- `GET /api/admin/calendar` - Calendar data
- `GET /api/admin/unpaid-subscriptions` - Failed payments
- `PATCH /api/admin/subscriptions/{id}/status` - Update subscription
- `POST /api/admin/messages/send` - In-house messaging
- `GET/POST /api/contractors` - Contractor CRUD
- `GET/POST /api/routes` - Route management

### Contractor (JWT Protected)
- `GET /api/contractors/routes` - My routes
- `POST /api/contractors/tasks/{id}/complete` - Mark complete
- `POST /api/contractors/tasks/{id}/unable` - Unable to complete

---

## Backlog / Future Tasks

### P0 (High Priority)
- [ ] Email integration for invoices/quotes (in-house feature requested)
- [ ] Automated subscription payment processing (currently manual trigger)
- [ ] Auto-assign paid bookings to routes

### P1 (Medium Priority)
- [ ] Contractor-to-contractor chat
- [ ] Contractor location/proximity tracking
- [ ] GPS route optimization (Google Maps integration available)
- [ ] Advanced scheduling rules (Recycling Mon-Thurs, Home Cleaning Wed/Thurs)

### P2 (Low Priority)
- [ ] Contractor route purchasing ($350 + tax)
- [ ] Multiple time slot options for services
- [ ] Customer self-service portal

---

## Testing
- **Test Reports**: /app/test_reports/iteration_2.json
- **Last Test**: All features passing (100% backend, 100% frontend)
