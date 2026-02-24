from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, 
    CheckoutSessionResponse, 
    CheckoutStatusResponse, 
    CheckoutSessionRequest
)
from twilio.rest import Client as TwilioClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Stripe setup
stripe_api_key = os.environ.get('STRIPE_API_KEY', '')

# Twilio setup
twilio_account_sid = os.environ.get('TWILIO_ACCOUNT_SID', '')
twilio_auth_token = os.environ.get('TWILIO_AUTH_TOKEN', '')
twilio_phone_number = os.environ.get('TWILIO_PHONE_NUMBER', '')

# Initialize Twilio client
twilio_client = None
if twilio_account_sid and twilio_auth_token:
    twilio_client = TwilioClient(twilio_account_sid, twilio_auth_token)

# Create the main app
app = FastAPI(title="Upwash Power Washing API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ===================== MODELS =====================

class ServicePricing(BaseModel):
    """Service pricing configuration"""
    model_config = ConfigDict(extra="ignore")
    
    service_id: str
    name: str
    base_price: float
    description: str
    pricing_type: str  # "fixed", "tiered", "addon"
    tier_pricing: Optional[Dict] = None  # For tiered pricing like bins
    is_addon: bool = False

class BookingCreate(BaseModel):
    """Booking creation request"""
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    customer_address: str
    distance_miles: float = 0
    services: List[Dict]  # [{service_id, quantity, addons}]
    booking_dates: List[str]  # List of ISO dates for service days
    is_monthly: bool = False
    monthly_days: Optional[List[str]] = None  # Selected days for monthly plan (e.g., ["Monday", "Thursday"])
    sms_opt_in: bool = False  # Opt-in for text reminders
    notes: Optional[str] = None

class Booking(BaseModel):
    """Booking model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_name: str
    customer_email: str
    customer_phone: str
    customer_address: str
    distance_miles: float
    services: List[Dict]
    booking_dates: List[str]  # List of service dates
    is_monthly: bool
    monthly_days: Optional[List[str]] = None
    sms_opt_in: bool = False
    notes: Optional[str] = None
    subtotal: float
    travel_fee: float
    discount: float
    total: float
    status: str = "pending"  # pending, confirmed, completed, cancelled
    payment_status: str = "unpaid"  # unpaid, paid, refunded
    payment_session_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentTransaction(BaseModel):
    """Payment transaction model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    session_id: str
    amount: float
    currency: str = "usd"
    payment_status: str = "initiated"  # initiated, paid, failed, expired
    metadata: Dict = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CheckoutRequest(BaseModel):
    """Checkout request from frontend"""
    booking_id: str
    origin_url: str

class AvailabilityRequest(BaseModel):
    """Check availability request"""
    date: str  # ISO date string

# ===================== SERVICES DATA =====================

SERVICES = {
    "recycling_bin": {
        "service_id": "recycling_bin",
        "name": "Recycling Bin Cleaning",
        "description": "Professional power washing for recycling bins",
        "base_price": 15.0,
        "pricing_type": "tiered",
        "tier_pricing": {
            "1": 15.0,
            "2": 25.0,
            "additional": 8.0
        },
        "is_addon": False
    },
    "patio": {
        "service_id": "patio",
        "name": "Patio Cleaning",
        "description": "Complete patio power washing service",
        "base_price": 30.0,
        "pricing_type": "fixed",
        "is_addon": False
    },
    "driveway": {
        "service_id": "driveway",
        "name": "Driveway Cleaning",
        "description": "Professional driveway power washing",
        "base_price": 30.0,
        "pricing_type": "fixed",
        "is_addon": False
    },
    "dumpster": {
        "service_id": "dumpster",
        "name": "Restaurant Dumpster Cleaning",
        "description": "Dumpster and surrounding area cleaning",
        "base_price": 70.0,
        "pricing_type": "tiered",
        "tier_pricing": {
            "1": 70.0,
            "additional": 45.0
        },
        "is_addon": False
    },
    "scent_bomb": {
        "service_id": "scent_bomb",
        "name": "Scent Bomb",
        "description": "Deodorizing scent treatment add-on",
        "base_price": 3.50,
        "pricing_type": "addon",
        "is_addon": True
    },
    "home_powerwash": {
        "service_id": "home_powerwash",
        "name": "Home Power Washing",
        "description": "Complete home exterior power washing - siding, deck, porch, and more",
        "base_price": 0.0,
        "pricing_type": "quote",
        "is_addon": False
    },
    "construction_cleanup": {
        "service_id": "construction_cleanup",
        "name": "Construction Site Cleanup",
        "description": "Post-construction cleaning and debris removal",
        "base_price": 0.0,
        "pricing_type": "quote",
        "is_addon": False
    }
}

# Business hours - removed time slots, just weekdays
BUSINESS_HOURS = {
    "days": [0, 1, 2, 3, 4],  # Monday=0 to Friday=4
    "day_names": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
}

# Service area
SERVICE_AREA = {
    "center": "Burleson, TX",
    "free_radius_miles": 15,
    "per_mile_charge": 1.0
}

MONTHLY_DISCOUNT = 0.05  # 5% discount for monthly subscription

# ===================== HELPER FUNCTIONS =====================

def calculate_service_price(service_id: str, quantity: int) -> float:
    """Calculate price for a service based on quantity"""
    service = SERVICES.get(service_id)
    if not service:
        return 0.0
    
    if service["pricing_type"] == "tiered":
        tier_pricing = service["tier_pricing"]
        if service_id == "recycling_bin":
            if quantity == 1:
                return tier_pricing["1"]
            elif quantity == 2:
                return tier_pricing["2"]
            else:
                # First 2 bins = $25, then $8 for each additional
                return tier_pricing["2"] + (quantity - 2) * tier_pricing["additional"]
        elif service_id == "dumpster":
            if quantity == 1:
                return tier_pricing["1"]
            else:
                # First dumpster = $70, then $45 for each additional
                return tier_pricing["1"] + (quantity - 1) * tier_pricing["additional"]
    
    return service["base_price"] * quantity

def calculate_travel_fee(distance_miles: float) -> float:
    """Calculate travel fee based on distance"""
    if distance_miles <= SERVICE_AREA["free_radius_miles"]:
        return 0.0
    extra_miles = distance_miles - SERVICE_AREA["free_radius_miles"]
    return extra_miles * SERVICE_AREA["per_mile_charge"]

def calculate_booking_total(services: List[Dict], distance_miles: float, is_monthly: bool, num_service_days: int = 1) -> Dict:
    """Calculate total booking amount"""
    subtotal_per_day = 0.0
    
    for service_item in services:
        service_id = service_item.get("service_id")
        quantity = service_item.get("quantity", 1)
        
        # Main service price
        subtotal_per_day += calculate_service_price(service_id, quantity)
    
    # Multiply by number of service days
    subtotal = subtotal_per_day * num_service_days
    
    travel_fee = calculate_travel_fee(distance_miles)
    # 5% discount for monthly subscription
    discount = subtotal * MONTHLY_DISCOUNT if is_monthly else 0.0
    total = subtotal - discount + travel_fee
    
    return {
        "subtotal_per_day": round(subtotal_per_day, 2),
        "subtotal": round(subtotal, 2),
        "travel_fee": round(travel_fee, 2),
        "discount": round(discount, 2),
        "discount_percent": int(MONTHLY_DISCOUNT * 100),
        "total": round(total, 2),
        "num_service_days": num_service_days
    }

def is_weekday(date_str: str) -> bool:
    """Check if date is a weekday"""
    try:
        date = datetime.strptime(date_str, "%Y-%m-%d")
        return date.weekday() in BUSINESS_HOURS["days"]
    except ValueError:
        return False

# ===================== SMS FUNCTIONS =====================

def format_phone_number(phone: str) -> str:
    """Format phone number to E.164 format for Twilio"""
    # Remove all non-digit characters
    digits = ''.join(filter(str.isdigit, phone))
    # Add +1 if it's a 10-digit US number
    if len(digits) == 10:
        return f"+1{digits}"
    elif len(digits) == 11 and digits.startswith('1'):
        return f"+{digits}"
    return f"+{digits}"

def send_sms(to_phone: str, message: str) -> bool:
    """Send SMS via Twilio"""
    if not twilio_client:
        logging.warning("Twilio not configured, skipping SMS")
        return False
    
    try:
        formatted_phone = format_phone_number(to_phone)
        twilio_client.messages.create(
            body=message,
            from_=twilio_phone_number,
            to=formatted_phone
        )
        logging.info(f"SMS sent to {formatted_phone}")
        return True
    except Exception as e:
        logging.error(f"Failed to send SMS: {e}")
        return False

def send_booking_confirmation_sms(booking: dict) -> bool:
    """Send booking confirmation SMS"""
    if not booking.get("sms_opt_in"):
        return False
    
    customer_name = booking.get("customer_name", "")
    dates = booking.get("booking_dates", [])
    total = booking.get("total", 0)
    is_monthly = booking.get("is_monthly", False)
    monthly_days = booking.get("monthly_days", [])
    
    if is_monthly and monthly_days:
        date_info = f"every {' & '.join(monthly_days)}"
    elif dates:
        date_info = dates[0]
    else:
        date_info = "scheduled"
    
    message = f"Hi {customer_name}! Your Upwash Power Washing booking is confirmed for {date_info}. Total: ${total:.2f}. Questions? Call (817) 750-3211. Thank you!"
    
    return send_sms(booking.get("customer_phone", ""), message)

def send_payment_confirmation_sms(booking: dict) -> bool:
    """Send payment confirmation SMS"""
    if not booking.get("sms_opt_in"):
        return False
    
    customer_name = booking.get("customer_name", "")
    total = booking.get("total", 0)
    
    message = f"Hi {customer_name}! Payment of ${total:.2f} received for your Upwash Power Washing service. We'll see you soon! Questions? (817) 750-3211"
    
    return send_sms(booking.get("customer_phone", ""), message)

# ===================== API ROUTES =====================

@api_router.get("/")
async def root():
    return {"message": "Upwash Power Washing API"}

@api_router.get("/services")
async def get_services():
    """Get all available services with pricing"""
    return {
        "services": list(SERVICES.values()),
        "service_area": SERVICE_AREA,
        "business_hours": BUSINESS_HOURS,
        "monthly_discount": MONTHLY_DISCOUNT
    }

@api_router.post("/calculate-price")
async def calculate_price(request: Dict):
    """Calculate price for selected services"""
    services = request.get("services", [])
    distance_miles = request.get("distance_miles", 0)
    is_monthly = request.get("is_monthly", False)
    num_service_days = request.get("num_service_days", 1)
    
    pricing = calculate_booking_total(services, distance_miles, is_monthly, num_service_days)
    return pricing


@api_router.post("/check-date")
async def check_date(request: Dict):
    """Check if a date is available (weekday only)"""
    date_str = request.get("date", "")
    
    if not date_str:
        return {"available": False, "reason": "No date provided"}
    
    if not is_weekday(date_str):
        return {"available": False, "reason": "Weekends not available. We operate Monday-Friday."}
    
    # Check if date is not in the past
    try:
        date = datetime.strptime(date_str, "%Y-%m-%d")
        if date.date() < datetime.now(timezone.utc).date():
            return {"available": False, "reason": "Cannot book past dates"}
    except ValueError:
        return {"available": False, "reason": "Invalid date format"}
    
    return {"available": True, "date": date_str}

@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking_data: BookingCreate):
    """Create a new booking"""
    # Validate dates are weekdays
    for date_str in booking_data.booking_dates:
        if not is_weekday(date_str):
            raise HTTPException(status_code=400, detail=f"Date {date_str} is not a weekday")
    
    # Calculate pricing
    num_days = len(booking_data.booking_dates)
    pricing = calculate_booking_total(
        booking_data.services,
        booking_data.distance_miles,
        booking_data.is_monthly,
        num_days
    )
    
    # Create booking
    booking = Booking(
        customer_name=booking_data.customer_name,
        customer_email=booking_data.customer_email,
        customer_phone=booking_data.customer_phone,
        customer_address=booking_data.customer_address,
        distance_miles=booking_data.distance_miles,
        services=booking_data.services,
        booking_dates=booking_data.booking_dates,
        is_monthly=booking_data.is_monthly,
        monthly_days=booking_data.monthly_days,
        sms_opt_in=booking_data.sms_opt_in,
        notes=booking_data.notes,
        subtotal=pricing["subtotal"],
        travel_fee=pricing["travel_fee"],
        discount=pricing["discount"],
        total=pricing["total"]
    )
    
    doc = booking.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.bookings.insert_one(doc)
    
    # Send confirmation SMS if opted in
    if booking_data.sms_opt_in:
        send_booking_confirmation_sms(doc)
    
    return booking

@api_router.get("/bookings/{booking_id}")
async def get_booking(booking_id: str):
    """Get a booking by ID"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking

@api_router.get("/bookings")
async def list_bookings(status: Optional[str] = None, date: Optional[str] = None):
    """List all bookings with optional filters"""
    query = {}
    if status:
        query["status"] = status
    if date:
        query["booking_date"] = date
    
    bookings = await db.bookings.find(query, {"_id": 0}).sort("booking_date", 1).to_list(1000)
    return {"bookings": bookings}

@api_router.patch("/bookings/{booking_id}/status")
async def update_booking_status(booking_id: str, status: str):
    """Update booking status"""
    valid_statuses = ["pending", "confirmed", "completed", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return {"message": "Status updated", "booking_id": booking_id, "status": status}

# ===================== SMS ROUTES =====================

class SendSMSRequest(BaseModel):
    """Request to send SMS"""
    booking_id: str
    message_type: str = "reminder"  # "reminder", "custom"
    custom_message: Optional[str] = None

@api_router.post("/sms/send")
async def send_sms_to_customer(request: SendSMSRequest):
    """Send SMS to a customer (admin function)"""
    booking = await db.bookings.find_one({"id": request.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if not booking.get("sms_opt_in"):
        raise HTTPException(status_code=400, detail="Customer has not opted in for SMS")
    
    phone = booking.get("customer_phone")
    if not phone:
        raise HTTPException(status_code=400, detail="No phone number on file")
    
    if request.message_type == "custom" and request.custom_message:
        message = request.custom_message
    else:
        # Default reminder message
        customer_name = booking.get("customer_name", "")
        dates = booking.get("booking_dates", [])
        is_monthly = booking.get("is_monthly", False)
        monthly_days = booking.get("monthly_days", [])
        
        if is_monthly and monthly_days:
            date_info = f"every {' & '.join(monthly_days)}"
        elif dates:
            date_info = dates[0]
        else:
            date_info = "soon"
        
        message = f"Hi {customer_name}! Reminder: Your Upwash Power Washing service is scheduled for {date_info}. Questions? (817) 750-3211"
    
    success = send_sms(phone, message)
    
    if success:
        return {"message": "SMS sent successfully", "to": phone}
    else:
        raise HTTPException(status_code=500, detail="Failed to send SMS")

@api_router.get("/sms/status")
async def get_sms_status():
    """Check if SMS is configured"""
    return {
        "configured": twilio_client is not None,
        "phone_number": twilio_phone_number if twilio_client else None
    }

# ===================== PAYMENT ROUTES =====================

@api_router.post("/checkout/session")
async def create_checkout_session(request: CheckoutRequest, http_request: Request):
    """Create Stripe checkout session"""
    booking = await db.bookings.find_one({"id": request.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Booking already paid")
    
    # Build URLs from frontend origin
    origin = request.origin_url.rstrip('/')
    success_url = f"{origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/booking?cancelled=true"
    
    # Initialize Stripe
    host_url = str(http_request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    # Create checkout session - amount from server-side booking
    amount = float(booking["total"])
    metadata = {
        "booking_id": request.booking_id,
        "customer_email": booking["customer_email"],
        "service_date": booking["booking_date"]
    }
    
    checkout_request = CheckoutSessionRequest(
        amount=amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata
    )
    
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    transaction = PaymentTransaction(
        booking_id=request.booking_id,
        session_id=session.session_id,
        amount=amount,
        payment_status="initiated",
        metadata=metadata
    )
    
    tx_doc = transaction.model_dump()
    tx_doc['created_at'] = tx_doc['created_at'].isoformat()
    tx_doc['updated_at'] = tx_doc['updated_at'].isoformat()
    
    await db.payment_transactions.insert_one(tx_doc)
    
    # Update booking with session ID
    await db.bookings.update_one(
        {"id": request.booking_id},
        {"$set": {"payment_session_id": session.session_id}}
    )
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, http_request: Request):
    """Get checkout session status"""
    # Initialize Stripe
    host_url = str(http_request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
    
    # Check if already processed
    existing_tx = await db.payment_transactions.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )
    
    if existing_tx and existing_tx.get("payment_status") == "paid":
        return {
            "status": status.status,
            "payment_status": "paid",
            "amount_total": status.amount_total,
            "currency": status.currency,
            "already_processed": True
        }
    
    # Update transaction and booking if paid
    if status.payment_status == "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "payment_status": "paid",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Get booking ID from metadata
        booking_id = status.metadata.get("booking_id")
        if booking_id:
            await db.bookings.update_one(
                {"id": booking_id},
                {"$set": {
                    "payment_status": "paid",
                    "status": "confirmed",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Send payment confirmation SMS
            booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
            if booking:
                send_payment_confirmation_sms(booking)
                
    elif status.status == "expired":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "payment_status": "expired",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            booking_id = webhook_response.metadata.get("booking_id")
            if booking_id:
                await db.bookings.update_one(
                    {"id": booking_id},
                    {"$set": {
                        "payment_status": "paid",
                        "status": "confirmed",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                await db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {"$set": {
                        "payment_status": "paid",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
        
        return {"received": True}
    except Exception as e:
        logging.error(f"Webhook error: {e}")
        return {"received": True, "error": str(e)}

# ===================== ADMIN ROUTES =====================

@api_router.get("/admin/calendar")
async def admin_calendar(start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Get calendar view for admin"""
    query = {"status": {"$nin": ["cancelled"]}}
    
    bookings = await db.bookings.find(query, {"_id": 0}).to_list(1000)
    
    # Group by date - handle booking_dates array
    calendar = {}
    for booking in bookings:
        dates = booking.get("booking_dates", [])
        # Handle legacy bookings with single booking_date
        if not dates and booking.get("booking_date"):
            dates = [booking.get("booking_date")]
        
        for date in dates:
            if start_date and date < start_date:
                continue
            if end_date and date > end_date:
                continue
            if date not in calendar:
                calendar[date] = []
            calendar[date].append(booking)
    
    return {"calendar": calendar, "bookings": bookings}

@api_router.get("/admin/stats")
async def admin_stats():
    """Get admin dashboard statistics"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Total bookings
    total = await db.bookings.count_documents({})
    pending = await db.bookings.count_documents({"status": "pending"})
    confirmed = await db.bookings.count_documents({"status": "confirmed"})
    completed = await db.bookings.count_documents({"status": "completed"})
    
    # Today's bookings
    today_bookings = await db.bookings.count_documents({"booking_date": today})
    
    # Revenue
    paid_bookings = await db.bookings.find(
        {"payment_status": "paid"},
        {"_id": 0, "total": 1}
    ).to_list(1000)
    
    total_revenue = sum(b.get("total", 0) for b in paid_bookings)
    
    return {
        "total_bookings": total,
        "pending": pending,
        "confirmed": confirmed,
        "completed": completed,
        "today_bookings": today_bookings,
        "total_revenue": round(total_revenue, 2)
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
