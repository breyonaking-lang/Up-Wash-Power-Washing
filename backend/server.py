from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import json
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import requests
from square import Square

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Square setup
square_app_id = os.environ.get('SQUARE_APP_ID', '')
square_access_token = os.environ.get('SQUARE_ACCESS_TOKEN', '')
square_location_id = os.environ.get('SQUARE_LOCATION_ID', '')
square_environment = os.environ.get('SQUARE_ENVIRONMENT', 'sandbox')

# Initialize Square client
square_client = None
if square_access_token:
    from square import Square
    from square.environment import SquareEnvironment
    env = SquareEnvironment.SANDBOX if square_environment == 'sandbox' else SquareEnvironment.PRODUCTION
    square_client = Square(
        token=square_access_token,
        environment=env
    )

# Google Maps setup
google_maps_api_key = os.environ.get('GOOGLE_MAPS_API_KEY', '')
burleson_address = os.environ.get('BURLESON_ADDRESS', 'Burleson, TX')

# Tax rate
SALES_TAX_RATE = float(os.environ.get('SALES_TAX_RATE', '0.0825'))

# JWT setup
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Admin credentials
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

# Create the main app
app = FastAPI(title="Upwash Power Washing API")

# Create routers
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# ===================== MODELS =====================

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "contractor"  # admin, contractor
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict

class ContractorCreate(BaseModel):
    username: str
    password: str
    full_name: str
    phone: str
    email: Optional[str] = None

class RouteCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float = 350.0
    area: Optional[str] = None

class RouteAssignment(BaseModel):
    route_id: str
    contractor_id: str

class TaskCompletion(BaseModel):
    booking_id: str
    completed: bool
    unable_to_complete: bool = False
    reason: Optional[str] = None
    photo_url: Optional[str] = None

class ChatMessage(BaseModel):
    content: str
    recipient_id: Optional[str] = None  # None = admin, specific ID = contractor
    is_group: bool = False
    group_id: Optional[str] = None

class BookingCreate(BaseModel):
    customer_name: str
    customer_email: Optional[EmailStr] = None
    customer_phone: str
    customer_address: str
    distance_miles: float = 0
    services: List[Dict]
    booking_dates: List[str]
    is_monthly: bool = False
    monthly_days: Optional[List[str]] = None
    sms_opt_in: bool = False
    recurring_payment: bool = False
    notes: Optional[str] = None
    quote_description: Optional[str] = None
    quote_photos: Optional[List[str]] = None
    is_scent_bomb_only: bool = False  # For standalone scent bomb orders

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: str
    customer_address: str
    distance_miles: float
    services: List[Dict]
    booking_dates: List[str]
    is_monthly: bool
    monthly_days: Optional[List[str]] = None
    sms_opt_in: bool = False
    recurring_payment: bool = False
    notes: Optional[str] = None
    quote_description: Optional[str] = None
    quote_photos: Optional[List[str]] = None
    subtotal: float
    travel_fee: float
    tax: float
    discount: float
    total: float
    status: str = "pending"
    payment_status: str = "unpaid"
    payment_id: Optional[str] = None
    is_quote_service: bool = False
    is_scent_bomb_only: bool = False
    assigned_contractor_id: Optional[str] = None
    route_id: Optional[str] = None
    task_status: str = "pending"  # pending, in_progress, completed, unable_to_complete
    task_notes: Optional[str] = None
    task_photo: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SquarePaymentRequest(BaseModel):
    source_id: str  # Payment token from Square Web Payments SDK
    booking_id: str
    amount: int  # Amount in cents
    idempotency_key: str

class InvoiceCreate(BaseModel):
    booking_id: str
    customer_email: str
    due_date: str  # YYYY-MM-DD

# ===================== SERVICES DATA =====================

SERVICES = {
    "recycling_bin": {
        "service_id": "recycling_bin",
        "name": "Recycling Bin Cleaning",
        "description": "Professional power washing for recycling bins",
        "base_price": 15.0,
        "pricing_type": "tiered",
        "tier_pricing": {"1": 15.0, "2": 25.0, "additional": 8.0},
        "is_addon": False,
        "bookable_from_home": True
    },
    "patio": {
        "service_id": "patio",
        "name": "Patio Cleaning",
        "description": "Complete patio power washing service",
        "base_price": 85.0,
        "pricing_type": "fixed",
        "is_addon": False,
        "bookable_from_home": True
    },
    "driveway": {
        "service_id": "driveway",
        "name": "Driveway Cleaning",
        "description": "Professional driveway power washing",
        "base_price": 85.0,
        "pricing_type": "fixed",
        "is_addon": False,
        "bookable_from_home": True
    },
    "dumpster": {
        "service_id": "dumpster",
        "name": "Restaurant Dumpster Cleaning",
        "description": "Dumpster and surrounding area cleaning",
        "base_price": 85.0,
        "pricing_type": "tiered",
        "tier_pricing": {"1": 85.0, "additional": 45.0},
        "is_addon": False,
        "bookable_from_home": True
    },
    "scent_bomb": {
        "service_id": "scent_bomb",
        "name": "Scent Bomb",
        "description": "Deodorizing scent treatment - can be purchased standalone or as add-on",
        "base_price": 3.50,
        "pricing_type": "addon",
        "is_addon": True,
        "can_purchase_standalone": True,
        "no_travel_fee": True,
        "bookable_from_home": True
    },
    "home_powerwash": {
        "service_id": "home_powerwash",
        "name": "Home Power Washing",
        "description": "Complete home exterior power washing",
        "base_price": 0.0,
        "pricing_type": "quote",
        "is_addon": False,
        "bookable_from_home": True
    },
    "construction_cleanup": {
        "service_id": "construction_cleanup",
        "name": "Construction Site Cleanup",
        "description": "Post-construction cleaning and debris removal",
        "base_price": 0.0,
        "pricing_type": "quote",
        "is_addon": False,
        "bookable_from_home": True
    }
}

BUSINESS_HOURS = {
    "days": [0, 1, 2, 3, 4],
    "day_names": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
}

SERVICE_AREA = {
    "center": "Burleson, TX",
    "free_radius_miles": 15,
    "per_mile_charge": 1.0
}

MONTHLY_DISCOUNT = 0.05
ROUTE_PRICE = 350.0

BURLESON_COORDS = {"lat": 32.5421, "lng": -97.3208}

# ===================== HELPER FUNCTIONS =====================

def calculate_service_price(service_id: str, quantity: int) -> float:
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
                return tier_pricing["2"] + (quantity - 2) * tier_pricing["additional"]
        elif service_id == "dumpster":
            if quantity == 1:
                return tier_pricing["1"]
            else:
                return tier_pricing["1"] + (quantity - 1) * tier_pricing["additional"]
    
    if service["pricing_type"] == "quote":
        return 0.0
    
    return service["base_price"] * quantity

def calculate_travel_fee(distance_miles: float, is_scent_bomb_only: bool = False) -> float:
    if is_scent_bomb_only:
        return 0.0
    if distance_miles <= SERVICE_AREA["free_radius_miles"]:
        return 0.0
    extra_miles = distance_miles - SERVICE_AREA["free_radius_miles"]
    return extra_miles * SERVICE_AREA["per_mile_charge"]

def calculate_booking_total(services: List[Dict], distance_miles: float, is_monthly: bool, num_service_days: int = 1, is_scent_bomb_only: bool = False) -> Dict:
    subtotal_per_day = 0.0
    
    for service_item in services:
        service_id = service_item.get("service_id")
        quantity = service_item.get("quantity", 1)
        subtotal_per_day += calculate_service_price(service_id, quantity)
    
    subtotal = subtotal_per_day * num_service_days
    travel_fee = calculate_travel_fee(distance_miles, is_scent_bomb_only)
    discount = subtotal * MONTHLY_DISCOUNT if is_monthly else 0.0
    
    # Calculate tax on subtotal after discount
    taxable_amount = subtotal - discount
    tax = round(taxable_amount * SALES_TAX_RATE, 2)
    
    total = subtotal - discount + travel_fee + tax
    
    return {
        "subtotal_per_day": round(subtotal_per_day, 2),
        "subtotal": round(subtotal, 2),
        "travel_fee": round(travel_fee, 2),
        "discount": round(discount, 2),
        "discount_percent": int(MONTHLY_DISCOUNT * 100),
        "tax": tax,
        "tax_rate": SALES_TAX_RATE,
        "total": round(total, 2),
        "num_service_days": num_service_days
    }

def is_weekday(date_str: str) -> bool:
    try:
        date = datetime.strptime(date_str, "%Y-%m-%d")
        return date.weekday() in BUSINESS_HOURS["days"]
    except ValueError:
        return False

# ===================== AUTH FUNCTIONS =====================

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=JWT_EXPIRATION_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        role = payload.get("role")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"user_id": user_id, "role": role, "username": payload.get("username")}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

async def get_contractor_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ["contractor", "admin"]:
        raise HTTPException(status_code=403, detail="Contractor access required")
    return current_user

# ===================== DISTANCE CALCULATION =====================

def geocode_address(address: str) -> Dict:
    if not google_maps_api_key:
        return None
    try:
        url = 'https://maps.googleapis.com/maps/api/geocode/json'
        params = {'address': address, 'key': google_maps_api_key}
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        if data.get('status') == 'OK' and data.get('results'):
            location = data['results'][0]['geometry']['location']
            return {"lat": location['lat'], "lng": location['lng']}
    except Exception as e:
        logging.warning(f"Geocoding failed: {e}")
    return None

def calculate_distance_from_address(customer_address: str) -> Dict:
    if not google_maps_api_key:
        return {"success": False, "error": "Distance calculation not configured", "distance_miles": 0}
    
    customer_coords = geocode_address(customer_address)
    
    try:
        routes_url = 'https://routes.googleapis.com/directions/v2:computeRoutes'
        headers = {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': google_maps_api_key,
            'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration'
        }
        body = {
            "origin": {"address": customer_address},
            "destination": {"address": burleson_address},
            "travelMode": "DRIVE"
        }
        
        response = requests.post(routes_url, headers=headers, json=body, timeout=10)
        data = response.json()
        
        if 'routes' in data and len(data['routes']) > 0:
            route = data['routes'][0]
            distance_meters = route.get('distanceMeters', 0)
            duration_str = route.get('duration', '0s')
            
            duration_seconds = int(duration_str.replace('s', ''))
            if duration_seconds >= 3600:
                hours = duration_seconds // 3600
                mins = (duration_seconds % 3600) // 60
                duration_text = f"{hours} hr {mins} min" if mins else f"{hours} hr"
            else:
                duration_text = f"{duration_seconds // 60} min"
            
            distance_miles = distance_meters / 1609.34
            distance_text = f"{distance_miles:.1f} mi"
            travel_fee = calculate_travel_fee(distance_miles)
            
            return {
                "success": True,
                "distance_miles": round(distance_miles, 1),
                "distance_text": distance_text,
                "duration_text": duration_text,
                "travel_fee": round(travel_fee, 2),
                "free_radius": SERVICE_AREA["free_radius_miles"],
                "is_within_free_radius": distance_miles <= SERVICE_AREA["free_radius_miles"],
                "customer_coords": customer_coords,
                "burleson_coords": BURLESON_COORDS
            }
    except Exception as e:
        logging.warning(f"Routes API failed: {e}")
    
    return {"success": False, "error": "Could not calculate distance", "distance_miles": 0}

def optimize_route(addresses: List[str]) -> List[Dict]:
    """Optimize route for multiple addresses using Google Maps"""
    if not google_maps_api_key or len(addresses) < 2:
        return [{"address": addr, "order": i} for i, addr in enumerate(addresses)]
    
    try:
        # Use Directions API with waypoints optimization
        origin = burleson_address
        waypoints = "|".join(addresses)
        
        url = f"https://maps.googleapis.com/maps/api/directions/json"
        params = {
            "origin": origin,
            "destination": origin,  # Return to start
            "waypoints": f"optimize:true|{waypoints}",
            "key": google_maps_api_key
        }
        
        response = requests.get(url, params=params, timeout=30)
        data = response.json()
        
        if data.get("status") == "OK":
            optimized_order = data["routes"][0]["waypoint_order"]
            return [{"address": addresses[i], "order": idx, "original_index": i} 
                    for idx, i in enumerate(optimized_order)]
    except Exception as e:
        logging.error(f"Route optimization failed: {e}")
    
    return [{"address": addr, "order": i} for i, addr in enumerate(addresses)]

# ===================== SQUARE PAYMENT FUNCTIONS =====================

def process_square_payment(source_id: str, amount_cents: int, idempotency_key: str, customer_email: str = None) -> Dict:
    """Process payment using Square Payments API"""
    if not square_client:
        return {"success": False, "error": "Square not configured"}
    
    try:
        response = square_client.payments.create(
            source_id=source_id,
            idempotency_key=idempotency_key,
            amount_money={
                "amount": amount_cents,
                "currency": "USD"
            },
            location_id=square_location_id,
            autocomplete=True
        )
        
        if response.payment:
            payment = response.payment
            return {
                "success": True,
                "payment_id": payment.id,
                "status": payment.status,
                "receipt_url": payment.receipt_url
            }
        else:
            error_msg = "Payment failed"
            if hasattr(response, 'errors') and response.errors:
                error_msg = response.errors[0].detail if hasattr(response.errors[0], 'detail') else str(response.errors[0])
            return {"success": False, "error": error_msg}
            
    except Exception as e:
        logging.error(f"Square payment error: {e}")
        return {"success": False, "error": str(e)}

def create_square_invoice(customer_id: str, amount_cents: int, due_date: str, description: str) -> Dict:
    """Create and send invoice via Square"""
    if not square_client:
        return {"success": False, "error": "Square not configured"}
    
    try:
        # Create order first
        order_response = square_client.orders.create(
            location_id=square_location_id,
            idempotency_key=str(uuid.uuid4()),
            order={
                "location_id": square_location_id,
                "line_items": [{
                    "name": description,
                    "quantity": "1",
                    "base_price_money": {
                        "amount": amount_cents,
                        "currency": "USD"
                    }
                }]
            }
        )
        
        if not order_response.order:
            return {"success": False, "error": "Failed to create order"}
        
        order_id = order_response.order.id
        
        # Create invoice
        invoice_response = square_client.invoices.create(
            idempotency_key=str(uuid.uuid4()),
            invoice={
                "location_id": square_location_id,
                "order_id": order_id,
                "primary_recipient": {
                    "customer_id": customer_id
                },
                "payment_requests": [{
                    "request_type": "BALANCE",
                    "due_date": due_date
                }],
                "delivery_method": "EMAIL",
                "accepted_payment_methods": {
                    "card": True,
                    "square_gift_card": False,
                    "bank_account": True
                }
            }
        )
        
        if invoice_response.invoice:
            invoice = invoice_response.invoice
            
            # Publish invoice
            publish_response = square_client.invoices.publish(
                invoice_id=invoice.id,
                version=invoice.version,
                idempotency_key=str(uuid.uuid4())
            )
            
            if publish_response.invoice:
                return {
                    "success": True,
                    "invoice_id": invoice.id,
                    "public_url": publish_response.invoice.public_url
                }
        
        return {"success": False, "error": "Failed to create invoice"}
        
    except Exception as e:
        logging.error(f"Square invoice error: {e}")
        return {"success": False, "error": str(e)}

# ===================== API ROUTES =====================

@api_router.get("/")
async def root():
    return {"message": "Upwash Power Washing API", "version": "2.0"}

@api_router.get("/services")
async def get_services():
    return {
        "services": list(SERVICES.values()),
        "service_area": SERVICE_AREA,
        "business_hours": BUSINESS_HOURS,
        "monthly_discount": MONTHLY_DISCOUNT,
        "tax_rate": SALES_TAX_RATE
    }

@api_router.post("/calculate-price")
async def calculate_price(request: Dict):
    services = request.get("services", [])
    distance_miles = request.get("distance_miles", 0)
    is_monthly = request.get("is_monthly", False)
    num_service_days = request.get("num_service_days", 1)
    is_scent_bomb_only = request.get("is_scent_bomb_only", False)
    
    # Check if only scent bombs
    if not is_scent_bomb_only:
        is_scent_bomb_only = all(s.get("service_id") == "scent_bomb" for s in services)
    
    pricing = calculate_booking_total(services, distance_miles, is_monthly, num_service_days, is_scent_bomb_only)
    return pricing

@api_router.post("/calculate-distance")
async def calculate_distance(request: Dict):
    address = request.get("address", "")
    if not address:
        raise HTTPException(status_code=400, detail="Address is required")
    return calculate_distance_from_address(address)

# ===================== AUTH ROUTES =====================

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    # Check for admin login
    if credentials.username == ADMIN_USERNAME and credentials.password == ADMIN_PASSWORD:
        token = create_access_token({
            "sub": "admin",
            "username": ADMIN_USERNAME,
            "role": "admin"
        })
        return TokenResponse(
            access_token=token,
            user={"id": "admin", "username": ADMIN_USERNAME, "role": "admin", "full_name": "Administrator"}
        )
    
    # Check for contractor login
    user = await db.users.find_one({"username": credentials.username}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({
        "sub": user["id"],
        "username": user["username"],
        "role": user["role"]
    })
    
    # Don't return password hash
    user_response = {k: v for k, v in user.items() if k != "password_hash"}
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "admin":
        return {"id": "admin", "username": ADMIN_USERNAME, "role": "admin", "full_name": "Administrator"}
    
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ===================== BOOKING ROUTES =====================

@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking_data: BookingCreate):
    # Check if scent bomb only order
    is_scent_bomb_only = booking_data.is_scent_bomb_only or all(
        s.get("service_id") == "scent_bomb" for s in booking_data.services
    )
    
    # Validate dates for non-scent-bomb orders
    if not is_scent_bomb_only:
        for date_str in booking_data.booking_dates:
            if not is_weekday(date_str):
                raise HTTPException(status_code=400, detail=f"Date {date_str} is not a weekday")
    
    num_days = len(booking_data.booking_dates) if booking_data.booking_dates else 1
    pricing = calculate_booking_total(
        booking_data.services,
        booking_data.distance_miles,
        booking_data.is_monthly,
        num_days,
        is_scent_bomb_only
    )
    
    is_quote_service = any(
        SERVICES.get(s.get("service_id", ""), {}).get("pricing_type") == "quote"
        for s in booking_data.services
    )
    
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
        recurring_payment=booking_data.recurring_payment,
        notes=booking_data.notes,
        quote_description=booking_data.quote_description,
        quote_photos=booking_data.quote_photos,
        subtotal=pricing["subtotal"],
        travel_fee=pricing["travel_fee"],
        tax=pricing["tax"],
        discount=pricing["discount"],
        total=pricing["total"],
        is_quote_service=is_quote_service,
        is_scent_bomb_only=is_scent_bomb_only
    )
    
    doc = booking.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.bookings.insert_one(doc)
    
    return booking

@api_router.get("/bookings/{booking_id}")
async def get_booking(booking_id: str):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking

@api_router.get("/bookings")
async def list_bookings(status: Optional[str] = None, date: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    if date:
        query["booking_dates"] = date
    
    bookings = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return {"bookings": bookings}

# ===================== PAYMENT ROUTES =====================

@api_router.post("/payments/process")
async def process_payment(payment_req: SquarePaymentRequest):
    booking = await db.bookings.find_one({"id": payment_req.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Booking already paid")
    
    # Process payment
    result = process_square_payment(
        source_id=payment_req.source_id,
        amount_cents=payment_req.amount,
        idempotency_key=payment_req.idempotency_key,
        customer_email=booking.get("customer_email")
    )
    
    if result["success"]:
        await db.bookings.update_one(
            {"id": payment_req.booking_id},
            {"$set": {
                "payment_status": "paid",
                "payment_id": result["payment_id"],
                "status": "confirmed",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {
            "success": True,
            "payment_id": result["payment_id"],
            "receipt_url": result.get("receipt_url")
        }
    else:
        raise HTTPException(status_code=400, detail=result.get("error", "Payment failed"))

@api_router.get("/payments/config")
async def get_payment_config():
    return {
        "app_id": square_app_id,
        "location_id": square_location_id,
        "environment": square_environment
    }

# ===================== ADMIN ROUTES =====================

@api_router.get("/admin/stats")
async def admin_stats(current_user: dict = Depends(get_admin_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    total = await db.bookings.count_documents({})
    pending = await db.bookings.count_documents({"status": "pending"})
    confirmed = await db.bookings.count_documents({"status": "confirmed"})
    completed = await db.bookings.count_documents({"status": "completed"})
    
    # Scent bomb orders
    scent_bomb_orders = await db.bookings.count_documents({"is_scent_bomb_only": True})
    
    # Revenue
    paid_bookings = await db.bookings.find({"payment_status": "paid"}, {"_id": 0, "total": 1}).to_list(1000)
    total_revenue = sum(b.get("total", 0) for b in paid_bookings)
    
    # Contractors
    contractor_count = await db.users.count_documents({"role": "contractor"})
    
    # Routes
    route_count = await db.routes.count_documents({})
    
    return {
        "total_bookings": total,
        "pending": pending,
        "confirmed": confirmed,
        "completed": completed,
        "scent_bomb_orders": scent_bomb_orders,
        "total_revenue": round(total_revenue, 2),
        "contractor_count": contractor_count,
        "route_count": route_count
    }

@api_router.get("/admin/bookings")
async def admin_bookings(
    status: Optional[str] = None,
    is_scent_bomb_only: Optional[bool] = None,
    current_user: dict = Depends(get_admin_user)
):
    query = {}
    if status:
        query["status"] = status
    if is_scent_bomb_only is not None:
        query["is_scent_bomb_only"] = is_scent_bomb_only
    
    bookings = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return {"bookings": bookings}

@api_router.patch("/admin/bookings/{booking_id}/status")
async def update_booking_status(booking_id: str, status: str, current_user: dict = Depends(get_admin_user)):
    valid_statuses = ["pending", "confirmed", "completed", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status")
    
    result = await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return {"message": "Status updated", "booking_id": booking_id, "status": status}

# ===================== CONTRACTOR MANAGEMENT ROUTES =====================

@api_router.post("/admin/contractors")
async def create_contractor(contractor: ContractorCreate, current_user: dict = Depends(get_admin_user)):
    # Check if username exists
    existing = await db.users.find_one({"username": contractor.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user_doc = {
        "id": str(uuid.uuid4()),
        "username": contractor.username,
        "password_hash": hash_password(contractor.password),
        "role": "contractor",
        "full_name": contractor.full_name,
        "phone": contractor.phone,
        "email": contractor.email,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    return {"id": user_doc["id"], "username": contractor.username, "message": "Contractor created"}

@api_router.get("/admin/contractors")
async def list_contractors(current_user: dict = Depends(get_admin_user)):
    contractors = await db.users.find(
        {"role": "contractor"},
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    return {"contractors": contractors}

@api_router.get("/admin/contractors/{contractor_id}")
async def get_contractor(contractor_id: str, current_user: dict = Depends(get_admin_user)):
    contractor = await db.users.find_one(
        {"id": contractor_id, "role": "contractor"},
        {"_id": 0, "password_hash": 0}
    )
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")
    return contractor

@api_router.patch("/admin/contractors/{contractor_id}/password")
async def reset_contractor_password(contractor_id: str, new_password: str, current_user: dict = Depends(get_admin_user)):
    result = await db.users.update_one(
        {"id": contractor_id, "role": "contractor"},
        {"$set": {
            "password_hash": hash_password(new_password),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contractor not found")
    
    return {"message": "Password updated"}

@api_router.delete("/admin/contractors/{contractor_id}")
async def delete_contractor(contractor_id: str, current_user: dict = Depends(get_admin_user)):
    result = await db.users.delete_one({"id": contractor_id, "role": "contractor"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contractor not found")
    return {"message": "Contractor deleted"}

# ===================== ROUTE MANAGEMENT ROUTES =====================

@api_router.post("/admin/routes")
async def create_route(route: RouteCreate, current_user: dict = Depends(get_admin_user)):
    route_doc = {
        "id": str(uuid.uuid4()),
        "name": route.name,
        "description": route.description,
        "price": route.price,
        "area": route.area,
        "assigned_contractor_id": None,
        "bookings": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.routes.insert_one(route_doc)
    return route_doc

@api_router.get("/admin/routes")
async def list_routes(current_user: dict = Depends(get_admin_user)):
    routes = await db.routes.find({}, {"_id": 0}).to_list(100)
    
    # Get contractor names
    for route in routes:
        if route.get("assigned_contractor_id"):
            contractor = await db.users.find_one(
                {"id": route["assigned_contractor_id"]},
                {"_id": 0, "full_name": 1}
            )
            route["assigned_contractor_name"] = contractor.get("full_name") if contractor else None
    
    return {"routes": routes}

@api_router.post("/admin/routes/{route_id}/assign")
async def assign_route(route_id: str, assignment: RouteAssignment, current_user: dict = Depends(get_admin_user)):
    result = await db.routes.update_one(
        {"id": route_id},
        {"$set": {"assigned_contractor_id": assignment.contractor_id}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Route not found")
    
    return {"message": "Route assigned"}

@api_router.post("/admin/routes/{route_id}/bookings")
async def add_bookings_to_route(route_id: str, booking_ids: List[str], current_user: dict = Depends(get_admin_user)):
    result = await db.routes.update_one(
        {"id": route_id},
        {"$addToSet": {"bookings": {"$each": booking_ids}}}
    )
    
    # Update bookings with route_id
    await db.bookings.update_many(
        {"id": {"$in": booking_ids}},
        {"$set": {"route_id": route_id}}
    )
    
    return {"message": "Bookings added to route"}

# ===================== CLIENT MANAGEMENT ROUTES =====================

@api_router.get("/admin/clients")
async def list_clients(current_user: dict = Depends(get_admin_user)):
    # Get unique clients from bookings
    pipeline = [
        {"$group": {
            "_id": "$customer_phone",
            "customer_name": {"$first": "$customer_name"},
            "customer_email": {"$first": "$customer_email"},
            "customer_phone": {"$first": "$customer_phone"},
            "customer_address": {"$first": "$customer_address"},
            "total_bookings": {"$sum": 1},
            "total_spent": {"$sum": "$total"},
            "last_booking": {"$max": "$created_at"}
        }},
        {"$sort": {"last_booking": -1}}
    ]
    
    clients = await db.bookings.aggregate(pipeline).to_list(1000)
    return {"clients": clients}

@api_router.get("/admin/clients/{phone}")
async def get_client(phone: str, current_user: dict = Depends(get_admin_user)):
    bookings = await db.bookings.find(
        {"customer_phone": phone},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    if not bookings:
        raise HTTPException(status_code=404, detail="Client not found")
    
    client = {
        "customer_name": bookings[0].get("customer_name"),
        "customer_email": bookings[0].get("customer_email"),
        "customer_phone": phone,
        "customer_address": bookings[0].get("customer_address"),
        "bookings": bookings,
        "total_spent": sum(b.get("total", 0) for b in bookings if b.get("payment_status") == "paid")
    }
    
    return client

# ===================== INVOICE ROUTES =====================

@api_router.post("/admin/invoices")
async def create_invoice(invoice_req: InvoiceCreate, current_user: dict = Depends(get_admin_user)):
    booking = await db.bookings.find_one({"id": invoice_req.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # For Square invoices, we need a customer ID
    # First check if customer exists or create one
    if not square_client:
        raise HTTPException(status_code=500, detail="Square not configured")
    
    try:
        # Search for existing customer
        search_result = square_client.customers.search_customers(body={
            "query": {
                "filter": {
                    "email_address": {"exact": invoice_req.customer_email}
                }
            }
        })
        
        if search_result.is_success() and search_result.body.get("customers"):
            customer_id = search_result.body["customers"][0]["id"]
        else:
            # Create customer
            create_result = square_client.customers.create_customer(body={
                "email_address": invoice_req.customer_email,
                "given_name": booking.get("customer_name", "").split()[0],
                "phone_number": booking.get("customer_phone")
            })
            
            if create_result.is_success():
                customer_id = create_result.body["customer"]["id"]
            else:
                raise HTTPException(status_code=500, detail="Failed to create customer")
        
        # Create invoice
        amount_cents = int(booking["total"] * 100)
        result = create_square_invoice(
            customer_id=customer_id,
            amount_cents=amount_cents,
            due_date=invoice_req.due_date,
            description=f"Upwash Power Washing - Booking #{invoice_req.booking_id[:8]}"
        )
        
        if result["success"]:
            # Update booking
            await db.bookings.update_one(
                {"id": invoice_req.booking_id},
                {"$set": {
                    "invoice_id": result["invoice_id"],
                    "invoice_url": result.get("public_url"),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            return result
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Failed to create invoice"))
            
    except Exception as e:
        logging.error(f"Invoice creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===================== CONTRACTOR PORTAL ROUTES =====================

@api_router.get("/contractor/profile")
async def contractor_profile(current_user: dict = Depends(get_contractor_user)):
    if current_user["role"] == "admin":
        return {"id": "admin", "role": "admin", "full_name": "Administrator"}
    
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.get("/contractor/routes")
async def contractor_routes(current_user: dict = Depends(get_contractor_user)):
    routes = await db.routes.find(
        {"assigned_contractor_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    return {"routes": routes}

@api_router.get("/contractor/today")
async def contractor_today_tasks(current_user: dict = Depends(get_contractor_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Get contractor's routes
    routes = await db.routes.find(
        {"assigned_contractor_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    
    route_ids = [r["id"] for r in routes]
    
    # Get today's bookings for those routes
    bookings = await db.bookings.find({
        "route_id": {"$in": route_ids},
        "booking_dates": today,
        "status": {"$in": ["confirmed", "pending"]}
    }, {"_id": 0}).to_list(200)
    
    # Optimize route
    if bookings:
        addresses = [b["customer_address"] for b in bookings]
        optimized = optimize_route(addresses)
        
        # Reorder bookings based on optimization
        address_to_order = {o["address"]: o["order"] for o in optimized}
        bookings.sort(key=lambda b: address_to_order.get(b["customer_address"], 999))
    
    return {
        "date": today,
        "bookings": bookings,
        "total_stops": len(bookings)
    }

@api_router.post("/contractor/task/{booking_id}/complete")
async def complete_task(booking_id: str, completion: TaskCompletion, current_user: dict = Depends(get_contractor_user)):
    update_data = {
        "task_status": "completed" if completion.completed else "unable_to_complete",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if completion.unable_to_complete:
        if not completion.reason:
            raise HTTPException(status_code=400, detail="Reason is required when unable to complete")
        if not completion.photo_url:
            raise HTTPException(status_code=400, detail="Photo is required when unable to complete")
        
        update_data["task_notes"] = completion.reason
        update_data["task_photo"] = completion.photo_url
        update_data["task_status"] = "unable_to_complete"
    else:
        update_data["status"] = "completed"
    
    result = await db.bookings.update_one(
        {"id": booking_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return {"message": "Task updated", "status": update_data["task_status"]}

@api_router.post("/contractor/routes/purchase")
async def purchase_route(route_id: str, payment_token: str, current_user: dict = Depends(get_contractor_user)):
    route = await db.routes.find_one({"id": route_id}, {"_id": 0})
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    # Calculate price with tax
    price = route.get("price", ROUTE_PRICE)
    tax = round(price * SALES_TAX_RATE, 2)
    total = price + tax
    amount_cents = int(total * 100)
    
    # Process payment
    result = process_square_payment(
        source_id=payment_token,
        amount_cents=amount_cents,
        idempotency_key=f"route-{route_id}-{current_user['user_id']}-{datetime.now().timestamp()}"
    )
    
    if result["success"]:
        # Record purchase
        purchase_doc = {
            "id": str(uuid.uuid4()),
            "route_id": route_id,
            "contractor_id": current_user["user_id"],
            "price": price,
            "tax": tax,
            "total": total,
            "payment_id": result["payment_id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.route_purchases.insert_one(purchase_doc)
        
        # Assign route to contractor
        await db.routes.update_one(
            {"id": route_id},
            {"$set": {"assigned_contractor_id": current_user["user_id"]}}
        )
        
        return {"success": True, "message": "Route purchased", "total": total}
    else:
        raise HTTPException(status_code=400, detail=result.get("error", "Payment failed"))

# ===================== CHAT ROUTES =====================

@api_router.get("/contractor/nearby")
async def get_nearby_contractors(current_user: dict = Depends(get_contractor_user)):
    """Get list of other contractors with their current locations"""
    contractors = await db.users.find(
        {"role": "contractor", "id": {"$ne": current_user["user_id"]}},
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    
    # Get their last known locations
    for contractor in contractors:
        location = await db.contractor_locations.find_one(
            {"contractor_id": contractor["id"]},
            {"_id": 0}
        )
        if location:
            contractor["last_location"] = location
    
    return {"contractors": contractors}

@api_router.post("/contractor/location")
async def update_location(lat: float, lng: float, current_user: dict = Depends(get_contractor_user)):
    await db.contractor_locations.update_one(
        {"contractor_id": current_user["user_id"]},
        {"$set": {
            "contractor_id": current_user["user_id"],
            "lat": lat,
            "lng": lng,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": "Location updated"}

@api_router.post("/chat/send")
async def send_chat_message(message: ChatMessage, current_user: dict = Depends(get_current_user)):
    chat_doc = {
        "id": str(uuid.uuid4()),
        "sender_id": current_user["user_id"],
        "sender_name": current_user.get("username", "Unknown"),
        "recipient_id": message.recipient_id,
        "content": message.content,
        "is_group": message.is_group,
        "group_id": message.group_id,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.chat_messages.insert_one(chat_doc)
    return {"message_id": chat_doc["id"], "sent": True}

@api_router.get("/chat/messages")
async def get_chat_messages(
    recipient_id: Optional[str] = None,
    group_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if group_id:
        query["group_id"] = group_id
    elif recipient_id:
        # Get direct messages between current user and recipient
        query["$or"] = [
            {"sender_id": current_user["user_id"], "recipient_id": recipient_id},
            {"sender_id": recipient_id, "recipient_id": current_user["user_id"]}
        ]
    else:
        # Get messages to/from admin if current user is contractor
        if current_user["role"] == "contractor":
            query["$or"] = [
                {"sender_id": current_user["user_id"], "recipient_id": None},
                {"recipient_id": current_user["user_id"]}
            ]
        else:
            # Admin sees all messages to admin
            query["recipient_id"] = None
    
    messages = await db.chat_messages.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"messages": messages}

@api_router.post("/chat/groups")
async def create_chat_group(name: str, member_ids: List[str], current_user: dict = Depends(get_current_user)):
    group_doc = {
        "id": str(uuid.uuid4()),
        "name": name,
        "creator_id": current_user["user_id"],
        "member_ids": member_ids + [current_user["user_id"]],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.chat_groups.insert_one(group_doc)
    return {"group_id": group_doc["id"], "name": name}

@api_router.get("/chat/groups")
async def get_chat_groups(current_user: dict = Depends(get_current_user)):
    groups = await db.chat_groups.find(
        {"member_ids": current_user["user_id"]},
        {"_id": 0}
    ).to_list(50)
    return {"groups": groups}

# ===================== SMS NOTIFICATION ROUTES =====================

@api_router.post("/admin/notify-clients")
async def notify_clients_for_route(route_id: str, current_user: dict = Depends(get_admin_user)):
    """Send SMS notifications to all clients on a route"""
    route = await db.routes.find_one({"id": route_id}, {"_id": 0})
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    booking_ids = route.get("bookings", [])
    bookings = await db.bookings.find(
        {"id": {"$in": booking_ids}, "sms_opt_in": True},
        {"_id": 0, "customer_phone": 1, "customer_name": 1}
    ).to_list(200)
    
    # In production, integrate with Twilio here
    notified = len(bookings)
    
    return {
        "message": f"Notifications queued for {notified} clients",
        "notification_text": "We will be servicing your home soon, please be sure to set your bin to the curb!"
    }

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
