# Up-Wash Power Washing - Product Requirements Document

## Last Updated: Feb 28, 2026 (Session 2)

## Original Problem Statement
Power washing business website with booking system, admin dashboard, contractor portal, client portal, subscription management, Square payment integration, route management, and contractor earnings tracking.

## Architecture
- **Frontend**: React.js with Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Payments**: Square (Sandbox)
- **SMS**: Twilio (Live Integration)
- **Photo Storage**: In-house at /app/backend/uploads/photos

## User Personas
1. **Customer/Client** - Books services, makes payments, manages subscription via Client Portal
2. **Admin** - Manages bookings, routes, contractors, subscriptions, payments, contracts
3. **Contractor** - Views assigned routes, completes stops, requests routes, tracks earnings, coordinates with team

## Core Requirements (Static)
- Multi-step booking wizard
- 7 services (recycling bin, patio, driveway, dumpster, home powerwash, construction, commercial)
- Monthly subscription with 5% discount
- Travel fee ($1/mile beyond 15 miles)
- 8.25% sales tax (admin configurable, shown at checkout only)
- Bible verses on all pages (rotating every 15 mins)
- Contractor pay: **$11 per completed stop** (admin configurable)

## What's Been Implemented

### Feb 24-26, 2026 - Initial Build
- [x] Full booking system with multi-step wizard
- [x] Admin dashboard with stats, calendar, bookings
- [x] Contractor portal with routes, notifications, chat
- [x] Square payment integration
- [x] Google Calendar sync

### Feb 27, 2026 - Major Updates

#### Bulk Delete & Data Management ✅ NEW
- [x] Delete single/bulk pending routes
- [x] Auto-delete routes older than 30 days button
- [x] Delete single/bulk SMS logs
- [x] Delete all SMS logs option
- [x] Delete single/bulk messages
- [x] Delete clients individually or in bulk
- [x] Assigned routes auto-remove from Pending Routes list

#### Contract Document Management ✅ NEW
- [x] Add Document button on Contracts page
- [x] Copy/paste contract document content
- [x] Document title and content fields
- [x] Documents list with delete option
- [x] Document templates stored in MongoDB

#### Contractor Accept/Decline Released Routes ✅ NEW
- [x] Released routes show Accept/Decline buttons
- [x] Accept creates route request for admin approval
- [x] Decline marks route as declined by contractor
- [x] Admin receives notification of accept request
- [x] Route requests page shows pending approvals

#### Booking Amount Edit & Pay Links ✅ NEW
- [x] Edit booking amounts (subtotal, tax, total)
- [x] Generate pay link for client
- [x] Pay link sent via in-app message
- [x] Pay link stored in customer_messages
- [x] Client can pay via unique token URL

#### UI/UX Improvements ✅ NEW
- [x] Dropdown text now black (fixed CSS)
- [x] Notifications deactivate when tab clicked
- [x] Nav sidebar scrollable for many items
- [x] Route assignment shows success toast and removes from pending

#### Customer Notification Center (Client Portal) ✅
- [x] Notifications section with bell icon and unread count badge
- [x] Displays reschedule messages with calendar icon
- [x] Shows en-route and completion notifications
- [x] Message types: reschedule, en_route, completion, general
- [x] Timestamps and "New" badge for unread notifications
- [x] Pulls from both client_notifications and customer_messages collections

#### Admin Clients Page ✅
- [x] Full client list from bookings and registered portal users
- [x] 4 stat cards: Total Clients, Subscribers, Portal Accounts, Total Revenue
- [x] Search by name, email, phone, or address
- [x] Client table with: Name, Contact, Address, Bookings, Total Spent, Status, Actions
- [x] View client details modal
- [x] Quick-book button for existing clients (pre-fills form)

#### Admin Create Booking (Manual Entry) ✅ NEW
- [x] Customer info form: Name, Phone, Email, Address, City, State, ZIP
- [x] Services grid with dynamic prices from admin settings
- [x] Multi-date booking support (add multiple dates)
- [x] Monthly subscription option with 5% discount
- [x] Payment status: Unpaid, Paid, Waived
- [x] Total Override for custom pricing
- [x] Notes field for special instructions
- [x] Order Summary with calculated totals
- [x] Successful creation redirects to Pending Services

#### Calendar Booking Reschedule Feature ✅
- [x] Admin can click on any date in calendar to see bookings
- [x] Reschedule button on each booking in modal
- [x] Reschedule modal with: current date, new date picker, SMS checkbox, custom message
- [x] Weekday-only validation for new dates
- [x] Auto-send SMS notification to customer when booking rescheduled
- [x] SMS stored in customer_messages collection (in-app)
- [x] Contractor gets notification if assigned to the route
- [x] Route data auto-updated with new date

#### Admin Settings Enhancement ✅
- [x] Sales Tax Rate configuration (default 8.25%)
- [x] Service Prices management with Edit buttons for each service
- [x] Contractor Pay Rate ($11/stop default, editable)
- [x] Truck Rental Prices (Small: $75/week, Large: $125/week)
- [x] All settings persist to MongoDB

#### Contractor Pay Stubs ✅
- [x] Payment History table with "View Stub" button
- [x] Professional pay stub modal with company header
- [x] Shows: Contractor name, pay period, completed stops, rate, net pay
- [x] Print functionality to generate printable pay stub
- [x] YTD earnings calculation
- [x] Payroll page shows dynamic pay rate from settings

#### Released Routes Flashing Icon ✅
- [x] AlertTriangle (caution) icon
- [x] Fast flashing animation (0.3s): Red → Green → Yellow
- [x] Icon color cycles through RGB
- [x] Badge and text also flash
- [x] Pulsing scale effect for urgency

#### In-House Photo Storage System
- [x] Photo upload API (/api/upload/photo, /api/upload/photo-base64)
- [x] Photos stored at /app/backend/uploads/photos
- [x] Static file serving for uploaded images
- [x] Used for CNS photos and contract signatures

#### Admin Notifications System (Visual + Audio)
- [x] Notification counts for new bookings, scent bombs, messages, CNS stops
- [x] Toast notifications with sound for new events
- [x] Released Routes: Flashing red/green/yellow caution icon
- [x] New pending routes: Visual badge + notification sound
- [x] Scent bomb orders: Toast + browser notification

#### Contract Management System
- [x] Admin can send contracts for weekly/bi-weekly services
- [x] Professional contract terms auto-generated
- [x] Dedicated Contracts page in admin sidebar
- [x] Client receives pending contract in portal
- [x] Digital signature pad for client signing

#### Contractor Proximity & Team Features
- [x] Real-time location sharing between contractors
- [x] Distance calculation (miles) to nearby contractors
- [x] Request exact location from other contractors

#### Route Approval Automation
- [x] Approved routes auto-move out of "Pending Routes"
- [x] Contractors charged ONLY for approved routes
- [x] Charge = pay_per_stop × number of stops

#### In-App Messaging System (replaces Twilio)
- [x] En-route SMS notification (stored in-app)
- [x] Completion SMS notification (stored in-app)
- [x] Reschedule SMS notification (stored in-app)
- [x] Admin SMS Logs page to view all messages
- [x] Ready for Twilio integration when credentials provided

### Feb 28, 2026 - Twilio SMS Integration

#### Admin-Contractor SMS Communication ✅ NEW
- [x] POST /api/admin/sms/contractor - Admin sends SMS to contractor via Twilio
- [x] POST /api/admin/sms/contractor/login - Admin sends contractor login credentials via SMS
- [x] POST /api/admin/contractors/create-and-notify - Create contractor and send welcome SMS
- [x] POST /api/contractor/sms/admin - Contractor replies to admin (in-app + optional SMS)
- [x] GET /api/admin/sms/contractor/history/{id} - Get conversation history
- [x] GET /api/admin/sms/contractors/all - Get all admin-contractor messages
- [x] SMS Modal in Admin Contractors page with conversation view
- [x] Send Login Credentials button in modal
- [x] Real-time SMS status tracking (sent/failed/pending)
- [x] Twilio credentials configured and tested

#### Automated ETA Notifications ✅ NEW
- [x] POST /api/contractor/sms/eta-alert - Send ETA SMS when contractor is close
- [x] POST /api/contractor/check-proximity - Check if contractor is within 10-15 min range
- [x] Auto ETA tracking with 30-second location polling
- [x] Auto ETA toggle button in Contractor Dashboard
- [x] Manual "Send ETA" button for each task
- [x] ETA sent badge shows on task cards after notification
- [x] Google Maps Distance Matrix API integration for accurate ETA
- [x] Customer receives SMS: "Your technician is approximately X minutes away"

#### Automated Customer SMS Notifications ✅ NEW
- [x] Booking confirmation SMS when payment is successful
- [x] Reschedule notification SMS (via Twilio)
- [x] Subscription payment failed SMS notification
- [x] Subscription cancelled due to non-payment SMS
- [x] All auto-texts stored in customer_messages for history

#### Two-Way SMS (Twilio Webhook) ✅ NEW
- [x] POST /api/webhooks/twilio/incoming - Receive customer SMS replies
- [x] GET /api/contractor/sms/inbox - Contractor incoming messages
- [x] GET /api/admin/sms/inbox - Admin incoming messages
- [x] Customer replies create notifications for contractor & admin

#### SMS Templates for Contractors ✅ NEW
- [x] GET /api/contractor/sms/templates - 12 pre-populated templates
- [x] POST /api/contractor/sms/send-template - Send with auto-filled customer info
- [x] Templates: On my way, Arrived, Running late, Weather delay, Need access, Gate code, Bins not out, Job complete, Unable to complete, Follow-up, Review request, Payment reminder
- [x] Enhanced SMS modal with categorized quick templates (Arrival, Delays, Access, Completion, Follow-up)

#### Automated Payroll System
- [x] Admin Payroll page with pending payments dashboard
- [x] Shows dynamic pay rate from settings
- [x] Process individual contractor or Pay All button
- [x] Payment History with View Stub buttons

## Credentials
- **Admin**: Hughes0108 / Godfirst7!
- **Contractor**: ajb123 / upwash_test_123
- **Client (Test)**: test@example.com / test123

## Twilio Configuration
- Account SID: AC625a6a6aa54b5aed4ec936f16b75976b
- Auth Token: (configured in .env)
- Phone Number: +18557894541

## Square Sandbox
- App ID: sandbox-sq0idb-QbTRBR0SjaHj-Myt_wXXMQ
- Location ID: LP6GV30TZNAR3

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] Payment integration working (Square)
- [x] Booking flow complete
- [x] Route management system
- [x] Contractor earnings tracking (dynamic pay rate)
- [x] Client Portal with contracts
- [x] In-house photo storage
- [x] Admin notifications (visual + audio)
- [x] Contract signing flow
- [x] Route optimization (Google Maps API)
- [x] In-app messaging system
- [x] Automated payroll with pay stubs
- [x] Calendar reschedule with SMS
- [x] Admin settings for prices/tax
- [x] Released Routes flashing icon (red/green/yellow)
- [x] Customer Notification Center in Client Portal
- [x] Admin Clients page with search
- [x] Admin Create Booking (manual entry)

### P1 (High) - DEFERRED BY USER
- [ ] Test real payments in production
- [ ] Apple Pay domain verification
- [x] Configure Twilio credentials for live SMS ✅ DONE

### P2 (Medium) - TODO
- [ ] Customer SMS when contractor arrives (GPS proximity trigger)
- [ ] Service-specific booking day/time restrictions testing

## API Endpoints Summary

### Admin Clients & Bookings
- GET /api/admin/clients/all - Get all clients with booking stats
- POST /api/admin/bookings/create - Create booking manually

### Settings
- GET /api/admin/settings - Get all settings
- PATCH /api/admin/settings/sales-tax - Update sales tax
- PATCH /api/admin/settings/service/{id} - Update service price
- PATCH /api/admin/settings/pay-per-stop - Update contractor rate
- PATCH /api/admin/settings/truck-rentals - Update truck prices

### Bookings
- PATCH /api/admin/bookings/{id}/reschedule - Reschedule booking with SMS

### Client Portal
- GET /api/client/notifications - Get notifications including messages
- PATCH /api/client/notifications/{id}/read - Mark notification as read

### Payroll
- GET /api/admin/payroll/pending - Get pending payments
- GET /api/admin/payroll/history - Get payment history
- POST /api/admin/payroll/process/{contractor_id} - Process single payment
- POST /api/admin/payroll/process-all - Process all payments
- GET /api/admin/payroll/{id}/paystub - Get pay stub details

### Admin-Contractor SMS (NEW)
- POST /api/admin/sms/contractor - Send SMS to contractor
- POST /api/admin/sms/contractor/login - Send login credentials via SMS
- POST /api/admin/contractors/create-and-notify - Create contractor + send welcome SMS
- POST /api/contractor/sms/admin - Contractor reply to admin
- GET /api/admin/sms/contractor/history/{contractor_id} - SMS conversation history
- GET /api/admin/sms/contractors/all - All admin-contractor messages

### Contractor ETA Notifications (NEW)
- POST /api/contractor/sms/eta-alert - Send ETA notification to customer
- POST /api/contractor/check-proximity - Check if contractor is close enough to send ETA

### Feb 28, 2026 - Session 2 Updates

#### SMS Opt-Out System ✅ NEW
- [x] STOP/UNSUBSCRIBE/CANCEL/END/QUIT keywords trigger opt-out
- [x] START/YES/SUBSCRIBE keywords re-subscribe
- [x] Opted-out customers not sent SMS
- [x] GET /api/admin/sms/optouts - View opted out list
- [x] POST/DELETE /api/admin/sms/optout/{phone} - Manual opt-out management

#### Customer & Contractor Editing ✅ NEW
- [x] PUT /api/admin/customers/{booking_id} - Edit customer info (name, email, phone, address, notes)
- [x] PUT /api/admin/contractors/{contractor_id} - Edit contractor info (name, email, phone, address, pay_rate, notes, is_active)
- [x] Edit Contractor modal in Admin Dashboard

#### Quote System with Images ✅ NEW
- [x] Customers can send images via SMS for quotes
- [x] Images stored from Twilio webhook
- [x] GET /api/admin/quotes - View quote requests with images
- [x] POST /api/admin/quotes/respond - Respond with price and payment link

#### Booking Price Modification ✅ NEW
- [x] PUT /api/admin/bookings/{id}/price - Modify booking prices (subtotal, travel_fee, tax, discount, total)
- [x] POST /api/admin/bookings/send-payment-link - Send payment link via SMS

#### Separated SMS Threads ✅ NEW
- [x] POST /api/admin/sms/direct - Send to specific contractor only (private thread)
- [x] POST /api/admin/sms/group - Send to multiple contractors (group chat)
- [x] GET /api/admin/sms/threads - View all threads (direct + group)
- [x] GET /api/admin/sms/thread/{contractor_id} - View specific conversation

#### Contractor Portal Updates ✅ NEW
- [x] My Routes "Purchase Route" now redirects to "Request Routes"
- [x] Earnings page shows ONLY today's and this week's earnings
- [x] Weekly earnings reset every Monday
- [x] "Resets in X days" countdown displayed
- [x] CNS stops shown for current week only

#### Enhanced Client Portal ✅ NEW
- [x] GET /api/client/booking-history - View past completed services
- [x] GET /api/client/upcoming-services - View scheduled services
- [x] POST /api/client/subscription/pause - Pause subscription
- [x] POST /api/client/subscription/resume - Resume paused subscription
- [x] POST /api/client/subscription/cancel - Request cancellation (admin notified)
- [x] Navigation tabs: Dashboard, Upcoming Services, Service History, Subscription
- [x] Quick stats on dashboard (upcoming count, completed count, status)
- [x] Subscription details with service days and pricing
- [x] Pause/Resume/Cancel buttons for subscription management
- [x] Cancellation reason modal
- [x] Admin notified of cancellation requests

#### SMS Service Fixes & Payment Reminders ✅ NEW
- [x] Fixed phone number formatting (auto-adds +1 for US numbers)
- [x] Added validation for empty messages
- [x] POST /api/admin/send-payment-reminders - Manual trigger for 3-day reminders
- [x] GET /api/admin/upcoming-reminders - Preview customers needing reminders
- [x] POST /api/cron/payment-reminders - Cron endpoint (no auth) for automation
- [x] "Send Payment Reminders" button in SMS Logs page
- [x] Respects SMS opt-out list
- [x] Marks bookings as reminded to prevent duplicates

### Feb 28, 2026 - Session 3 Updates

#### 2-Way Admin-Contractor Messaging ✅
- [x] Proper message threads per contractor
- [x] Timestamps on all messages (formatted as "Jan 28, 2:30 PM")
- [x] Unread count badges per contractor
- [x] Messages sent via SMS to contractor phone

#### Renamed Contracts to Documents ✅
- [x] Admin dashboard tab renamed
- [x] Client portal section renamed

#### SMS to Contractors ✅
- [x] Fixed phone number formatting
- [x] Added ADMIN_PHONE to .env

#### Bible Verses ✅
- [x] Expanded from 10 to 30 verses

#### Booking Flow Updates ✅
- [x] Recycling/Trash bins: Mon-Tue only, no time slots
- [x] Patio/Driveway/Dumpster: Wed-Fri with 3-hour windows
- [x] Quote services (Home, Construction, Commercial): Thu-Fri only
- [x] Service availability days shown on services page
- [x] Scent bomb upsell popup during checkout

#### New Services ✅
- [x] Trash Bin Cleaning (separate from recycling)
- [x] Scent Bomb (as addon service)

#### Day-Before Reminders ✅
- [x] POST /api/cron/bin-placement-reminders - Send at 4pm day before
- [x] Reminds customers to place bins on driveway

#### Still TODO (Next Session):
- [ ] Admin dashboard tabs clickable with route management
- [ ] Route combining and assignment by city/state/zip
- [ ] Subscription auto-populate nearest day
- [ ] Allow customers to go back during booking
- [ ] Quote service click-through to quote form
