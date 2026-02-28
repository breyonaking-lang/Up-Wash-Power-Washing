from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, WebSocket, WebSocketDisconnect, Header, UploadFile, File, Form
from fastapi.responses import RedirectResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import json
import shutil
import base64
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import requests
from square import Square
import bcrypt
import math

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

# Twilio SMS setup
twilio_account_sid = os.environ.get('TWILIO_ACCOUNT_SID', '')
twilio_auth_token = os.environ.get('TWILIO_AUTH_TOKEN', '')
twilio_phone_number = os.environ.get('TWILIO_PHONE_NUMBER', '')

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

# Default contractor pay rate (can be modified by admin)
DEFAULT_CONTRACTOR_PAY_PER_STOP = 11.0  # $11 per stop

# Truck rental prices
TRUCK_RENTAL_PRICES = {
    "small": 75.0,  # $75/week
    "large": 125.0  # $125/week
}

# Create the main app
app = FastAPI(title="Upwash Power Washing API")

# Create uploads directory for photo storage
UPLOAD_DIR = Path(__file__).parent / "uploads" / "photos"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Mount static files for serving uploaded photos
app.mount("/uploads", StaticFiles(directory=str(Path(__file__).parent / "uploads")), name="uploads")

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
    monthly_service_days: Optional[List[int]] = None  # Days of month (1-31)
    service_days_per_month: Optional[int] = None  # How many days per month
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
    monthly_service_days: Optional[List[int]] = None  # Days of month (1-31)
    service_days_per_month: Optional[int] = None  # How many days per month
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
    subscription_status: str = "active"  # active, payment_failed, cancelled
    next_payment_date: Optional[str] = None
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
    },
    "commercial": {
        "service_id": "commercial",
        "name": "Commercial Properties",
        "description": "Power washing for schools, apartments, and commercial buildings",
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

async def get_client_user(authorization: str = Header(None)):
    """Get current client from token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        if payload.get("role") != "client":
            raise HTTPException(status_code=403, detail="Not a client")
        return {"client_id": payload["sub"], "email": payload["email"]}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

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
        
        url = "https://maps.googleapis.com/maps/api/directions/json"
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

# ===================== PHOTO UPLOAD SYSTEM =====================

@api_router.post("/upload/photo")
async def upload_photo(file: UploadFile = File(...), photo_type: str = Form("cns")):
    """Upload a photo and return the URL"""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Generate unique filename
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    unique_filename = f"{photo_type}_{uuid.uuid4()}.{file_ext}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Return URL relative to API
        photo_url = f"/uploads/photos/{unique_filename}"
        return {"success": True, "photo_url": photo_url, "filename": unique_filename}
    except Exception as e:
        logging.error(f"Photo upload error: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload photo")

@api_router.post("/upload/photo-base64")
async def upload_photo_base64(request: Dict):
    """Upload a photo from base64 data"""
    base64_data = request.get("data", "")
    photo_type = request.get("type", "cns")
    
    if not base64_data:
        raise HTTPException(status_code=400, detail="No image data provided")
    
    # Remove data URL prefix if present
    if "," in base64_data:
        base64_data = base64_data.split(",")[1]
    
    try:
        image_data = base64.b64decode(base64_data)
        unique_filename = f"{photo_type}_{uuid.uuid4()}.jpg"
        file_path = UPLOAD_DIR / unique_filename
        
        with open(file_path, "wb") as f:
            f.write(image_data)
        
        photo_url = f"/uploads/photos/{unique_filename}"
        return {"success": True, "photo_url": photo_url, "filename": unique_filename}
    except Exception as e:
        logging.error(f"Base64 photo upload error: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload photo")

# ===================== COMPREHENSIVE ADMIN NOTIFICATIONS =====================

@api_router.get("/admin/notifications")
async def get_admin_notifications(current_user: dict = Depends(get_admin_user)):
    """Get all admin notifications with counts"""
    notifications = await db.admin_notifications.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    unread_count = len([n for n in notifications if not n.get("read")])
    
    # Get counts for different notification types
    new_bookings = len([n for n in notifications if n.get("type") == "new_route_booking" and not n.get("read")])
    scent_bombs = len([n for n in notifications if n.get("type") == "scent_bomb_order" and not n.get("read")])
    route_releases = len([n for n in notifications if n.get("type") == "route_released" and not n.get("read")])
    messages = len([n for n in notifications if n.get("type") in ["message", "contractor_message"] and not n.get("read")])
    cns_stops = len([n for n in notifications if n.get("type") == "cns_stop" and not n.get("read")])
    
    return {
        "notifications": notifications,
        "unread_count": unread_count,
        "counts": {
            "new_bookings": new_bookings,
            "scent_bombs": scent_bombs,
            "route_releases": route_releases,
            "messages": messages,
            "cns_stops": cns_stops
        }
    }

@api_router.patch("/admin/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, current_user: dict = Depends(get_admin_user)):
    """Mark a notification as read"""
    await db.admin_notifications.update_one(
        {"id": notif_id},
        {"$set": {"read": True}}
    )
    return {"message": "Notification marked as read"}

@api_router.patch("/admin/notifications/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_admin_user)):
    """Mark all notifications as read"""
    await db.admin_notifications.update_many(
        {"read": False},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}

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
    
    num_days = booking_data.service_days_per_month if booking_data.is_monthly and booking_data.service_days_per_month else (len(booking_data.booking_dates) if booking_data.booking_dates else 1)
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
    
    # Calculate next payment date for subscriptions (3 days before next service)
    next_payment_date = None
    if booking_data.is_monthly and booking_data.monthly_service_days:
        # Find the next service day
        today = datetime.now(timezone.utc)
        for day in sorted(booking_data.monthly_service_days):
            # Try this month
            try:
                next_service = today.replace(day=day)
                if next_service > today:
                    next_payment_date = (next_service - timedelta(days=3)).strftime("%Y-%m-%d")
                    break
            except ValueError:
                continue
        
        # If no day found this month, use first day next month
        if not next_payment_date and booking_data.monthly_service_days:
            first_day = min(booking_data.monthly_service_days)
            next_month = today.replace(day=1) + timedelta(days=32)
            next_month = next_month.replace(day=first_day)
            next_payment_date = (next_month - timedelta(days=3)).strftime("%Y-%m-%d")
    
    booking = Booking(
        customer_name=booking_data.customer_name,
        customer_email=booking_data.customer_email,
        customer_phone=booking_data.customer_phone,
        customer_address=booking_data.customer_address,
        distance_miles=booking_data.distance_miles,
        services=booking_data.services,
        booking_dates=booking_data.booking_dates,
        is_monthly=booking_data.is_monthly,
        monthly_service_days=booking_data.monthly_service_days,
        service_days_per_month=booking_data.service_days_per_month,
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
        is_scent_bomb_only=is_scent_bomb_only,
        next_payment_date=next_payment_date
    )
    
    doc = booking.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.bookings.insert_one(doc)
    
    # Create admin notification for scent bomb orders
    if is_scent_bomb_only:
        scent_notif = {
            "id": str(uuid.uuid4()),
            "type": "scent_bomb_order",
            "title": "New Scent Bomb Order!",
            "message": f"{booking.customer_name} ordered scent bombs. Total: ${booking.total:.2f}",
            "booking_id": booking.id,
            "read": False,
            "play_sound": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.admin_notifications.insert_one(scent_notif)
    
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

# ===================== ADMIN BOOKING CREATION =====================

class AdminBookingCreate(BaseModel):
    customer_name: str
    customer_email: str
    customer_phone: str
    customer_address: str
    customer_city: str = ""
    customer_state: str = "TX"
    customer_zip: str
    services: List[str]
    booking_dates: List[str]
    is_monthly: bool = False
    notes: str = ""
    payment_status: str = "unpaid"  # unpaid, paid, waived
    total_override: Optional[float] = None

@api_router.post("/admin/bookings/create")
async def admin_create_booking(booking: AdminBookingCreate, current_user: dict = Depends(get_admin_user)):
    """Create a booking manually from admin portal"""
    services_data = await get_services()
    sales_tax = await get_sales_tax()
    
    # Calculate totals
    subtotal = 0.0
    for service_id in booking.services:
        if service_id in services_data:
            service = services_data[service_id]
            if not service.get("is_quote"):
                subtotal += service.get("price", 0)
    
    # Apply monthly discount
    if booking.is_monthly:
        subtotal *= 0.95  # 5% discount
    
    # Calculate tax
    tax_amount = subtotal * sales_tax
    total = booking.total_override if booking.total_override is not None else subtotal + tax_amount
    
    # Create booking
    booking_id = str(uuid.uuid4())
    new_booking = {
        "id": booking_id,
        "customer_name": booking.customer_name,
        "customer_email": booking.customer_email,
        "customer_phone": booking.customer_phone,
        "customer_address": booking.customer_address,
        "customer_city": booking.customer_city,
        "customer_state": booking.customer_state,
        "customer_zip": booking.customer_zip,
        "services": booking.services,
        "booking_dates": booking.booking_dates,
        "is_monthly": booking.is_monthly,
        "subtotal": subtotal,
        "tax": tax_amount,
        "total": total,
        "payment_status": booking.payment_status,
        "status": "confirmed",
        "notes": booking.notes,
        "created_by": "admin",
        "admin_id": current_user.get("sub"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.bookings.insert_one(new_booking)
    
    # Create admin notification
    notif = {
        "id": str(uuid.uuid4()),
        "type": "admin_booking_created",
        "title": "Booking Created by Admin",
        "message": f"New booking for {booking.customer_name} created manually",
        "booking_id": booking_id,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admin_notifications.insert_one(notif)
    
    # Exclude _id from response
    new_booking.pop("_id", None)
    
    return {"message": "Booking created successfully", "booking": new_booking}

# ===================== ENHANCED CLIENTS LIST =====================

@api_router.get("/admin/clients/all")
async def list_all_clients(current_user: dict = Depends(get_admin_user)):
    """Get all clients from bookings and registered clients"""
    
    # Get clients from bookings
    pipeline = [
        {"$group": {
            "_id": "$customer_phone",
            "customer_name": {"$first": "$customer_name"},
            "customer_email": {"$first": "$customer_email"},
            "customer_phone": {"$first": "$customer_phone"},
            "address": {"$first": "$customer_address"},
            "city": {"$first": "$customer_city"},
            "state": {"$first": "$customer_state"},
            "zip": {"$first": "$customer_zip"},
            "total_bookings": {"$sum": 1},
            "total_spent": {"$sum": {"$cond": [{"$eq": ["$payment_status", "paid"]}, "$total", 0]}},
            "last_booking": {"$max": "$created_at"},
            "is_monthly": {"$max": {"$cond": ["$is_monthly", 1, 0]}}
        }},
        {"$sort": {"last_booking": -1}}
    ]
    
    booking_clients = await db.bookings.aggregate(pipeline).to_list(1000)
    
    # Get registered client portal users
    registered_clients = await db.clients.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    
    # Merge registered clients with booking data
    phone_map = {c["_id"]: c for c in booking_clients if c.get("_id")}
    
    all_clients = []
    seen_phones = set()
    
    # Add booking clients with enriched data
    for client in booking_clients:
        phone = client.get("_id") or client.get("customer_phone")
        if phone and phone not in seen_phones:
            seen_phones.add(phone)
            all_clients.append({
                "id": phone,
                "name": client.get("customer_name", ""),
                "email": client.get("customer_email", ""),
                "phone": phone,
                "address": client.get("address", ""),
                "city": client.get("city", ""),
                "state": client.get("state", "TX"),
                "zip": client.get("zip", ""),
                "total_bookings": client.get("total_bookings", 0),
                "total_spent": client.get("total_spent", 0),
                "last_booking": client.get("last_booking"),
                "is_subscriber": client.get("is_monthly", 0) == 1,
                "has_portal_account": False
            })
    
    # Add registered clients that don't have bookings
    for client in registered_clients:
        phone = client.get("phone", "")
        if phone and phone not in seen_phones:
            seen_phones.add(phone)
            all_clients.append({
                "id": client.get("id", phone),
                "name": client.get("name", ""),
                "email": client.get("email", ""),
                "phone": phone,
                "address": client.get("address", ""),
                "city": client.get("city", ""),
                "state": client.get("state", "TX"),
                "zip": client.get("zip", ""),
                "total_bookings": 0,
                "total_spent": 0,
                "last_booking": None,
                "is_subscriber": False,
                "has_portal_account": True
            })
        elif phone in seen_phones:
            # Update existing entry to mark as having portal account
            for c in all_clients:
                if c.get("phone") == phone:
                    c["has_portal_account"] = True
                    break
    
    return {"clients": all_clients, "total": len(all_clients)}

# ===================== BOOKING PRICE MODIFICATION =====================

class BookingPriceUpdate(BaseModel):
    subtotal: Optional[float] = None
    travel_fee: Optional[float] = None
    tax: Optional[float] = None
    discount: Optional[float] = None
    total: Optional[float] = None
    price_notes: Optional[str] = None

@api_router.put("/admin/bookings/{booking_id}/price")
async def update_booking_price(booking_id: str, price: BookingPriceUpdate, current_user: dict = Depends(get_admin_user)):
    """Update booking price (for custom quotes, discounts, etc.)"""
    update_data = {k: v for k, v in price.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No price fields to update")
    
    update_data["price_modified_by"] = current_user["user_id"]
    update_data["price_modified_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.bookings.update_one(
        {"id": booking_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return {"message": "Booking price updated"}

class PaymentLinkRequest(BaseModel):
    booking_id: str
    custom_amount: Optional[float] = None
    message: Optional[str] = None

@api_router.post("/admin/bookings/send-payment-link")
async def send_payment_link(req: PaymentLinkRequest, current_user: dict = Depends(get_admin_user)):
    """Send payment link to customer via SMS"""
    booking = await db.bookings.find_one({"id": req.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    phone = booking.get("customer_phone")
    if not phone:
        raise HTTPException(status_code=400, detail="No phone number for customer")
    
    # Check if opted out
    optout = await db.sms_optouts.find_one({"phone": phone, "opted_out": True})
    if optout:
        raise HTTPException(status_code=400, detail="Customer has opted out of SMS")
    
    customer_name = booking.get("customer_name", "Valued Customer")
    amount = req.custom_amount or booking.get("total", 0)
    
    # Generate payment token
    payment_token = str(uuid.uuid4())[:8]
    
    # Store payment link data
    await db.payment_links.insert_one({
        "id": str(uuid.uuid4()),
        "token": payment_token,
        "booking_id": req.booking_id,
        "amount": amount,
        "customer_phone": phone,
        "customer_name": customer_name,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    payment_url = f"https://2d2346dc-8745-4260-8e34-088886d923bd.preview.emergentagent.com/pay/{payment_token}"
    
    custom_message = req.message or f"Your Up-Wash service is ready for payment."
    sms_message = f"Hi {customer_name}! {custom_message}\n\nAmount Due: ${amount:.2f}\n\nPay Now: {payment_url}\n\nReply STOP to opt out."
    
    result = await send_sms(phone, sms_message)
    
    return {
        "message": "Payment link sent",
        "status": result["status"],
        "payment_url": payment_url,
        "amount": amount
    }

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
        
        # Auto-add routable services to pending routes
        routable_services = ["recycling_bin", "patio", "driveway"]
        service_ids = [s.get("service_id") for s in booking.get("services", [])]
        is_routable = any(sid in routable_services for sid in service_ids)
        
        if is_routable and not booking.get("is_scent_bomb_only"):
            # Extract zip code from address
            address = booking.get("customer_address", "")
            zip_code = ""
            import re
            zip_match = re.search(r'\b(\d{5})\b', address)
            if zip_match:
                zip_code = zip_match.group(1)
            
            # Find or create a pending route for this zip code
            existing_route = await db.routes.find_one({
                "zip_code": zip_code,
                "status": "pending",
                "assigned_contractor_id": None,
                "$expr": {"$lt": [{"$size": {"$ifNull": ["$bookings", []]}}, 120]}
            })
            
            if existing_route:
                # Add to existing route
                await db.routes.update_one(
                    {"id": existing_route["id"]},
                    {"$push": {"bookings": payment_req.booking_id}}
                )
            else:
                # Create new pending route
                new_route = {
                    "id": str(uuid.uuid4()),
                    "name": f"Route - {zip_code or 'Unknown'}",
                    "area": zip_code or "Unassigned",
                    "zip_code": zip_code,
                    "description": f"Auto-generated route for zip code {zip_code}",
                    "bookings": [payment_req.booking_id],
                    "status": "pending",
                    "assigned_contractor_id": None,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.routes.insert_one(new_route)
            
            # Create admin notification for new booking in routes
            admin_notif = {
                "id": str(uuid.uuid4()),
                "type": "new_route_booking",
                "title": "New Booking Added to Routes",
                "message": f"Booking from {booking.get('customer_name')} added to route ({zip_code or 'Unknown zip'}). Services: {', '.join(service_ids)}",
                "booking_id": payment_req.booking_id,
                "read": False,
                "play_sound": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.admin_notifications.insert_one(admin_notif)
        
        return {
            "success": True,
            "payment_id": result["payment_id"],
            "receipt_url": result.get("receipt_url")
        }
        
        # Send booking confirmation SMS to customer
        customer_phone = booking.get("customer_phone")
        customer_name = booking.get("customer_name", "Valued Customer")
        if customer_phone:
            service_names = ", ".join([s.get("service_id", "").replace("_", " ").title() for s in booking.get("services", [])])
            booking_dates = booking.get("booking_dates", [])
            dates_str = ", ".join(booking_dates[:3]) + ("..." if len(booking_dates) > 3 else "")
            
            confirmation_msg = f"Hi {customer_name}! Your Up-Wash booking is confirmed. Services: {service_names}. Dates: {dates_str}. Total: ${booking.get('total', 0):.2f}. Thank you for choosing Up-Wash Power Washing! Reply STOP to opt out."
            
            await send_sms(customer_phone, confirmation_msg)
            
            # Store in customer messages
            msg_record = {
                "id": str(uuid.uuid4()),
                "booking_id": payment_req.booking_id,
                "customer_phone": customer_phone,
                "customer_name": customer_name,
                "type": "booking_confirmation",
                "message": confirmation_msg,
                "message_type": "booking_confirmed",
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.customer_messages.insert_one(msg_record)
        
        return {
            "success": True,
            "payment_id": result["payment_id"],
            "receipt_url": result.get("receipt_url"),
            "sms_sent": bool(customer_phone)
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

# ===================== ADMIN SETTINGS =====================

# Default services with prices
DEFAULT_SERVICES = {
    "recycling_bin": {"name": "Recycling Bin Cleaning", "price": 15.00, "is_routable": True},
    "patio": {"name": "Patio Power Washing", "price": 150.00, "is_routable": True},
    "driveway": {"name": "Driveway Power Washing", "price": 175.00, "is_routable": True},
    "dumpster": {"name": "Dumpster Cleaning", "price": 200.00, "is_routable": False},
    "home_powerwash": {"name": "Home Power Washing", "price": 350.00, "is_routable": False},
    "construction": {"name": "Construction Cleanup", "price": 0, "is_quote": True, "is_routable": False},
    "commercial": {"name": "Commercial Services", "price": 0, "is_quote": True, "is_routable": False}
}

DEFAULT_SALES_TAX = 0.0825  # 8.25%

async def get_pay_per_stop():
    """Get current pay per stop from settings or use default"""
    settings = await db.settings.find_one({"key": "pay_per_stop"})
    if settings:
        return float(settings.get("value", DEFAULT_CONTRACTOR_PAY_PER_STOP))
    return DEFAULT_CONTRACTOR_PAY_PER_STOP

async def get_sales_tax():
    """Get current sales tax rate"""
    settings = await db.settings.find_one({"key": "sales_tax"})
    if settings:
        return float(settings.get("value", DEFAULT_SALES_TAX))
    return DEFAULT_SALES_TAX

async def get_services():
    """Get current service prices"""
    settings = await db.settings.find_one({"key": "services"})
    if settings:
        return settings.get("value", DEFAULT_SERVICES)
    return DEFAULT_SERVICES

@api_router.get("/admin/settings")
async def get_admin_settings(current_user: dict = Depends(get_admin_user)):
    """Get all admin settings"""
    pay_per_stop = await get_pay_per_stop()
    sales_tax = await get_sales_tax()
    services = await get_services()
    
    # Get truck rental settings
    truck_settings = await db.settings.find_one({"key": "truck_rentals"})
    truck_prices = truck_settings.get("value") if truck_settings else TRUCK_RENTAL_PRICES
    
    return {
        "pay_per_stop": pay_per_stop,
        "default_pay_per_stop": DEFAULT_CONTRACTOR_PAY_PER_STOP,
        "sales_tax": sales_tax,
        "default_sales_tax": DEFAULT_SALES_TAX,
        "services": services,
        "default_services": DEFAULT_SERVICES,
        "truck_rental_prices": truck_prices
    }

@api_router.get("/services")
async def get_public_services():
    """Get services for public booking page"""
    services = await get_services()
    sales_tax = await get_sales_tax()
    return {"services": services, "sales_tax": sales_tax}

class PayPerStopUpdate(BaseModel):
    pay_per_stop: float

@api_router.patch("/admin/settings/pay-per-stop")
async def update_pay_per_stop(update: PayPerStopUpdate, current_user: dict = Depends(get_admin_user)):
    """Update contractor pay per stop rate"""
    if update.pay_per_stop < 0:
        raise HTTPException(status_code=400, detail="Pay rate cannot be negative")
    
    await db.settings.update_one(
        {"key": "pay_per_stop"},
        {"$set": {
            "key": "pay_per_stop",
            "value": update.pay_per_stop,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": current_user.get("user_id")
        }},
        upsert=True
    )
    
    return {"message": "Pay per stop updated", "new_rate": update.pay_per_stop}

class TruckRentalPricesUpdate(BaseModel):
    small: float
    large: float

@api_router.patch("/admin/settings/truck-rentals")
async def update_truck_rental_prices(update: TruckRentalPricesUpdate, current_user: dict = Depends(get_admin_user)):
    """Update truck rental prices"""
    await db.settings.update_one(
        {"key": "truck_rentals"},
        {"$set": {
            "key": "truck_rentals",
            "value": {"small": update.small, "large": update.large},
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": "Truck rental prices updated", "prices": {"small": update.small, "large": update.large}}

class SalesTaxUpdate(BaseModel):
    sales_tax: float

@api_router.patch("/admin/settings/sales-tax")
async def update_sales_tax(update: SalesTaxUpdate, current_user: dict = Depends(get_admin_user)):
    """Update sales tax rate"""
    if update.sales_tax < 0 or update.sales_tax > 1:
        raise HTTPException(status_code=400, detail="Sales tax must be between 0 and 1 (e.g., 0.0825 for 8.25%)")
    
    await db.settings.update_one(
        {"key": "sales_tax"},
        {"$set": {
            "key": "sales_tax",
            "value": update.sales_tax,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": "Sales tax updated", "new_rate": update.sales_tax}

class ServiceUpdate(BaseModel):
    service_id: str
    name: str
    price: float
    is_routable: bool = False
    is_quote: bool = False

@api_router.patch("/admin/settings/services")
async def update_services(services: List[ServiceUpdate], current_user: dict = Depends(get_admin_user)):
    """Update all service prices"""
    services_dict = {}
    for svc in services:
        services_dict[svc.service_id] = {
            "name": svc.name,
            "price": svc.price,
            "is_routable": svc.is_routable,
            "is_quote": svc.is_quote
        }
    
    await db.settings.update_one(
        {"key": "services"},
        {"$set": {
            "key": "services",
            "value": services_dict,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": "Services updated", "services": services_dict}

@api_router.patch("/admin/settings/service/{service_id}")
async def update_single_service(service_id: str, service: ServiceUpdate, current_user: dict = Depends(get_admin_user)):
    """Update a single service price"""
    services = await get_services()
    services[service_id] = {
        "name": service.name,
        "price": service.price,
        "is_routable": service.is_routable,
        "is_quote": service.is_quote
    }
    
    await db.settings.update_one(
        {"key": "services"},
        {"$set": {
            "key": "services",
            "value": services,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": f"Service {service_id} updated"}

# ===================== PAY STUBS =====================

@api_router.get("/admin/payroll/{payroll_id}/paystub")
async def get_paystub(payroll_id: str, current_user: dict = Depends(get_admin_user)):
    """Generate pay stub details for a payroll record"""
    payroll = await db.payroll_history.find_one({"id": payroll_id}, {"_id": 0})
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    
    contractor = await db.users.find_one({"id": payroll["contractor_id"]}, {"_id": 0, "password_hash": 0})
    
    # Get company info
    company_info = {
        "name": "Up-Wash Power Washing",
        "address": "Burleson, TX",
        "phone": "",
        "ein": "XX-XXXXXXX"
    }
    
    paystub = {
        "paystub_id": payroll_id,
        "paystub_number": f"PS-{payroll_id[:8].upper()}",
        "company": company_info,
        "contractor": {
            "name": payroll.get("contractor_name", contractor.get("full_name") if contractor else "Unknown"),
            "id": payroll["contractor_id"],
            "phone": contractor.get("phone", "") if contractor else "",
            "address": contractor.get("address", "") if contractor else ""
        },
        "pay_period": {
            "start": payroll.get("period_start"),
            "end": payroll.get("period_end")
        },
        "earnings": {
            "completed_stops": payroll.get("stops_paid", 0),
            "rate_per_stop": payroll.get("pay_rate", 11.0),
            "gross_pay": payroll.get("amount", 0)
        },
        "deductions": {
            "total": 0  # No deductions for independent contractors
        },
        "net_pay": payroll.get("amount", 0),
        "paid_date": payroll.get("paid_at"),
        "payment_method": "Direct Deposit / Easy Pay",
        "ytd_earnings": 0,  # Will calculate
        "notes": "Independent Contractor - 1099"
    }
    
    # Calculate YTD earnings
    year_start = datetime.now(timezone.utc).replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    ytd_payroll = await db.payroll_history.find(
        {"contractor_id": payroll["contractor_id"], "paid_at": {"$gte": year_start.isoformat()}},
        {"_id": 0, "amount": 1}
    ).to_list(500)
    paystub["ytd_earnings"] = sum(p.get("amount", 0) for p in ytd_payroll)
    
    return paystub

@api_router.get("/contractor/paystubs")
async def get_contractor_paystubs(current_user: dict = Depends(get_contractor_user)):
    """Get all pay stubs for current contractor"""
    payroll_history = await db.payroll_history.find(
        {"contractor_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("paid_at", -1).to_list(100)
    
    paystubs = []
    for payroll in payroll_history:
        paystubs.append({
            "id": payroll["id"],
            "paystub_number": f"PS-{payroll['id'][:8].upper()}",
            "pay_period_end": payroll.get("period_end"),
            "stops_paid": payroll.get("stops_paid", 0),
            "rate": payroll.get("pay_rate", 11.0),
            "gross_pay": payroll.get("amount", 0),
            "net_pay": payroll.get("amount", 0),
            "paid_date": payroll.get("paid_at")
        })
    
    # Calculate YTD
    year_start = datetime.now(timezone.utc).replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    ytd_payroll = [p for p in payroll_history if p.get("paid_at", "") >= year_start.isoformat()]
    ytd_earnings = sum(p.get("amount", 0) for p in ytd_payroll)
    
    return {
        "paystubs": paystubs,
        "ytd_earnings": ytd_earnings,
        "total_stops_ytd": sum(p.get("stops_paid", 0) for p in ytd_payroll)
    }

@api_router.get("/contractor/paystubs/{paystub_id}")
async def get_contractor_paystub_detail(paystub_id: str, current_user: dict = Depends(get_contractor_user)):
    """Get detailed pay stub for contractor"""
    payroll = await db.payroll_history.find_one(
        {"id": paystub_id, "contractor_id": current_user["user_id"]},
        {"_id": 0}
    )
    if not payroll:
        raise HTTPException(status_code=404, detail="Pay stub not found")
    
    contractor = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "password_hash": 0})
    
    # Calculate YTD
    year_start = datetime.now(timezone.utc).replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    ytd_payroll = await db.payroll_history.find(
        {"contractor_id": current_user["user_id"], "paid_at": {"$gte": year_start.isoformat()}},
        {"_id": 0, "amount": 1, "stops_paid": 1}
    ).to_list(500)
    
    return {
        "paystub_number": f"PS-{paystub_id[:8].upper()}",
        "contractor_name": contractor.get("full_name", ""),
        "contractor_id": current_user["user_id"],
        "pay_period": {
            "start": payroll.get("period_start"),
            "end": payroll.get("period_end")
        },
        "completed_stops": payroll.get("stops_paid", 0),
        "rate_per_stop": payroll.get("pay_rate", 11.0),
        "gross_pay": payroll.get("amount", 0),
        "deductions": 0,
        "net_pay": payroll.get("amount", 0),
        "paid_date": payroll.get("paid_at"),
        "payment_method": "Direct Deposit / Easy Pay",
        "ytd_earnings": sum(p.get("amount", 0) for p in ytd_payroll),
        "ytd_stops": sum(p.get("stops_paid", 0) for p in ytd_payroll),
        "company": {
            "name": "Up-Wash Power Washing",
            "address": "Burleson, TX"
        },
        "notes": "Independent Contractor - 1099"
    }

# ===================== IN-APP MESSAGING SYSTEM =====================

class CustomerMessage(BaseModel):
    customer_phone: str
    customer_name: Optional[str] = None
    booking_id: Optional[str] = None
    message: str
    message_type: str = "custom"  # custom, en_route, arrived, completed

@api_router.post("/contractor/message/customer")
async def send_customer_message(msg: CustomerMessage, current_user: dict = Depends(get_contractor_user)):
    """Send in-app message to customer - stored and visible in their portal"""
    contractor = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "password_hash": 0})
    contractor_name = contractor.get("full_name", "Your Technician") if contractor else "Your Technician"
    
    # Create message record
    message_record = {
        "id": str(uuid.uuid4()),
        "type": "contractor_to_customer",
        "from_contractor_id": current_user["user_id"],
        "from_contractor_name": contractor_name,
        "to_customer_phone": msg.customer_phone,
        "to_customer_name": msg.customer_name,
        "booking_id": msg.booking_id,
        "message": msg.message,
        "message_type": msg.message_type,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.customer_messages.insert_one(message_record)
    
    # If customer has an account, create notification
    client = await db.clients.find_one({"phone": msg.customer_phone})
    if client:
        notification = {
            "id": str(uuid.uuid4()),
            "client_id": client["id"],
            "type": "technician_message",
            "title": f"Message from {contractor_name}",
            "message": msg.message[:100] + ("..." if len(msg.message) > 100 else ""),
            "full_message": msg.message,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.client_notifications.insert_one(notification)
    
    # Also log to SMS logs for admin visibility
    sms_log = {
        "id": str(uuid.uuid4()),
        "to_phone": msg.customer_phone,
        "message": msg.message,
        "contractor_id": current_user["user_id"],
        "contractor_name": contractor_name,
        "message_type": msg.message_type,
        "status": "delivered_in_app",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.sms_logs.insert_one(sms_log)
    
    return {"message": "Message sent", "message_id": message_record["id"], "delivery": "in_app"}

@api_router.post("/contractor/message/en-route/{booking_id}")
async def send_en_route_message(booking_id: str, current_user: dict = Depends(get_contractor_user)):
    """Send en-route notification to customer"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    contractor = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "password_hash": 0})
    contractor_name = contractor.get("full_name", "Your technician") if contractor else "Your technician"
    customer_name = booking.get("customer_name", "Valued Customer")
    
    message = f"Hi {customer_name}! This is {contractor_name} from Up-Wash Power Washing. I'm on my way to your location and should arrive shortly. Please ensure the area is accessible. Thank you!"
    
    msg = CustomerMessage(
        customer_phone=booking.get("customer_phone", ""),
        customer_name=customer_name,
        booking_id=booking_id,
        message=message,
        message_type="en_route"
    )
    
    result = await send_customer_message(msg, current_user)
    
    # Update booking
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"en_route_notified": True, "en_route_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "En-route notification sent", **result}

@api_router.post("/contractor/message/completed/{booking_id}")
async def send_completed_message(booking_id: str, current_user: dict = Depends(get_contractor_user)):
    """Send job completed notification to customer"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    contractor = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "password_hash": 0})
    contractor_name = contractor.get("full_name", "Your technician") if contractor else "Your technician"
    customer_name = booking.get("customer_name", "Valued Customer")
    
    message = f"Hi {customer_name}! Your Up-Wash Power Washing service has been completed. Thank you for choosing us! If you have any questions or feedback, please don't hesitate to reach out. Have a blessed day!"
    
    msg = CustomerMessage(
        customer_phone=booking.get("customer_phone", ""),
        customer_name=customer_name,
        booking_id=booking_id,
        message=message,
        message_type="completed"
    )
    
    result = await send_customer_message(msg, current_user)
    
    # Update booking
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"completion_notified": True, "completion_notified_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Completion notification sent", **result}

@api_router.get("/admin/messages/customer")
async def get_all_customer_messages(current_user: dict = Depends(get_admin_user)):
    """Get all customer messages for admin view"""
    messages = await db.customer_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"messages": messages}

@api_router.get("/client/messages")
async def get_client_messages(current_client: dict = Depends(get_client_user)):
    """Get messages for client"""
    # Get client's phone from their profile
    client = await db.clients.find_one({"id": current_client["client_id"]}, {"_id": 0})
    if not client:
        return {"messages": []}
    
    messages = await db.customer_messages.find(
        {"to_customer_phone": client.get("phone")},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"messages": messages}

# ===================== END ADMIN SETTINGS =====================

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
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return {"message": "Status updated", "booking_id": booking_id, "status": status}

# ===================== RESCHEDULE BOOKING =====================

class RescheduleRequest(BaseModel):
    new_date: str  # YYYY-MM-DD format
    send_sms: bool = True
    custom_message: Optional[str] = None

@api_router.patch("/admin/bookings/{booking_id}/reschedule")
async def reschedule_booking(booking_id: str, reschedule: RescheduleRequest, current_user: dict = Depends(get_admin_user)):
    """Reschedule a booking to a new date. Updates routes and sends SMS notification."""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    old_dates = booking.get("booking_dates", [])
    old_date = old_dates[0] if old_dates else "Unknown"
    new_date = reschedule.new_date
    
    # Validate new date is a weekday (Mon-Fri)
    try:
        new_date_obj = datetime.strptime(new_date, "%Y-%m-%d")
        if new_date_obj.weekday() > 4:  # 5=Saturday, 6=Sunday
            raise HTTPException(status_code=400, detail="New date must be a weekday (Monday-Friday)")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Update booking dates
    new_booking_dates = [new_date] if not booking.get("is_monthly") else [new_date] + old_dates[1:] if len(old_dates) > 1 else [new_date]
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "booking_dates": new_booking_dates,
            "rescheduled_from": old_date,
            "rescheduled_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update route if booking is assigned to one
    route_id = booking.get("route_id")
    if route_id:
        # The booking stays in the same route, just the date changed
        # Optionally create a note in the route about the reschedule
        await db.routes.update_one(
            {"id": route_id},
            {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    # Notify the assigned contractor if there is one
    contractor_id = booking.get("assigned_contractor_id")
    if contractor_id:
        contractor_notif = {
            "id": str(uuid.uuid4()),
            "contractor_id": contractor_id,
            "type": "booking_rescheduled",
            "title": "Booking Rescheduled",
            "message": f"A stop for {booking.get('customer_name')} has been moved from {old_date} to {new_date}.",
            "booking_id": booking_id,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(contractor_notif)
    
    # Create in-app message for customer
    customer_phone = booking.get("customer_phone", "")
    customer_name = booking.get("customer_name", "Valued Customer")
    
    # Default message or custom
    if reschedule.custom_message:
        sms_message = reschedule.custom_message
    else:
        sms_message = f"Hi {customer_name}! Your Up-Wash Power Washing service has been rescheduled from {old_date} to {new_date}. If you have any questions, please contact us. Thank you!"
    
    if reschedule.send_sms and customer_phone:
        # Send actual SMS via Twilio
        sms_result = await send_sms(customer_phone, sms_message)
        
        # Create in-app message record
        message_record = {
            "id": str(uuid.uuid4()),
            "type": "admin_to_customer",
            "from_admin": True,
            "to_customer_phone": customer_phone,
            "to_customer_name": customer_name,
            "booking_id": booking_id,
            "message": sms_message,
            "message_type": "reschedule",
            "sms_status": sms_result.get("status", "unknown"),
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.customer_messages.insert_one(message_record)
        
        # Log to SMS logs for admin visibility
        sms_log = {
            "id": str(uuid.uuid4()),
            "to_phone": customer_phone,
            "message": sms_message,
            "message_type": "reschedule",
            "status": sms_result.get("status", "unknown"),
            "booking_id": booking_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.sms_logs.insert_one(sms_log)
        
        # If customer has a client account, create notification
        client = await db.clients.find_one({"phone": customer_phone})
        if client:
            client_notif = {
                "id": str(uuid.uuid4()),
                "client_id": client["id"],
                "type": "booking_rescheduled",
                "title": "Service Rescheduled",
                "message": sms_message,
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.client_notifications.insert_one(client_notif)
    
    return {
        "message": "Booking rescheduled successfully",
        "booking_id": booking_id,
        "old_date": old_date,
        "new_date": new_date,
        "sms_sent": reschedule.send_sms and bool(customer_phone),
        "contractor_notified": bool(contractor_id)
    }

# ===================== ADMIN CALENDAR & SUBSCRIPTION ROUTES =====================

@api_router.get("/admin/calendar")
async def get_admin_calendar(month: Optional[int] = None, year: Optional[int] = None, current_user: dict = Depends(get_admin_user)):
    """Get all bookings for calendar view"""
    today = datetime.now(timezone.utc)
    target_month = month if month else today.month
    target_year = year if year else today.year
    
    # Get all bookings
    bookings = await db.bookings.find({}, {"_id": 0}).to_list(1000)
    
    # Organize by date
    calendar_data = {}
    for booking in bookings:
        for date_str in booking.get("booking_dates", []):
            if date_str not in calendar_data:
                calendar_data[date_str] = []
            calendar_data[date_str].append({
                "id": booking.get("id"),
                "customer_name": booking.get("customer_name"),
                "services": booking.get("services"),
                "status": booking.get("status"),
                "payment_status": booking.get("payment_status"),
                "is_monthly": booking.get("is_monthly", False),
                "address": booking.get("customer_address"),
                "route_id": booking.get("route_id"),
                "assigned_contractor_id": booking.get("assigned_contractor_id")
            })
    
    # Get routes for today
    today_str = today.strftime("%Y-%m-%d")
    routes = await db.routes.find({}, {"_id": 0}).to_list(100)
    
    # Get contractors
    contractors = await db.users.find({"role": "contractor"}, {"_id": 0, "password_hash": 0}).to_list(100)
    contractor_map = {c["id"]: c.get("full_name", c.get("username")) for c in contractors}
    
    # Add contractor names to routes
    for route in routes:
        if route.get("assigned_contractor_id"):
            route["contractor_name"] = contractor_map.get(route["assigned_contractor_id"], "Unassigned")
    
    return {
        "calendar": calendar_data,
        "today": today_str,
        "routes": routes,
        "month": target_month,
        "year": target_year
    }

@api_router.get("/admin/unpaid-subscriptions")
async def get_unpaid_subscriptions(current_user: dict = Depends(get_admin_user)):
    """Get subscriptions with failed payments"""
    unpaid = await db.bookings.find({
        "is_monthly": True,
        "subscription_status": "payment_failed"
    }, {"_id": 0}).sort("updated_at", -1).to_list(100)
    
    return {"unpaid_subscriptions": unpaid}

@api_router.patch("/admin/subscriptions/{booking_id}/status")
async def update_subscription_status(booking_id: str, status: str, current_user: dict = Depends(get_admin_user)):
    """Update subscription status (active, payment_failed, cancelled)"""
    valid_statuses = ["active", "payment_failed", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid subscription status")
    
    # Get booking for customer info
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    update_data = {
        "subscription_status": status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # If cancelling, also remove from routes
    if status == "cancelled":
        update_data["route_id"] = None
    
    result = await db.bookings.update_one(
        {"id": booking_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Send SMS notification based on status change
    customer_phone = booking.get("customer_phone")
    customer_name = booking.get("customer_name", "Valued Customer")
    sms_sent = False
    
    if customer_phone:
        if status == "payment_failed":
            sms_message = f"Hi {customer_name}, your Up-Wash subscription payment could not be processed. Please update your payment method at upwash.com or call us to avoid service interruption. Thank you!"
            await send_sms(customer_phone, sms_message)
            sms_sent = True
            
            # Store message
            msg_record = {
                "id": str(uuid.uuid4()),
                "booking_id": booking_id,
                "customer_phone": customer_phone,
                "customer_name": customer_name,
                "type": "payment_failed",
                "message": sms_message,
                "message_type": "payment_failed",
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.customer_messages.insert_one(msg_record)
            
        elif status == "cancelled":
            sms_message = f"Hi {customer_name}, your Up-Wash subscription has been cancelled due to non-payment. We're sorry to see you go! If you'd like to restart service, visit upwash.com or call us. Thank you for being a customer!"
            await send_sms(customer_phone, sms_message)
            sms_sent = True
            
            # Store message
            msg_record = {
                "id": str(uuid.uuid4()),
                "booking_id": booking_id,
                "customer_phone": customer_phone,
                "customer_name": customer_name,
                "type": "subscription_cancelled",
                "message": sms_message,
                "message_type": "subscription_cancelled",
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.customer_messages.insert_one(msg_record)
    
    return {"message": f"Subscription status updated to {status}", "sms_sent": sms_sent}

@api_router.post("/admin/process-subscription-payments")
async def process_subscription_payments(current_user: dict = Depends(get_admin_user)):
    """Process payments for subscriptions due in 3 days (manual trigger)"""
    today = datetime.now(timezone.utc)
    three_days_ahead = (today + timedelta(days=3)).strftime("%Y-%m-%d")
    
    # Find subscriptions due for payment
    subscriptions = await db.bookings.find({
        "is_monthly": True,
        "subscription_status": "active",
        "next_payment_date": three_days_ahead
    }, {"_id": 0}).to_list(100)
    
    results = {
        "processed": 0,
        "failed": 0,
        "notifications_sent": 0
    }
    
    for sub in subscriptions:
        # In production, process payment here using stored card
        # For now, mark as needing notification
        
        # Create notification for customer about upcoming charge
        notification = {
            "id": str(uuid.uuid4()),
            "booking_id": sub["id"],
            "customer_phone": sub.get("customer_phone"),
            "customer_email": sub.get("customer_email"),
            "type": "payment_reminder",
            "message": f"Your subscription service is scheduled in 3 days. Payment of ${sub.get('total', 0):.2f} will be processed.",
            "sent": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.customer_notifications.insert_one(notification)
        results["notifications_sent"] += 1
    
    return results

@api_router.post("/admin/mark-payment-failed/{booking_id}")
async def mark_subscription_payment_failed(booking_id: str, current_user: dict = Depends(get_admin_user)):
    """Mark a subscription payment as failed and notify customer via SMS"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Update subscription status
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "subscription_status": "payment_failed",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Send SMS notification
    customer_phone = booking.get("customer_phone")
    customer_name = booking.get("customer_name", "Valued Customer")
    sms_sent = False
    
    if customer_phone:
        sms_message = f"Hi {customer_name}, your Up-Wash subscription payment could not be processed. Please update your payment method at upwash.com or call us to avoid service interruption. Thank you!"
        await send_sms(customer_phone, sms_message)
        sms_sent = True
        
        # Store message
        msg_record = {
            "id": str(uuid.uuid4()),
            "booking_id": booking_id,
            "customer_phone": customer_phone,
            "customer_name": customer_name,
            "type": "payment_failed",
            "message": sms_message,
            "message_type": "payment_failed",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.customer_messages.insert_one(msg_record)
    
    # Create notification for customer (in-app)
    notification = {
        "id": str(uuid.uuid4()),
        "booking_id": booking_id,
        "customer_phone": customer_phone,
        "customer_email": booking.get("customer_email"),
        "type": "payment_failed",
        "message": "Your subscription payment failed. Please update your payment method to avoid service interruption.",
        "sent": sms_sent,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.customer_notifications.insert_one(notification)
    
    return {"message": "Payment marked as failed and customer notified", "sms_sent": sms_sent}

# ===================== IN-HOUSE MESSAGING SYSTEM =====================

class ClientMessage(BaseModel):
    recipient_type: str  # "client" or "contractor"
    recipient_id: str  # booking_id for clients, contractor_id for contractors
    subject: str
    message: str

@api_router.post("/admin/messages/send")
async def send_admin_message(msg: ClientMessage, current_user: dict = Depends(get_admin_user)):
    """Send in-house message to client or contractor"""
    message_doc = {
        "id": str(uuid.uuid4()),
        "sender": "admin",
        "recipient_type": msg.recipient_type,
        "recipient_id": msg.recipient_id,
        "subject": msg.subject,
        "message": msg.message,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.admin_messages.insert_one(message_doc)
    
    return {"message_id": message_doc["id"], "sent": True}

@api_router.get("/admin/messages")
async def get_admin_messages(current_user: dict = Depends(get_admin_user)):
    """Get all admin messages sent and received"""
    messages = await db.admin_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"messages": messages}

@api_router.get("/client/messages/{booking_id}")
async def get_client_messages(booking_id: str):
    """Get messages for a client (by booking ID)"""
    messages = await db.admin_messages.find({
        "recipient_type": "client",
        "recipient_id": booking_id
    }, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"messages": messages}

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
    # Remove MongoDB _id before returning
    route_doc.pop("_id", None)
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
        {"$set": {
            "assigned_contractor_id": assignment.contractor_id,
            "status": "assigned",  # Mark as assigned to remove from pending
            "assigned_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Route not found")
    
    # Create notification for contractor
    route = await db.routes.find_one({"id": route_id}, {"_id": 0})
    if route and assignment.contractor_id:
        notification = {
            "id": str(uuid.uuid4()),
            "contractor_id": assignment.contractor_id,
            "type": "route_assigned",
            "title": "New Route Assigned!",
            "message": f"You have been assigned to route: {route.get('name', 'Unknown')}",
            "route_id": route_id,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
    
    return {"message": "Route assigned"}

class RouteCombine(BaseModel):
    route_ids: List[str]

@api_router.post("/admin/routes/combine")
async def combine_routes(combine: RouteCombine, current_user: dict = Depends(get_admin_user)):
    """Combine multiple routes into one"""
    if len(combine.route_ids) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 routes to combine")
    
    # Get all routes
    routes_to_combine = await db.routes.find(
        {"id": {"$in": combine.route_ids}},
        {"_id": 0}
    ).to_list(100)
    
    if len(routes_to_combine) < 2:
        raise HTTPException(status_code=404, detail="Routes not found")
    
    # Combine all bookings
    all_bookings = []
    all_zip_codes = set()
    for route in routes_to_combine:
        all_bookings.extend(route.get("bookings", []))
        if route.get("zip_code"):
            all_zip_codes.add(route.get("zip_code"))
    
    # Create combined route
    combined_route = {
        "id": str(uuid.uuid4()),
        "name": f"Combined Route ({len(all_bookings)} stops)",
        "description": f"Combined from {len(routes_to_combine)} routes",
        "area": ", ".join(all_zip_codes) if all_zip_codes else "Multiple areas",
        "zip_code": list(all_zip_codes)[0] if len(all_zip_codes) == 1 else None,
        "bookings": all_bookings,
        "status": "pending",
        "assigned_contractor_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.routes.insert_one(combined_route)
    
    # Delete old routes
    await db.routes.delete_many({"id": {"$in": combine.route_ids}})
    
    return {
        "message": f"Combined {len(routes_to_combine)} routes into 1",
        "new_route_id": combined_route["id"],
        "total_stops": len(all_bookings)
    }

@api_router.post("/admin/routes/{route_id}/bookings")
async def add_bookings_to_route(route_id: str, booking_ids: List[str], current_user: dict = Depends(get_admin_user)):
    await db.routes.update_one(
        {"id": route_id},
        {"$addToSet": {"bookings": {"$each": booking_ids}}}
    )
    
    # Update bookings with route_id
    await db.bookings.update_many(
        {"id": {"$in": booking_ids}},
        {"$set": {"route_id": route_id}}
    )
    
    # Notify contractor if route is assigned
    route = await db.routes.find_one({"id": route_id}, {"_id": 0})
    if route and route.get("assigned_contractor_id"):
        notification = {
            "id": str(uuid.uuid4()),
            "contractor_id": route["assigned_contractor_id"],
            "type": "bookings_added",
            "title": "New Stops Added!",
            "message": f"{len(booking_ids)} new stop(s) added to your route: {route.get('name', 'Unknown')}",
            "route_id": route_id,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
    
    return {"message": "Bookings added to route"}

# ===================== BULK DELETE & MANAGEMENT ENDPOINTS =====================

class BulkDeleteRequest(BaseModel):
    ids: List[str]

@api_router.delete("/admin/routes/old")
async def delete_old_pending_routes(days: int = 30, current_user: dict = Depends(get_admin_user)):
    """Delete pending routes older than specified days (default 30)"""
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    result = await db.routes.delete_many({
        "status": {"$in": ["pending", None]},
        "assigned_contractor_id": None,
        "created_at": {"$lt": cutoff_date}
    })
    return {"message": f"Deleted {result.deleted_count} routes older than {days} days", "deleted": result.deleted_count}

@api_router.delete("/admin/routes/{route_id}")
async def delete_single_route(route_id: str, current_user: dict = Depends(get_admin_user)):
    """Delete a single pending route"""
    result = await db.routes.delete_one({"id": route_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Route not found")
    return {"message": "Route deleted", "deleted": 1}

@api_router.post("/admin/routes/bulk-delete")
async def bulk_delete_routes(request: BulkDeleteRequest, current_user: dict = Depends(get_admin_user)):
    """Delete multiple routes at once"""
    result = await db.routes.delete_many({"id": {"$in": request.ids}})
    return {"message": f"Deleted {result.deleted_count} routes", "deleted": result.deleted_count}

@api_router.delete("/admin/sms-logs/all")
async def delete_all_sms_logs(current_user: dict = Depends(get_admin_user)):
    """Delete all SMS logs"""
    result = await db.sms_logs.delete_many({})
    return {"message": f"Deleted all {result.deleted_count} SMS logs", "deleted": result.deleted_count}

@api_router.delete("/admin/sms-logs/{log_id}")
async def delete_single_sms_log(log_id: str, current_user: dict = Depends(get_admin_user)):
    """Delete a single SMS log"""
    result = await db.sms_logs.delete_one({"id": log_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="SMS log not found")
    return {"message": "SMS log deleted", "deleted": 1}

@api_router.post("/admin/sms-logs/bulk-delete")
async def bulk_delete_sms_logs(request: BulkDeleteRequest, current_user: dict = Depends(get_admin_user)):
    """Delete multiple SMS logs at once"""
    result = await db.sms_logs.delete_many({"id": {"$in": request.ids}})
    return {"message": f"Deleted {result.deleted_count} SMS logs", "deleted": result.deleted_count}

@api_router.delete("/admin/messages/{message_id}")
async def delete_single_message(message_id: str, current_user: dict = Depends(get_admin_user)):
    """Delete a single message"""
    result = await db.messages.delete_one({"id": message_id})
    if result.deleted_count == 0:
        # Try customer_messages
        result = await db.customer_messages.delete_one({"id": message_id})
    return {"message": "Message deleted", "deleted": result.deleted_count}

@api_router.post("/admin/messages/bulk-delete")
async def bulk_delete_messages(request: BulkDeleteRequest, current_user: dict = Depends(get_admin_user)):
    """Delete multiple messages at once"""
    result1 = await db.messages.delete_many({"id": {"$in": request.ids}})
    result2 = await db.customer_messages.delete_many({"id": {"$in": request.ids}})
    total = result1.deleted_count + result2.deleted_count
    return {"message": f"Deleted {total} messages", "deleted": total}

@api_router.delete("/admin/clients/{client_id}")
async def delete_single_client(client_id: str, current_user: dict = Depends(get_admin_user)):
    """Delete a single client"""
    result = await db.clients.delete_one({"id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client deleted", "deleted": 1}

@api_router.post("/admin/clients/bulk-delete")
async def bulk_delete_clients(request: BulkDeleteRequest, current_user: dict = Depends(get_admin_user)):
    """Delete multiple clients at once"""
    result = await db.clients.delete_many({"id": {"$in": request.ids}})
    return {"message": f"Deleted {result.deleted_count} clients", "deleted": result.deleted_count}

# ===================== BOOKING AMOUNT EDIT & PAY LINK =====================

class BookingAmountUpdate(BaseModel):
    subtotal: Optional[float] = None
    tax: Optional[float] = None
    total: Optional[float] = None
    services: Optional[List[str]] = None

@api_router.patch("/admin/bookings/{booking_id}/amount")
async def update_booking_amount(booking_id: str, update: BookingAmountUpdate, current_user: dict = Depends(get_admin_user)):
    """Update booking amount/services"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if update.subtotal is not None:
        update_data["subtotal"] = update.subtotal
    if update.tax is not None:
        update_data["tax"] = update.tax
    if update.total is not None:
        update_data["total"] = update.total
    if update.services is not None:
        update_data["services"] = update.services
    
    await db.bookings.update_one({"id": booking_id}, {"$set": update_data})
    
    return {"message": "Booking amount updated", "booking_id": booking_id}

@api_router.post("/admin/bookings/{booking_id}/pay-link")
async def generate_pay_link(booking_id: str, current_user: dict = Depends(get_admin_user)):
    """Generate a payment link for a booking and optionally send to client"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Booking is already paid")
    
    # Create a unique pay token
    pay_token = str(uuid.uuid4())
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "pay_token": pay_token,
            "pay_link_created_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create the pay link (frontend will handle this route)
    base_url = os.environ.get("FRONTEND_URL", "https://upwash-preview.preview.emergentagent.com")
    pay_link = f"{base_url}/pay/{pay_token}"
    
    # Create message for customer
    customer_phone = booking.get("customer_phone", "")
    customer_name = booking.get("customer_name", "Customer")
    total = booking.get("total", 0)
    
    message = f"Hi {customer_name}! Your Up-Wash Power Washing invoice of ${total:.2f} is ready. Pay securely here: {pay_link}"
    
    if customer_phone:
        # Store message in customer_messages
        msg_record = {
            "id": str(uuid.uuid4()),
            "type": "admin_to_customer",
            "from_admin": True,
            "to_customer_phone": customer_phone,
            "to_customer_name": customer_name,
            "booking_id": booking_id,
            "message": message,
            "message_type": "pay_link",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.customer_messages.insert_one(msg_record)
        
        # Log it
        await db.sms_logs.insert_one({
            "id": str(uuid.uuid4()),
            "to_phone": customer_phone,
            "message": message,
            "message_type": "pay_link",
            "status": "delivered_in_app",
            "booking_id": booking_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {
        "message": "Pay link generated",
        "pay_link": pay_link,
        "pay_token": pay_token,
        "sms_sent": bool(customer_phone)
    }

# Endpoint for client to pay via pay link
@api_router.get("/pay/{pay_token}")
async def get_pay_link_booking(pay_token: str):
    """Get booking details for pay link"""
    booking = await db.bookings.find_one({"pay_token": pay_token}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Invalid or expired payment link")
    
    if booking.get("payment_status") == "paid":
        return {"status": "already_paid", "message": "This booking has already been paid"}
    
    return {
        "booking_id": booking["id"],
        "customer_name": booking.get("customer_name"),
        "services": booking.get("services", []),
        "subtotal": booking.get("subtotal", 0),
        "tax": booking.get("tax", 0),
        "total": booking.get("total", 0),
        "status": "pending_payment"
    }

# ===================== CONTRACT DOCUMENT MANAGEMENT =====================

class ContractDocument(BaseModel):
    title: str
    content: str  # Pasted document content

@api_router.post("/admin/contracts/documents")
async def add_contract_document(doc: ContractDocument, current_user: dict = Depends(get_admin_user)):
    """Add a new contract document template via copy/paste"""
    doc_record = {
        "id": str(uuid.uuid4()),
        "title": doc.title,
        "content": doc.content,
        "created_by": current_user.get("sub"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.contract_documents.insert_one(doc_record)
    return {"message": "Document added", "document_id": doc_record["id"]}

@api_router.get("/admin/contracts/documents")
async def list_contract_documents(current_user: dict = Depends(get_admin_user)):
    """Get all contract document templates"""
    docs = await db.contract_documents.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"documents": docs}

@api_router.delete("/admin/contracts/documents/{doc_id}")
async def delete_contract_document(doc_id: str, current_user: dict = Depends(get_admin_user)):
    """Delete a contract document template"""
    result = await db.contract_documents.delete_one({"id": doc_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted"}

# ===================== NOTIFICATION MANAGEMENT =====================

@api_router.patch("/admin/notifications/mark-read")
async def mark_notifications_read(notification_type: str, current_user: dict = Depends(get_admin_user)):
    """Mark all notifications of a certain type as read"""
    await db.admin_notifications.update_many(
        {"type": notification_type, "read": False},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": f"All {notification_type} notifications marked as read"}

@api_router.patch("/admin/notifications/{notification_id}/read")
async def mark_single_notification_read(notification_id: str, current_user: dict = Depends(get_admin_user)):
    """Mark a single notification as read"""
    await db.admin_notifications.update_one(
        {"id": notification_id},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Notification marked as read"}

# ===================== CONTRACTOR ACCEPT/DECLINE RELEASED ROUTES =====================

@api_router.post("/contractor/released-routes/{released_route_id}/accept")
async def accept_released_route(released_route_id: str, current_user: dict = Depends(get_contractor_user)):
    """Contractor accepts a released route - creates a route request for admin approval"""
    released_route = await db.released_routes.find_one({"id": released_route_id}, {"_id": 0})
    if not released_route:
        raise HTTPException(status_code=404, detail="Released route not found")
    
    if released_route.get("status") == "claimed":
        raise HTTPException(status_code=400, detail="Route already claimed")
    
    contractor_id = current_user.get("sub")
    contractor = await db.users.find_one({"id": contractor_id}, {"_id": 0})
    contractor_name = contractor.get("full_name", "Unknown") if contractor else "Unknown"
    
    # Create a route request for admin approval
    route_request = {
        "id": str(uuid.uuid4()),
        "contractor_id": contractor_id,
        "contractor_name": contractor_name,
        "request_type": "released_route_accept",
        "released_route_id": released_route_id,
        "original_route_id": released_route.get("original_route_id"),
        "route_name": released_route.get("route_name", "Released Route"),
        "num_stops": len(released_route.get("bookings", [])),
        "status": "pending",
        "zip_codes": released_route.get("zip_code", ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.route_requests.insert_one(route_request)
    
    # Mark released route as pending acceptance
    await db.released_routes.update_one(
        {"id": released_route_id},
        {"$set": {
            "pending_acceptance_by": contractor_id,
            "pending_acceptance_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notify admin
    admin_notif = {
        "id": str(uuid.uuid4()),
        "type": "route_accept_request",
        "title": "Route Accept Request",
        "message": f"{contractor_name} wants to accept released route: {released_route.get('route_name', 'Unknown')}",
        "route_request_id": route_request["id"],
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admin_notifications.insert_one(admin_notif)
    
    return {
        "message": "Route acceptance request sent to admin for approval",
        "request_id": route_request["id"]
    }

@api_router.post("/contractor/released-routes/{released_route_id}/decline")
async def decline_released_route(released_route_id: str, current_user: dict = Depends(get_contractor_user)):
    """Contractor declines a released route"""
    contractor_id = current_user.get("sub")
    
    # Just log the decline - route stays available for others
    await db.released_routes.update_one(
        {"id": released_route_id},
        {"$addToSet": {"declined_by": contractor_id}}
    )
    
    return {"message": "Route declined"}

# ===================== ROUTE OPTIMIZATION =====================

@api_router.post("/admin/routes/{route_id}/optimize")
async def optimize_route(route_id: str, current_user: dict = Depends(get_admin_user)):
    """
    Optimize route order using Google Maps Directions API
    Returns the most efficient driving order for all stops
    """
    route = await db.routes.find_one({"id": route_id}, {"_id": 0})
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    booking_ids = route.get("bookings", [])
    if len(booking_ids) < 2:
        return {"message": "Route has fewer than 2 stops, no optimization needed", "optimized": False}
    
    # Get all bookings with addresses
    bookings = await db.bookings.find(
        {"id": {"$in": booking_ids}},
        {"_id": 0}
    ).to_list(len(booking_ids))
    
    if len(bookings) < 2:
        return {"message": "Not enough bookings with addresses", "optimized": False}
    
    # Extract addresses
    stops = []
    for booking in bookings:
        address = booking.get("customer_address")
        if address:
            stops.append({
                "id": booking["id"],
                "address": address,
                "name": booking.get("customer_name", "Unknown")
            })
    
    if len(stops) < 2:
        return {"message": "Not enough valid addresses for optimization", "optimized": False}
    
    # Use Google Maps Distance Matrix API to get distances between all stops
    try:
        # Start from Burleson (home base)
        origin = burleson_address
        
        # Build waypoints string
        addresses = [s["address"] for s in stops]
        
        # Call Google Maps Directions API with waypoint optimization
        directions_url = "https://maps.googleapis.com/maps/api/directions/json"
        params = {
            "origin": origin,
            "destination": origin,  # Return to base
            "waypoints": f"optimize:true|{'|'.join(addresses)}",
            "key": google_maps_api_key
        }
        
        response = requests.get(directions_url, params=params)
        data = response.json()
        
        if data.get("status") != "OK":
            logging.error(f"Google Maps API error: {data.get('status')}")
            return {
                "message": f"Could not optimize route: {data.get('status')}",
                "optimized": False
            }
        
        # Get optimized order from waypoint_order
        waypoint_order = data.get("routes", [{}])[0].get("waypoint_order", [])
        
        if not waypoint_order:
            return {"message": "Could not determine optimal order", "optimized": False}
        
        # Reorder stops based on optimization
        optimized_stops = [stops[i] for i in waypoint_order]
        optimized_booking_ids = [s["id"] for s in optimized_stops]
        
        # Get route details
        route_data = data.get("routes", [{}])[0]
        legs = route_data.get("legs", [])
        
        # Calculate total distance and duration
        total_distance_meters = sum(leg.get("distance", {}).get("value", 0) for leg in legs)
        total_duration_seconds = sum(leg.get("duration", {}).get("value", 0) for leg in legs)
        
        total_distance_miles = round(total_distance_meters * 0.000621371, 1)
        total_duration_minutes = round(total_duration_seconds / 60)
        
        # Update route with optimized order
        await db.routes.update_one(
            {"id": route_id},
            {"$set": {
                "bookings": optimized_booking_ids,
                "optimized": True,
                "optimized_at": datetime.now(timezone.utc).isoformat(),
                "estimated_distance_miles": total_distance_miles,
                "estimated_duration_minutes": total_duration_minutes
            }}
        )
        
        # Build step-by-step directions
        directions = []
        for i, leg in enumerate(legs[:-1]):  # Exclude return to base leg
            if i < len(optimized_stops):
                directions.append({
                    "stop_number": i + 1,
                    "customer_name": optimized_stops[i]["name"],
                    "address": optimized_stops[i]["address"],
                    "distance": leg.get("distance", {}).get("text", ""),
                    "duration": leg.get("duration", {}).get("text", "")
                })
        
        return {
            "message": "Route optimized successfully!",
            "optimized": True,
            "total_stops": len(optimized_stops),
            "total_distance_miles": total_distance_miles,
            "total_duration_minutes": total_duration_minutes,
            "optimized_order": directions,
            "google_maps_url": f"https://www.google.com/maps/dir/{origin}/{'/'.join([s['address'].replace(' ', '+') for s in optimized_stops])}/{origin}"
        }
        
    except Exception as e:
        logging.error(f"Route optimization error: {e}")
        return {
            "message": f"Optimization failed: {str(e)}",
            "optimized": False
        }

@api_router.get("/contractor/routes/{route_id}/directions")
async def get_route_directions(route_id: str, current_user: dict = Depends(get_contractor_user)):
    """Get turn-by-turn directions for an assigned route"""
    route = await db.routes.find_one(
        {"id": route_id, "assigned_contractor_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not route:
        raise HTTPException(status_code=404, detail="Route not found or not assigned to you")
    
    booking_ids = route.get("bookings", [])
    bookings = await db.bookings.find(
        {"id": {"$in": booking_ids}},
        {"_id": 0}
    ).to_list(len(booking_ids))
    
    # Maintain order from route
    booking_map = {b["id"]: b for b in bookings}
    ordered_stops = []
    for bid in booking_ids:
        if bid in booking_map:
            b = booking_map[bid]
            ordered_stops.append({
                "booking_id": b["id"],
                "customer_name": b.get("customer_name", "Unknown"),
                "customer_phone": b.get("customer_phone", ""),
                "address": b.get("customer_address", ""),
                "services": b.get("services", []),
                "status": b.get("task_status", "pending")
            })
    
    # Generate Google Maps URL for navigation
    addresses = [s["address"] for s in ordered_stops if s["address"]]
    if addresses:
        google_maps_url = f"https://www.google.com/maps/dir/{burleson_address}/{'/'.join([a.replace(' ', '+') for a in addresses])}"
    else:
        google_maps_url = None
    
    return {
        "route_id": route_id,
        "route_name": route.get("name", "Route"),
        "optimized": route.get("optimized", False),
        "estimated_distance_miles": route.get("estimated_distance_miles"),
        "estimated_duration_minutes": route.get("estimated_duration_minutes"),
        "stops": ordered_stops,
        "google_maps_url": google_maps_url
    }

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
        search_response = square_client.customers.search(
            query={
                "filter": {
                    "email_address": {"exact": invoice_req.customer_email}
                }
            }
        )
        
        customer_id = None
        if search_response.customers:
            customer_id = search_response.customers[0].id
        else:
            # Create customer
            create_response = square_client.customers.create(
                email_address=invoice_req.customer_email,
                given_name=booking.get("customer_name", "").split()[0],
                phone_number=booking.get("customer_phone")
            )
            
            if create_response.customer:
                customer_id = create_response.customer.id
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

@api_router.get("/contractor/earnings")
async def contractor_earnings(current_user: dict = Depends(get_contractor_user)):
    """Get contractor's earnings summary"""
    contractor_id = current_user["user_id"]
    pay_per_stop = await get_pay_per_stop()
    
    # Get all completed stops
    completed_stops = await db.stop_completions.find(
        {"contractor_id": contractor_id, "status": "completed"},
        {"_id": 0}
    ).to_list(1000)
    
    # Get CNS stops (no pay)
    cns_stops = await db.stop_completions.find(
        {"contractor_id": contractor_id, "status": "cns"},
        {"_id": 0}
    ).to_list(1000)
    
    # Calculate earnings
    total_completed = len(completed_stops)
    total_earnings = total_completed * pay_per_stop
    
    # Get paid history
    payments = await db.contractor_payments.find(
        {"contractor_id": contractor_id},
        {"_id": 0}
    ).sort("paid_at", -1).to_list(100)
    
    total_paid = sum(p.get("amount", 0) for p in payments)
    unpaid_balance = total_earnings - total_paid
    
    # This week's earnings
    from datetime import timedelta
    week_start = (datetime.now(timezone.utc) - timedelta(days=datetime.now(timezone.utc).weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    
    this_week_stops = [s for s in completed_stops if s.get("completed_at", "") >= week_start.isoformat()]
    this_week_earnings = len(this_week_stops) * pay_per_stop
    
    return {
        "total_completed_stops": total_completed,
        "total_cns_stops": len(cns_stops),
        "total_earnings": total_earnings,
        "total_paid": total_paid,
        "unpaid_balance": unpaid_balance,
        "this_week_stops": len(this_week_stops),
        "this_week_earnings": this_week_earnings,
        "pay_per_stop": pay_per_stop,
        "recent_payments": payments[:10]
    }

@api_router.get("/contractor/routes")
async def contractor_routes(current_user: dict = Depends(get_contractor_user)):
    routes = await db.routes.find(
        {"assigned_contractor_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    
    # Enrich with booking details and stop status
    for route in routes:
        booking_ids = route.get("bookings", [])
        if booking_ids:
            bookings = await db.bookings.find(
                {"id": {"$in": booking_ids}},
                {"_id": 0}
            ).to_list(200)
            
            # Get stop completion status
            for booking in bookings:
                completion = await db.stop_completions.find_one(
                    {"booking_id": booking["id"], "route_id": route["id"]},
                    {"_id": 0}
                )
                booking["stop_status"] = completion.get("status") if completion else "pending"
                booking["stop_notes"] = completion.get("notes") if completion else None
            
            route["booking_details"] = bookings
            route["completed_stops"] = len([b for b in bookings if b.get("stop_status") == "completed"])
            route["cns_stops"] = len([b for b in bookings if b.get("stop_status") == "cns"])
            route["pending_stops"] = len([b for b in bookings if b.get("stop_status") == "pending"])
    
    return {"routes": routes}

@api_router.get("/contractor/today")
async def contractor_today_tasks(current_user: dict = Depends(get_contractor_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Get contractor's routes
    routes = await db.routes.find(
        {"assigned_contractor_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    
    all_booking_ids = []
    for r in routes:
        all_booking_ids.extend(r.get("bookings", []))
    
    # Get all bookings for those routes
    bookings = await db.bookings.find({
        "id": {"$in": all_booking_ids}
    }, {"_id": 0}).to_list(500)
    
    # Get stop completion status
    for booking in bookings:
        completion = await db.stop_completions.find_one(
            {"booking_id": booking["id"]},
            {"_id": 0}
        )
        booking["stop_status"] = completion.get("status") if completion else "pending"
        booking["stop_notes"] = completion.get("notes") if completion else None
        booking["stop_photo"] = completion.get("photo_url") if completion else None
    
    # Sort by address for route optimization
    if bookings:
        addresses = [b["customer_address"] for b in bookings]
        optimized = optimize_route(addresses)
        address_to_order = {o["address"]: o["order"] for o in optimized}
        bookings.sort(key=lambda b: address_to_order.get(b["customer_address"], 999))
    
    return {
        "date": today,
        "bookings": bookings,
        "total_stops": len(bookings),
        "completed_stops": len([b for b in bookings if b.get("stop_status") == "completed"]),
        "cns_stops": len([b for b in bookings if b.get("stop_status") == "cns"])
    }

class StopCompletion(BaseModel):
    status: str  # "completed" or "cns"
    notes: Optional[str] = None
    photo_url: Optional[str] = None

@api_router.post("/contractor/stop/{booking_id}/complete")
async def complete_stop(booking_id: str, completion: StopCompletion, current_user: dict = Depends(get_contractor_user)):
    """Mark a stop as completed or CNS (Cannot Service)"""
    contractor_id = current_user["user_id"]
    
    # Verify booking exists
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Find which route this booking is in
    route = await db.routes.find_one(
        {"bookings": booking_id, "assigned_contractor_id": contractor_id},
        {"_id": 0}
    )
    if not route:
        raise HTTPException(status_code=403, detail="This stop is not assigned to you")
    
    if completion.status == "cns":
        # CNS requires description and photo
        if not completion.notes or len(completion.notes.strip()) < 10:
            raise HTTPException(status_code=400, detail="CNS requires a detailed description (at least 10 characters)")
        if not completion.photo_url:
            raise HTTPException(status_code=400, detail="CNS requires a photo upload. No photo = no pay for this stop.")
    
    # Create or update stop completion record
    stop_record = {
        "id": str(uuid.uuid4()),
        "booking_id": booking_id,
        "route_id": route["id"],
        "contractor_id": contractor_id,
        "status": completion.status,
        "notes": completion.notes,
        "photo_url": completion.photo_url,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "pay_eligible": completion.status == "completed"  # Only completed stops get paid
    }
    
    # Upsert the stop completion
    await db.stop_completions.update_one(
        {"booking_id": booking_id, "contractor_id": contractor_id},
        {"$set": stop_record},
        upsert=True
    )
    
    # Update booking status
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "task_status": completion.status,
            "task_notes": completion.notes,
            "task_photo": completion.photo_url,
            "status": "completed" if completion.status == "completed" else "cns",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notify admin if CNS
    if completion.status == "cns":
        admin_notif = {
            "id": str(uuid.uuid4()),
            "type": "cns_stop",
            "title": "Stop Marked CNS",
            "message": f"Contractor {current_user.get('full_name', 'Unknown')} marked stop as CNS: {completion.notes[:50]}...",
            "booking_id": booking_id,
            "contractor_id": contractor_id,
            "read": False,
            "play_sound": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.admin_notifications.insert_one(admin_notif)
    
    return {
        "message": f"Stop marked as {completion.status}",
        "pay_eligible": completion.status == "completed",
        "pay_amount": (await get_pay_per_stop()) if completion.status == "completed" else 0
    }

# ===================== ADMIN CONTRACTOR PAYMENT ROUTES =====================

@api_router.get("/admin/contractors/{contractor_id}/earnings")
async def get_contractor_earnings(contractor_id: str, current_user: dict = Depends(get_admin_user)):
    """Get detailed earnings for a specific contractor"""
    pay_per_stop = await get_pay_per_stop()
    
    # Get all completed stops
    completed_stops = await db.stop_completions.find(
        {"contractor_id": contractor_id, "status": "completed"},
        {"_id": 0}
    ).sort("completed_at", -1).to_list(1000)
    
    # Get CNS stops
    cns_stops = await db.stop_completions.find(
        {"contractor_id": contractor_id, "status": "cns"},
        {"_id": 0}
    ).to_list(500)
    
    # Get payment history
    payments = await db.contractor_payments.find(
        {"contractor_id": contractor_id},
        {"_id": 0}
    ).sort("paid_at", -1).to_list(100)
    
    total_earnings = len(completed_stops) * pay_per_stop
    total_paid = sum(p.get("amount", 0) for p in payments)
    unpaid_balance = total_earnings - total_paid
    
    # This week's earnings
    from datetime import timedelta
    week_start = (datetime.now(timezone.utc) - timedelta(days=datetime.now(timezone.utc).weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    
    this_week_stops = [s for s in completed_stops if s.get("completed_at", "") >= week_start.isoformat()]
    this_week_earnings = len(this_week_stops) * pay_per_stop
    
    return {
        "contractor_id": contractor_id,
        "total_completed_stops": len(completed_stops),
        "total_cns_stops": len(cns_stops),
        "total_earnings": total_earnings,
        "total_paid": total_paid,
        "unpaid_balance": unpaid_balance,
        "this_week_stops": len(this_week_stops),
        "this_week_earnings": this_week_earnings,
        "pay_per_stop": pay_per_stop,
        "recent_completions": completed_stops[:20],
        "recent_cns": cns_stops[:10],
        "payment_history": payments
    }

class ContractorPayment(BaseModel):
    amount: float
    payment_method: str = "bank_transfer"
    notes: Optional[str] = None

@api_router.post("/admin/contractors/{contractor_id}/pay")
async def pay_contractor(contractor_id: str, payment: ContractorPayment, current_user: dict = Depends(get_admin_user)):
    """Record payment to contractor"""
    contractor = await db.users.find_one({"id": contractor_id}, {"_id": 0})
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")
    
    payment_record = {
        "id": str(uuid.uuid4()),
        "contractor_id": contractor_id,
        "contractor_name": contractor.get("full_name", "Unknown"),
        "amount": payment.amount,
        "payment_method": payment.payment_method,
        "notes": payment.notes,
        "paid_by": current_user.get("username", "admin"),
        "paid_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.contractor_payments.insert_one(payment_record)
    
    # Notify contractor
    contractor_notif = {
        "id": str(uuid.uuid4()),
        "contractor_id": contractor_id,
        "type": "payment_received",
        "title": "Payment Received!",
        "message": f"You received a payment of ${payment.amount:.2f} via {payment.payment_method}",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(contractor_notif)
    
    return {
        "message": f"Payment of ${payment.amount:.2f} recorded",
        "payment_id": payment_record["id"]
    }

@api_router.get("/admin/contractors/weekly-payroll")
async def get_weekly_payroll(current_user: dict = Depends(get_admin_user)):
    """Get weekly payroll summary for all contractors"""
    from datetime import timedelta
    pay_per_stop = await get_pay_per_stop()
    week_start = (datetime.now(timezone.utc) - timedelta(days=datetime.now(timezone.utc).weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Get all contractors
    contractors = await db.users.find(
        {"role": "contractor"},
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    
    payroll = []
    for contractor in contractors:
        # Get this week's completed stops
        completed = await db.stop_completions.count_documents({
            "contractor_id": contractor["id"],
            "status": "completed",
            "completed_at": {"$gte": week_start.isoformat()}
        })
        
        cns = await db.stop_completions.count_documents({
            "contractor_id": contractor["id"],
            "status": "cns",
            "completed_at": {"$gte": week_start.isoformat()}
        })
        
        # Get this week's payments
        payments = await db.contractor_payments.find({
            "contractor_id": contractor["id"],
            "paid_at": {"$gte": week_start.isoformat()}
        }, {"_id": 0}).to_list(100)
        
        week_paid = sum(p.get("amount", 0) for p in payments)
        week_earnings = completed * pay_per_stop
        week_owed = week_earnings - week_paid
        
        payroll.append({
            "contractor_id": contractor["id"],
            "contractor_name": contractor.get("full_name", contractor.get("username")),
            "completed_stops": completed,
            "cns_stops": cns,
            "week_earnings": week_earnings,
            "week_paid": week_paid,
            "week_owed": week_owed
        })
    
    total_owed = sum(p["week_owed"] for p in payroll)
    
    return {
        "week_start": week_start.isoformat(),
        "contractors": payroll,
        "total_owed": total_owed,
        "pay_per_stop": pay_per_stop
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

# ===================== CONTRACTOR NOTIFICATIONS =====================

@api_router.get("/contractor/notifications")
async def get_contractor_notifications(current_user: dict = Depends(get_contractor_user)):
    notifications = await db.notifications.find(
        {"contractor_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    unread_count = len([n for n in notifications if not n.get("read")])
    
    return {"notifications": notifications, "unread_count": unread_count}

@api_router.patch("/contractor/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_contractor_user)):
    await db.notifications.update_one(
        {"id": notification_id, "contractor_id": current_user["user_id"]},
        {"$set": {"read": True}}
    )
    return {"message": "Marked as read"}

@api_router.patch("/contractor/notifications/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_contractor_user)):
    await db.notifications.update_many(
        {"contractor_id": current_user["user_id"]},
        {"$set": {"read": True}}
    )
    return {"message": "All marked as read"}

# Admin can send custom notifications to contractors
class NotificationCreate(BaseModel):
    contractor_id: str
    title: str
    message: str

@api_router.post("/admin/notifications/send")
async def send_notification_to_contractor(notif: NotificationCreate, current_user: dict = Depends(get_admin_user)):
    notification = {
        "id": str(uuid.uuid4()),
        "contractor_id": notif.contractor_id,
        "type": "admin_message",
        "title": notif.title,
        "message": notif.message,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    return {"message": "Notification sent", "id": notification["id"]}

@api_router.post("/admin/notifications/broadcast")
async def broadcast_notification(title: str, message: str, current_user: dict = Depends(get_admin_user)):
    """Send notification to all contractors"""
    contractors = await db.users.find({"role": "contractor"}, {"_id": 0, "id": 1}).to_list(100)
    
    for contractor in contractors:
        notification = {
            "id": str(uuid.uuid4()),
            "contractor_id": contractor["id"],
            "type": "broadcast",
            "title": title,
            "message": message,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
    
    return {"message": f"Notification sent to {len(contractors)} contractors"}

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

def calculate_distance_between_coords(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two coordinates in miles using Haversine formula"""
    R = 3959  # Earth's radius in miles
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

@api_router.get("/contractor/nearby")
async def get_nearby_contractors(current_user: dict = Depends(get_contractor_user)):
    """Get list of other contractors with their current locations and distances"""
    contractors = await db.users.find(
        {"role": "contractor", "id": {"$ne": current_user["user_id"]}},
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    
    # Get current user's location
    my_location = await db.contractor_locations.find_one(
        {"contractor_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    # Get their last known locations and calculate distances
    for contractor in contractors:
        location = await db.contractor_locations.find_one(
            {"contractor_id": contractor["id"]},
            {"_id": 0}
        )
        if location:
            contractor["last_location"] = location
            contractor["is_online"] = True
            
            # Calculate distance if we have both locations
            if my_location:
                distance = calculate_distance_between_coords(
                    my_location["lat"], my_location["lng"],
                    location["lat"], location["lng"]
                )
                contractor["distance_miles"] = round(distance, 1)
        else:
            contractor["is_online"] = False
            contractor["distance_miles"] = None
    
    # Sort by distance (closest first), online contractors first
    contractors.sort(key=lambda x: (not x.get("is_online"), x.get("distance_miles") or 9999))
    
    return {"contractors": contractors, "my_location": my_location}

@api_router.post("/contractor/location")
async def update_location(lat: float, lng: float, current_user: dict = Depends(get_contractor_user)):
    """Update contractor's current location for proximity tracking"""
    await db.contractor_locations.update_one(
        {"contractor_id": current_user["user_id"]},
        {"$set": {
            "contractor_id": current_user["user_id"],
            "lat": lat,
            "lng": lng,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "sharing_enabled": True
        }},
        upsert=True
    )
    return {"message": "Location updated"}

@api_router.post("/contractor/request-location/{target_contractor_id}")
async def request_contractor_location(target_contractor_id: str, current_user: dict = Depends(get_contractor_user)):
    """Request another contractor's exact location"""
    # Verify target exists
    target = await db.users.find_one({"id": target_contractor_id, "role": "contractor"})
    if not target:
        raise HTTPException(status_code=404, detail="Contractor not found")
    
    # Create location request
    request_doc = {
        "id": str(uuid.uuid4()),
        "requester_id": current_user["user_id"],
        "requester_name": current_user.get("username", "Unknown"),
        "target_id": target_contractor_id,
        "status": "pending",  # pending, approved, denied
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.location_requests.insert_one(request_doc)
    
    # Notify target contractor
    notification = {
        "id": str(uuid.uuid4()),
        "contractor_id": target_contractor_id,
        "type": "location_request",
        "title": "Location Request",
        "message": f"{current_user.get('username', 'A contractor')} is requesting your exact location for assistance.",
        "request_id": request_doc["id"],
        "requester_id": current_user["user_id"],
        "read": False,
        "play_sound": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    return {"message": "Location request sent", "request_id": request_doc["id"]}

@api_router.post("/contractor/location-request/{request_id}/respond")
async def respond_to_location_request(request_id: str, approve: bool, current_user: dict = Depends(get_contractor_user)):
    """Approve or deny a location request"""
    request = await db.location_requests.find_one({"id": request_id, "target_id": current_user["user_id"]})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    new_status = "approved" if approve else "denied"
    
    await db.location_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": new_status,
            "responded_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # If approved, get current location and notify requester
    if approve:
        location = await db.contractor_locations.find_one(
            {"contractor_id": current_user["user_id"]},
            {"_id": 0}
        )
        
        notification = {
            "id": str(uuid.uuid4()),
            "contractor_id": request["requester_id"],
            "type": "location_shared",
            "title": "Location Shared!",
            "message": f"{current_user.get('username', 'Contractor')} shared their location with you.",
            "location": location,
            "read": False,
            "play_sound": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
    
    return {"message": f"Location request {new_status}"}

@api_router.get("/contractor/location-requests")
async def get_location_requests(current_user: dict = Depends(get_contractor_user)):
    """Get pending location requests for the current contractor"""
    requests = await db.location_requests.find(
        {"target_id": current_user["user_id"], "status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    return {"requests": requests}

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
    
    # Create notification for recipient
    if message.recipient_id:
        # Direct message to contractor
        notification = {
            "id": str(uuid.uuid4()),
            "contractor_id": message.recipient_id,
            "type": "new_message",
            "title": "New Message",
            "message": f"{current_user.get('username', 'Someone')}: {message.content[:50]}...",
            "sender_id": current_user["user_id"],
            "read": False,
            "play_sound": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
    elif not message.recipient_id and current_user["role"] == "contractor":
        # Message to admin from contractor
        admin_notif = {
            "id": str(uuid.uuid4()),
            "type": "contractor_message",
            "title": "Contractor Message",
            "message": f"{current_user.get('username', 'Contractor')}: {message.content[:50]}...",
            "sender_id": current_user["user_id"],
            "read": False,
            "play_sound": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.admin_notifications.insert_one(admin_notif)
    
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

# SMS Helper function
async def send_sms(to_phone: str, message: str, contractor_id: str = None):
    """Send SMS via Twilio (or log if not configured)"""
    sms_log = {
        "id": str(uuid.uuid4()),
        "to_phone": to_phone,
        "message": message,
        "contractor_id": contractor_id,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if twilio_account_sid and twilio_auth_token and twilio_phone_number:
        try:
            from twilio.rest import Client
            client = Client(twilio_account_sid, twilio_auth_token)
            
            twilio_message = client.messages.create(
                body=message,
                from_=twilio_phone_number,
                to=to_phone
            )
            
            sms_log["status"] = "sent"
            sms_log["twilio_sid"] = twilio_message.sid
        except Exception as e:
            logging.error(f"Twilio SMS error: {e}")
            sms_log["status"] = "failed"
            sms_log["error"] = str(e)
    else:
        # Demo mode - log SMS without sending
        sms_log["status"] = "demo_logged"
        logging.info(f"SMS (Demo): To {to_phone}: {message}")
    
    await db.sms_logs.insert_one(sms_log)
    return sms_log

class SMSMessage(BaseModel):
    phone: str
    message: str
    booking_id: Optional[str] = None

@api_router.post("/contractor/sms/send")
async def contractor_send_sms(sms: SMSMessage, current_user: dict = Depends(get_contractor_user)):
    """Contractor sends direct SMS to customer"""
    result = await send_sms(sms.phone, sms.message, current_user["user_id"])
    
    # Log the message in conversation history
    conversation = {
        "id": str(uuid.uuid4()),
        "contractor_id": current_user["user_id"],
        "customer_phone": sms.phone,
        "booking_id": sms.booking_id,
        "direction": "outbound",
        "message": sms.message,
        "status": result["status"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.sms_conversations.insert_one(conversation)
    
    return {"message": "SMS sent", "status": result["status"], "sms_id": result["id"]}

@api_router.post("/contractor/sms/en-route/{booking_id}")
async def send_en_route_sms(booking_id: str, current_user: dict = Depends(get_contractor_user)):
    """Send auto-text when contractor is en route to customer"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    customer_phone = booking.get("customer_phone")
    customer_name = booking.get("customer_name", "Valued Customer")
    
    if not customer_phone:
        raise HTTPException(status_code=400, detail="No phone number for customer")
    
    # Get contractor name
    contractor = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    contractor_name = contractor.get("full_name", "Your technician")
    
    message = f"Hi {customer_name}! This is {contractor_name} from Up-Wash Power Washing. I'm on my way to your location and should arrive shortly. Please ensure the area is accessible. Thank you!"
    
    result = await send_sms(customer_phone, message, current_user["user_id"])
    
    # Update booking status
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "en_route_notified": True,
            "en_route_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "En-route notification sent", "status": result["status"]}

class ETANotification(BaseModel):
    booking_id: str
    contractor_lat: float
    contractor_lng: float

@api_router.post("/contractor/sms/eta-alert")
async def send_eta_alert(eta_data: ETANotification, current_user: dict = Depends(get_contractor_user)):
    """Send automated SMS when contractor is within ~10 minutes of customer location"""
    booking = await db.bookings.find_one({"id": eta_data.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check if already notified for this booking
    if booking.get("eta_notified"):
        return {"message": "ETA notification already sent", "status": "already_sent"}
    
    customer_phone = booking.get("customer_phone")
    customer_name = booking.get("customer_name", "Valued Customer")
    customer_address = booking.get("customer_address", "")
    
    if not customer_phone:
        raise HTTPException(status_code=400, detail="No phone number for customer")
    
    # Get contractor info
    contractor = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    contractor_name = contractor.get("full_name", "Your technician")
    
    # Calculate ETA using Google Maps Distance Matrix API
    eta_minutes = 10  # Default
    if google_maps_api_key and customer_address:
        try:
            origin = f"{eta_data.contractor_lat},{eta_data.contractor_lng}"
            destination = customer_address
            url = f"https://maps.googleapis.com/maps/api/distancematrix/json?origins={origin}&destinations={destination}&key={google_maps_api_key}"
            response = requests.get(url)
            data = response.json()
            
            if data.get("status") == "OK":
                elements = data.get("rows", [{}])[0].get("elements", [{}])[0]
                if elements.get("status") == "OK":
                    duration_seconds = elements.get("duration", {}).get("value", 600)
                    eta_minutes = max(1, round(duration_seconds / 60))
        except Exception as e:
            logging.error(f"Google Maps ETA calculation error: {e}")
    
    # Only send if within 15 minutes
    if eta_minutes > 15:
        return {"message": "Contractor not close enough yet", "eta_minutes": eta_minutes, "status": "too_far"}
    
    # Send SMS with ETA
    message = f"Hi {customer_name}! Your Up-Wash technician {contractor_name} is approximately {eta_minutes} minutes away. Please ensure the area is accessible for service. Thank you!"
    
    result = await send_sms(customer_phone, message, current_user["user_id"])
    
    # Mark as notified
    await db.bookings.update_one(
        {"id": eta_data.booking_id},
        {"$set": {
            "eta_notified": True,
            "eta_notified_at": datetime.now(timezone.utc).isoformat(),
            "eta_minutes": eta_minutes
        }}
    )
    
    # Also create in-app notification for customer
    notification = {
        "id": str(uuid.uuid4()),
        "booking_id": eta_data.booking_id,
        "customer_phone": customer_phone,
        "type": "eta_alert",
        "title": "Technician Arriving Soon",
        "message": message,
        "eta_minutes": eta_minutes,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.customer_messages.insert_one(notification)
    
    return {
        "message": "ETA notification sent",
        "status": result["status"],
        "eta_minutes": eta_minutes,
        "customer_name": customer_name
    }

@api_router.post("/contractor/check-proximity")
async def check_customer_proximity(eta_data: ETANotification, current_user: dict = Depends(get_contractor_user)):
    """Check if contractor is close to customer and auto-send ETA if within range"""
    booking = await db.bookings.find_one({"id": eta_data.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Already notified?
    if booking.get("eta_notified"):
        return {"should_notify": False, "reason": "already_notified"}
    
    customer_address = booking.get("customer_address", "")
    if not customer_address or not google_maps_api_key:
        return {"should_notify": False, "reason": "no_address_or_api_key"}
    
    # Calculate distance/ETA
    try:
        origin = f"{eta_data.contractor_lat},{eta_data.contractor_lng}"
        url = f"https://maps.googleapis.com/maps/api/distancematrix/json?origins={origin}&destinations={customer_address}&key={google_maps_api_key}"
        response = requests.get(url)
        data = response.json()
        
        if data.get("status") == "OK":
            elements = data.get("rows", [{}])[0].get("elements", [{}])[0]
            if elements.get("status") == "OK":
                duration_seconds = elements.get("duration", {}).get("value", 600)
                eta_minutes = max(1, round(duration_seconds / 60))
                
                # Auto-notify if within 10 minutes
                if eta_minutes <= 10:
                    return {
                        "should_notify": True,
                        "eta_minutes": eta_minutes,
                        "reason": "within_range"
                    }
                else:
                    return {
                        "should_notify": False,
                        "eta_minutes": eta_minutes,
                        "reason": "too_far"
                    }
    except Exception as e:
        logging.error(f"Proximity check error: {e}")
        return {"should_notify": False, "reason": "api_error"}
    
    return {"should_notify": False, "reason": "unknown"}

@api_router.post("/contractor/sms/completed/{booking_id}")
async def send_completion_sms(booking_id: str, current_user: dict = Depends(get_contractor_user)):
    """Send auto-text when job is completed"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    customer_phone = booking.get("customer_phone")
    customer_name = booking.get("customer_name", "Valued Customer")
    
    if not customer_phone:
        raise HTTPException(status_code=400, detail="No phone number for customer")
    
    message = f"Hi {customer_name}! Your Up-Wash Power Washing service has been completed. Thank you for choosing us! If you have any questions or feedback, please don't hesitate to reach out. Have a blessed day!"
    
    result = await send_sms(customer_phone, message, current_user["user_id"])
    
    # Update booking
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "completion_notified": True,
            "completion_notified_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Completion notification sent", "status": result["status"]}

@api_router.get("/contractor/sms/history/{customer_phone}")
async def get_sms_history(customer_phone: str, current_user: dict = Depends(get_contractor_user)):
    """Get SMS conversation history with a customer"""
    conversations = await db.sms_conversations.find(
        {"customer_phone": customer_phone, "contractor_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"messages": conversations}

@api_router.get("/admin/sms/logs")
async def get_sms_logs(current_user: dict = Depends(get_admin_user)):
    """Get all SMS logs for admin view"""
    logs = await db.sms_logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"logs": logs}

# ===================== SMS TEMPLATES FOR CONTRACTORS =====================

@api_router.get("/contractor/sms/templates")
async def get_sms_templates(current_user: dict = Depends(get_contractor_user)):
    """Get pre-populated SMS templates for efficient customer communication"""
    templates = [
        {
            "id": "en_route",
            "name": "On My Way",
            "template": "Hi {customer_name}! This is {contractor_name} from Up-Wash Power Washing. I'm on my way to your location and should arrive shortly. Please ensure the area is accessible. Thank you!",
            "category": "arrival"
        },
        {
            "id": "arrived",
            "name": "I've Arrived",
            "template": "Hi {customer_name}! I've arrived at your location. I'll begin servicing your {service_type} now. Thank you!",
            "category": "arrival"
        },
        {
            "id": "running_late",
            "name": "Running Late",
            "template": "Hi {customer_name}! I'm running about {delay} minutes behind schedule. I apologize for the delay and will be there as soon as possible. Thank you for your patience!",
            "category": "delay"
        },
        {
            "id": "need_access",
            "name": "Need Access",
            "template": "Hi {customer_name}! I'm at your location but need access to the {area}. Could you please unlock the gate/door? Thank you!",
            "category": "access"
        },
        {
            "id": "gate_code",
            "name": "Gate Code Request",
            "template": "Hi {customer_name}! I'm at your location. Could you please provide the gate code so I can access the property? Thank you!",
            "category": "access"
        },
        {
            "id": "bins_not_out",
            "name": "Bins Not Out",
            "template": "Hi {customer_name}! I'm at your location but your bins are not at the curb. Would you like me to pull them out, or should we reschedule? Please let me know. Thank you!",
            "category": "issue"
        },
        {
            "id": "weather_delay",
            "name": "Weather Delay",
            "template": "Hi {customer_name}! Due to weather conditions, we need to reschedule your service. We'll contact you soon with a new date. Thank you for understanding!",
            "category": "delay"
        },
        {
            "id": "completed",
            "name": "Job Complete",
            "template": "Hi {customer_name}! Your Up-Wash Power Washing service has been completed. Thank you for choosing us! If you have any questions, feel free to reach out. Have a blessed day!",
            "category": "completion"
        },
        {
            "id": "unable_to_service",
            "name": "Unable to Service",
            "template": "Hi {customer_name}! I was unable to complete your service today due to {reason}. We'll contact you to reschedule. Apologies for any inconvenience!",
            "category": "issue"
        },
        {
            "id": "follow_up",
            "name": "Follow-Up",
            "template": "Hi {customer_name}! Just checking in to make sure you're satisfied with your recent Up-Wash service. If you have any feedback, we'd love to hear it! Thank you!",
            "category": "follow_up"
        },
        {
            "id": "review_request",
            "name": "Review Request",
            "template": "Hi {customer_name}! Thank you for using Up-Wash! If you were happy with our service, we'd really appreciate a review on Google. It helps us serve more customers like you! Thank you!",
            "category": "follow_up"
        },
        {
            "id": "payment_reminder",
            "name": "Payment Reminder",
            "template": "Hi {customer_name}! This is a friendly reminder about your Up-Wash service payment of ${amount}. Please visit upwash.com to complete payment. Thank you!",
            "category": "payment"
        }
    ]
    return {"templates": templates}

class TemplatedSMS(BaseModel):
    booking_id: str
    template_id: str
    custom_fields: Optional[Dict[str, str]] = {}

@api_router.post("/contractor/sms/send-template")
async def send_templated_sms(sms_data: TemplatedSMS, current_user: dict = Depends(get_contractor_user)):
    """Send SMS using a pre-defined template with auto-filled customer info"""
    # Get booking info
    booking = await db.bookings.find_one({"id": sms_data.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    customer_phone = booking.get("customer_phone")
    if not customer_phone:
        raise HTTPException(status_code=400, detail="No phone number for customer")
    
    # Get contractor info
    contractor = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    contractor_name = contractor.get("full_name", "Your technician")
    
    # Get templates
    templates_response = await get_sms_templates(current_user)
    templates = {t["id"]: t["template"] for t in templates_response["templates"]}
    
    if sms_data.template_id not in templates:
        raise HTTPException(status_code=400, detail="Invalid template ID")
    
    # Get template and fill in placeholders
    template = templates[sms_data.template_id]
    
    # Auto-fill standard placeholders
    service_names = ", ".join([s.get("service_id", "").replace("_", " ").title() for s in booking.get("services", [])])
    
    replacements = {
        "customer_name": booking.get("customer_name", "Valued Customer"),
        "contractor_name": contractor_name,
        "service_type": service_names,
        "amount": f"{booking.get('total', 0):.2f}",
        "area": "property",
        "delay": "15",
        "reason": "unforeseen circumstances",
        **sms_data.custom_fields  # Allow override with custom fields
    }
    
    message = template
    for key, value in replacements.items():
        message = message.replace(f"{{{key}}}", str(value))
    
    # Send SMS
    result = await send_sms(customer_phone, message, current_user["user_id"])
    
    # Log conversation
    conversation = {
        "id": str(uuid.uuid4()),
        "contractor_id": current_user["user_id"],
        "customer_phone": customer_phone,
        "booking_id": sms_data.booking_id,
        "direction": "outbound",
        "message": message,
        "template_id": sms_data.template_id,
        "status": result["status"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.sms_conversations.insert_one(conversation)
    
    return {
        "message": "SMS sent",
        "status": result["status"],
        "sms_id": result["id"],
        "sent_message": message
    }

# ===================== TWO-WAY SMS (TWILIO WEBHOOK) =====================

@api_router.post("/webhooks/twilio/incoming")
async def handle_incoming_sms(request: Request):
    """Handle incoming SMS from customers via Twilio webhook"""
    try:
        form_data = await request.form()
        
        from_phone = form_data.get("From", "")
        to_phone = form_data.get("To", "")
        message_body = form_data.get("Body", "")
        message_sid = form_data.get("MessageSid", "")
        num_media = int(form_data.get("NumMedia", 0))
        
        if not from_phone or not message_body:
            return {"status": "error", "message": "Missing required fields"}
        
        # Check for opt-out keywords
        opt_out_keywords = ["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]
        if message_body.strip().upper() in opt_out_keywords:
            # Add to opt-out list
            await db.sms_optouts.update_one(
                {"phone": from_phone},
                {"$set": {
                    "phone": from_phone,
                    "opted_out": True,
                    "opted_out_at": datetime.now(timezone.utc).isoformat(),
                    "reason": message_body.strip().upper()
                }},
                upsert=True
            )
            
            # Update all bookings with this phone to mark opted out
            await db.bookings.update_many(
                {"customer_phone": from_phone},
                {"$set": {"sms_opted_out": True}}
            )
            
            # Send confirmation reply
            await send_sms(from_phone, "You have been unsubscribed from Up-Wash SMS notifications. Reply START to resubscribe.")
            
            return {"status": "opted_out", "phone": from_phone}
        
        # Check for opt-in keywords
        opt_in_keywords = ["START", "YES", "SUBSCRIBE"]
        if message_body.strip().upper() in opt_in_keywords:
            # Remove from opt-out list
            await db.sms_optouts.update_one(
                {"phone": from_phone},
                {"$set": {"opted_out": False, "resubscribed_at": datetime.now(timezone.utc).isoformat()}}
            )
            await db.bookings.update_many(
                {"customer_phone": from_phone},
                {"$set": {"sms_opted_out": False}}
            )
            await send_sms(from_phone, "Welcome back! You are now subscribed to Up-Wash SMS notifications.")
            return {"status": "opted_in", "phone": from_phone}
        
        # Handle media (images) for quotes
        media_urls = []
        for i in range(num_media):
            media_url = form_data.get(f"MediaUrl{i}")
            media_type = form_data.get(f"MediaContentType{i}")
            if media_url:
                media_urls.append({"url": media_url, "type": media_type})
        
        # Find the customer by phone number
        customer_booking = await db.bookings.find_one(
            {"customer_phone": from_phone},
            {"_id": 0}
        )
        
        customer_name = "Unknown Customer"
        booking_id = None
        if customer_booking:
            customer_name = customer_booking.get("customer_name", "Unknown Customer")
            booking_id = customer_booking.get("id")
        
        # Find contractor who last messaged this customer
        last_conversation = await db.sms_conversations.find_one(
            {"customer_phone": from_phone, "direction": "outbound"},
            {"_id": 0},
            sort=[("created_at", -1)]
        )
        contractor_id = last_conversation.get("contractor_id") if last_conversation else None
        
        # Store incoming message with media
        incoming_msg = {
            "id": str(uuid.uuid4()),
            "from_phone": from_phone,
            "to_phone": to_phone,
            "customer_name": customer_name,
            "booking_id": booking_id,
            "contractor_id": contractor_id,
            "message": message_body,
            "media_urls": media_urls,
            "message_sid": message_sid,
            "direction": "inbound",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.sms_conversations.insert_one(incoming_msg)
        
        # If has media, create a quote request for admin
        if media_urls:
            quote_request = {
                "id": str(uuid.uuid4()),
                "from_phone": from_phone,
                "customer_name": customer_name,
                "booking_id": booking_id,
                "message": message_body,
                "images": media_urls,
                "status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.quote_requests.insert_one(quote_request)
        
        # Create notification for contractor if found
        if contractor_id:
            notification = {
                "id": str(uuid.uuid4()),
                "contractor_id": contractor_id,
                "type": "customer_sms_reply",
                "title": f"SMS from {customer_name}",
                "message": message_body[:100] + ("..." if len(message_body) > 100 else ""),
                "full_message": message_body,
                "from_phone": from_phone,
                "booking_id": booking_id,
                "has_media": len(media_urls) > 0,
                "read": False,
                "play_sound": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.notifications.insert_one(notification)
        
        # Also notify admin
        admin_notif = {
            "id": str(uuid.uuid4()),
            "type": "incoming_sms",
            "title": f"SMS from {customer_name}" + (" [📷 Images]" if media_urls else ""),
            "message": f"{from_phone}: {message_body[:100]}...",
            "full_message": message_body,
            "from_phone": from_phone,
            "booking_id": booking_id,
            "has_media": len(media_urls) > 0,
            "media_urls": media_urls,
            "read": False,
            "play_sound": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.admin_notifications.insert_one(admin_notif)
        
        # Return TwiML response (empty to acknowledge receipt)
        return {"status": "received", "message_id": incoming_msg["id"], "has_media": len(media_urls) > 0}
        
    except Exception as e:
        logging.error(f"Twilio webhook error: {e}")
        return {"status": "error", "message": str(e)}

# ===================== SMS OPT-OUT MANAGEMENT =====================

@api_router.get("/admin/sms/optouts")
async def get_sms_optouts(current_user: dict = Depends(get_admin_user)):
    """Get list of customers who have opted out of SMS"""
    optouts = await db.sms_optouts.find({"opted_out": True}, {"_id": 0}).to_list(500)
    return {"optouts": optouts}

@api_router.post("/admin/sms/optout/{phone}")
async def manual_optout(phone: str, current_user: dict = Depends(get_admin_user)):
    """Manually opt out a customer from SMS"""
    await db.sms_optouts.update_one(
        {"phone": phone},
        {"$set": {"phone": phone, "opted_out": True, "opted_out_at": datetime.now(timezone.utc).isoformat(), "reason": "admin_manual"}},
        upsert=True
    )
    await db.bookings.update_many({"customer_phone": phone}, {"$set": {"sms_opted_out": True}})
    return {"message": f"{phone} has been opted out of SMS"}

@api_router.delete("/admin/sms/optout/{phone}")
async def remove_optout(phone: str, current_user: dict = Depends(get_admin_user)):
    """Remove a customer from opt-out list"""
    await db.sms_optouts.update_one({"phone": phone}, {"$set": {"opted_out": False}})
    await db.bookings.update_many({"customer_phone": phone}, {"$set": {"sms_opted_out": False}})
    return {"message": f"{phone} has been re-subscribed to SMS"}

# ===================== QUOTE REQUESTS (SMS WITH IMAGES) =====================

@api_router.get("/admin/quotes")
async def get_quote_requests(current_user: dict = Depends(get_admin_user)):
    """Get all quote requests from SMS (with images)"""
    quotes = await db.quote_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"quotes": quotes}

class QuoteResponse(BaseModel):
    quote_id: str
    price: float
    message: str
    send_payment_link: bool = True

@api_router.post("/admin/quotes/respond")
async def respond_to_quote(quote: QuoteResponse, current_user: dict = Depends(get_admin_user)):
    """Respond to a quote request with price and payment link"""
    quote_request = await db.quote_requests.find_one({"id": quote.quote_id}, {"_id": 0})
    if not quote_request:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    phone = quote_request.get("from_phone")
    customer_name = quote_request.get("customer_name", "Valued Customer")
    
    # Create payment link if requested
    payment_link = ""
    if quote.send_payment_link:
        # Generate unique booking token
        booking_token = str(uuid.uuid4())[:8]
        payment_link = f"\n\nPay & Confirm: https://2d2346dc-8745-4260-8e34-088886d923bd.preview.emergentagent.com/pay/{booking_token}"
        
        # Store pending quote booking
        pending_booking = {
            "id": str(uuid.uuid4()),
            "token": booking_token,
            "customer_phone": phone,
            "customer_name": customer_name,
            "quote_price": quote.price,
            "quote_message": quote.message,
            "images": quote_request.get("images", []),
            "status": "pending_payment",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.pending_bookings.insert_one(pending_booking)
    
    # Send SMS response
    message = f"Hi {customer_name}! {quote.message}\n\nQuoted Price: ${quote.price:.2f}{payment_link}\n\nReply STOP to opt out."
    result = await send_sms(phone, message)
    
    # Update quote status
    await db.quote_requests.update_one(
        {"id": quote.quote_id},
        {"$set": {
            "status": "responded",
            "response_price": quote.price,
            "response_message": quote.message,
            "responded_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Quote response sent", "status": result["status"], "payment_link": payment_link}

# ===================== CUSTOMER & CONTRACTOR EDITING =====================

class CustomerUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    notes: Optional[str] = None

@api_router.put("/admin/customers/{booking_id}")
async def update_customer_info(booking_id: str, customer: CustomerUpdate, current_user: dict = Depends(get_admin_user)):
    """Update customer information for a booking"""
    update_data = {k: v for k, v in customer.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.bookings.update_one(
        {"id": booking_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return {"message": "Customer information updated"}

class ContractorUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    pay_rate: Optional[float] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

@api_router.put("/admin/contractors/{contractor_id}")
async def update_contractor_info(contractor_id: str, contractor: ContractorUpdate, current_user: dict = Depends(get_admin_user)):
    """Update contractor personal information"""
    update_data = {k: v for k, v in contractor.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.users.update_one(
        {"id": contractor_id, "role": "contractor"},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contractor not found")
    
    return {"message": "Contractor information updated"}

@api_router.get("/admin/contractors/{contractor_id}")
async def get_contractor_details(contractor_id: str, current_user: dict = Depends(get_admin_user)):
    """Get detailed contractor information"""
    contractor = await db.users.find_one(
        {"id": contractor_id, "role": "contractor"},
        {"_id": 0, "password_hash": 0}
    )
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")
    return contractor

# ===================== SEPARATED SMS THREADS =====================

class DirectSMS(BaseModel):
    recipient_id: str  # contractor_id
    message: str

@api_router.post("/admin/sms/direct")
async def send_direct_sms_to_contractor(sms: DirectSMS, current_user: dict = Depends(get_admin_user)):
    """Send SMS directly to a specific contractor (private thread)"""
    contractor = await db.users.find_one({"id": sms.recipient_id, "role": "contractor"}, {"_id": 0})
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")
    
    phone = contractor.get("phone")
    if not phone:
        raise HTTPException(status_code=400, detail="Contractor has no phone number")
    
    result = await send_sms(phone, sms.message)
    
    # Store in private thread
    thread_msg = {
        "id": str(uuid.uuid4()),
        "thread_type": "direct",
        "sender_type": "admin",
        "sender_id": current_user["user_id"],
        "recipient_type": "contractor",
        "recipient_id": sms.recipient_id,
        "recipient_name": contractor.get("full_name"),
        "recipient_phone": phone,
        "message": sms.message,
        "status": result["status"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.sms_threads.insert_one(thread_msg)
    
    # Create notification for contractor
    notification = {
        "id": str(uuid.uuid4()),
        "contractor_id": sms.recipient_id,
        "type": "admin_direct_sms",
        "title": "Direct Message from Admin",
        "message": sms.message[:100] + ("..." if len(sms.message) > 100 else ""),
        "full_message": sms.message,
        "read": False,
        "play_sound": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    return {"message": "Direct SMS sent", "status": result["status"]}

class GroupSMS(BaseModel):
    recipient_ids: List[str]  # list of contractor_ids
    message: str
    group_name: Optional[str] = None

@api_router.post("/admin/sms/group")
async def send_group_sms(sms: GroupSMS, current_user: dict = Depends(get_admin_user)):
    """Send SMS to a group of contractors"""
    group_id = str(uuid.uuid4())
    group_name = sms.group_name or f"Group {datetime.now().strftime('%m/%d %H:%M')}"
    
    sent_count = 0
    failed_count = 0
    
    for contractor_id in sms.recipient_ids:
        contractor = await db.users.find_one({"id": contractor_id, "role": "contractor"}, {"_id": 0})
        if not contractor:
            continue
        
        phone = contractor.get("phone")
        if not phone:
            failed_count += 1
            continue
        
        result = await send_sms(phone, sms.message)
        
        # Store in group thread
        thread_msg = {
            "id": str(uuid.uuid4()),
            "thread_type": "group",
            "group_id": group_id,
            "group_name": group_name,
            "sender_type": "admin",
            "sender_id": current_user["user_id"],
            "recipient_type": "contractor",
            "recipient_id": contractor_id,
            "recipient_name": contractor.get("full_name"),
            "recipient_phone": phone,
            "message": sms.message,
            "status": result["status"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.sms_threads.insert_one(thread_msg)
        
        if result["status"] == "sent":
            sent_count += 1
        else:
            failed_count += 1
        
        # Create notification
        notification = {
            "id": str(uuid.uuid4()),
            "contractor_id": contractor_id,
            "type": "admin_group_sms",
            "title": f"Group Message: {group_name}",
            "message": sms.message[:100] + ("..." if len(sms.message) > 100 else ""),
            "full_message": sms.message,
            "group_id": group_id,
            "read": False,
            "play_sound": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
    
    return {
        "message": f"Group SMS sent to {sent_count} contractors",
        "group_id": group_id,
        "sent": sent_count,
        "failed": failed_count
    }

@api_router.get("/admin/sms/threads")
async def get_sms_threads(current_user: dict = Depends(get_admin_user)):
    """Get all SMS threads (direct and group)"""
    threads = await db.sms_threads.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Group by thread type and recipient/group
    direct_threads = {}
    group_threads = {}
    
    for msg in threads:
        if msg.get("thread_type") == "direct":
            recipient_id = msg.get("recipient_id")
            if recipient_id not in direct_threads:
                direct_threads[recipient_id] = {
                    "recipient_id": recipient_id,
                    "recipient_name": msg.get("recipient_name"),
                    "messages": []
                }
            direct_threads[recipient_id]["messages"].append(msg)
        elif msg.get("thread_type") == "group":
            group_id = msg.get("group_id")
            if group_id not in group_threads:
                group_threads[group_id] = {
                    "group_id": group_id,
                    "group_name": msg.get("group_name"),
                    "recipients": set(),
                    "messages": []
                }
            group_threads[group_id]["recipients"].add(msg.get("recipient_name"))
            group_threads[group_id]["messages"].append(msg)
    
    # Convert sets to lists
    for gid in group_threads:
        group_threads[gid]["recipients"] = list(group_threads[gid]["recipients"])
    
    return {
        "direct_threads": list(direct_threads.values()),
        "group_threads": list(group_threads.values())
    }

@api_router.get("/admin/sms/thread/{contractor_id}")
async def get_contractor_thread(contractor_id: str, current_user: dict = Depends(get_admin_user)):
    """Get SMS thread with a specific contractor"""
    messages = await db.sms_threads.find(
        {"$or": [
            {"recipient_id": contractor_id, "thread_type": "direct"},
            {"sender_id": contractor_id}
        ]},
        {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    
    return {"messages": messages}

@api_router.get("/contractor/sms/inbox")
async def get_contractor_sms_inbox(current_user: dict = Depends(get_contractor_user)):
    """Get incoming SMS messages for contractor"""
    messages = await db.sms_conversations.find(
        {"contractor_id": current_user["user_id"], "direction": "inbound"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"messages": messages}

@api_router.get("/admin/sms/inbox")
async def get_admin_sms_inbox(current_user: dict = Depends(get_admin_user)):
    """Get all incoming SMS messages for admin"""
    messages = await db.sms_conversations.find(
        {"direction": "inbound"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    
    return {"messages": messages}

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
    
    notified = 0
    for booking in bookings:
        phone = booking.get("customer_phone")
        name = booking.get("customer_name", "Valued Customer")
        if phone:
            message = f"Hi {name}! Up-Wash Power Washing will be servicing your home soon. Please ensure your bins are at the curb. Thank you!"
            await send_sms(phone, message)
            notified += 1
    
    return {
        "message": f"Notifications sent to {notified} clients",
        "notification_text": "We will be servicing your home soon, please be sure to set your bin to the curb!"
    }

# ===================== ADMIN-CONTRACTOR SMS COMMUNICATION =====================

class AdminContractorSMS(BaseModel):
    contractor_id: str
    message: str

@api_router.post("/admin/sms/contractor")
async def admin_send_sms_to_contractor(sms_data: AdminContractorSMS, current_user: dict = Depends(get_admin_user)):
    """Admin sends SMS directly to a contractor"""
    # Get contractor info
    contractor = await db.users.find_one({"id": sms_data.contractor_id, "role": "contractor"}, {"_id": 0})
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")
    
    phone = contractor.get("phone")
    if not phone:
        raise HTTPException(status_code=400, detail="Contractor has no phone number")
    
    # Send SMS via Twilio
    result = await send_sms(phone, sms_data.message)
    
    # Log the admin-contractor conversation
    conversation_log = {
        "id": str(uuid.uuid4()),
        "sender_type": "admin",
        "sender_id": current_user["user_id"],
        "recipient_type": "contractor",
        "recipient_id": sms_data.contractor_id,
        "recipient_name": contractor.get("full_name", contractor.get("username")),
        "recipient_phone": phone,
        "direction": "outbound",
        "message": sms_data.message,
        "status": result["status"],
        "channel": "sms",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admin_contractor_messages.insert_one(conversation_log)
    
    # Also create in-app notification for contractor
    notification = {
        "id": str(uuid.uuid4()),
        "contractor_id": sms_data.contractor_id,
        "type": "admin_sms",
        "title": "SMS from Admin",
        "message": sms_data.message[:100] + ("..." if len(sms_data.message) > 100 else ""),
        "full_message": sms_data.message,
        "read": False,
        "play_sound": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    return {
        "message": "SMS sent to contractor",
        "status": result["status"],
        "sms_id": result["id"],
        "contractor_name": contractor.get("full_name", contractor.get("username"))
    }

class ContractorLoginSMS(BaseModel):
    contractor_id: str
    include_password: bool = True  # If false, only sends username

@api_router.post("/admin/sms/contractor/login")
async def send_contractor_login_sms(login_sms: ContractorLoginSMS, current_user: dict = Depends(get_admin_user)):
    """Admin sends contractor login credentials via SMS"""
    contractor = await db.users.find_one({"id": login_sms.contractor_id, "role": "contractor"}, {"_id": 0})
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")
    
    phone = contractor.get("phone")
    if not phone:
        raise HTTPException(status_code=400, detail="Contractor has no phone number")
    
    username = contractor.get("username")
    full_name = contractor.get("full_name", username)
    
    # Generate a temporary password if needed
    if login_sms.include_password:
        # Generate new temporary password
        temp_password = f"Upwash{str(uuid.uuid4())[:6]}"
        
        # Update contractor's password
        await db.users.update_one(
            {"id": login_sms.contractor_id},
            {"$set": {
                "password_hash": hash_password(temp_password),
                "temp_password": True,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        message = f"Hi {full_name}! Your Up-Wash contractor login credentials:\n\nUsername: {username}\nPassword: {temp_password}\n\nLogin at: https://upwash.com/contractor/login\n\nPlease change your password after first login."
    else:
        message = f"Hi {full_name}! Your Up-Wash contractor username is: {username}\n\nLogin at: https://upwash.com/contractor/login\n\nContact admin if you need password reset."
    
    # Send SMS
    result = await send_sms(phone, message)
    
    # Log the credential SMS
    log_entry = {
        "id": str(uuid.uuid4()),
        "contractor_id": login_sms.contractor_id,
        "contractor_name": full_name,
        "phone": phone,
        "type": "login_credentials",
        "included_password": login_sms.include_password,
        "status": result["status"],
        "sent_by": current_user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.credential_sms_logs.insert_one(log_entry)
    
    return {
        "message": "Login credentials sent via SMS",
        "status": result["status"],
        "contractor_name": full_name,
        "included_password": login_sms.include_password
    }

@api_router.post("/admin/contractors/create-and-notify")
async def create_contractor_and_send_login(contractor: ContractorCreate, current_user: dict = Depends(get_admin_user)):
    """Create a new contractor and send login credentials via SMS"""
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
    
    # Send login credentials via SMS if phone provided
    sms_result = None
    if contractor.phone:
        message = f"Welcome to Up-Wash, {contractor.full_name}!\n\nYour contractor login credentials:\nUsername: {contractor.username}\nPassword: {contractor.password}\n\nLogin at: https://upwash.com/contractor/login"
        sms_result = await send_sms(contractor.phone, message)
        
        # Log credential SMS
        log_entry = {
            "id": str(uuid.uuid4()),
            "contractor_id": user_doc["id"],
            "contractor_name": contractor.full_name,
            "phone": contractor.phone,
            "type": "new_account_credentials",
            "status": sms_result["status"],
            "sent_by": current_user["user_id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.credential_sms_logs.insert_one(log_entry)
    
    return {
        "id": user_doc["id"],
        "username": contractor.username,
        "message": "Contractor created",
        "sms_sent": sms_result is not None,
        "sms_status": sms_result["status"] if sms_result else "no_phone"
    }

class ContractorToAdminSMS(BaseModel):
    message: str

@api_router.post("/contractor/sms/admin")
async def contractor_send_sms_to_admin(sms_data: ContractorToAdminSMS, current_user: dict = Depends(get_contractor_user)):
    """Contractor sends SMS to admin (replies back)"""
    # Get admin phone (from settings or environment)
    admin_phone = os.environ.get('ADMIN_PHONE', '')
    
    if not admin_phone:
        # Fallback: Log as in-app message only
        conversation_log = {
            "id": str(uuid.uuid4()),
            "sender_type": "contractor",
            "sender_id": current_user["user_id"],
            "sender_name": current_user.get("username", "Contractor"),
            "recipient_type": "admin",
            "direction": "inbound",
            "message": sms_data.message,
            "status": "in_app_only",
            "channel": "in_app",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.admin_contractor_messages.insert_one(conversation_log)
        
        # Create admin notification
        admin_notif = {
            "id": str(uuid.uuid4()),
            "type": "contractor_sms_reply",
            "title": f"Message from {current_user.get('username', 'Contractor')}",
            "message": sms_data.message[:100] + ("..." if len(sms_data.message) > 100 else ""),
            "full_message": sms_data.message,
            "sender_id": current_user["user_id"],
            "read": False,
            "play_sound": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.admin_notifications.insert_one(admin_notif)
        
        return {"message": "Message sent to admin (in-app)", "status": "in_app_only"}
    
    # Send SMS to admin
    contractor = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    contractor_name = contractor.get("full_name", contractor.get("username", "Contractor"))
    
    full_message = f"[From: {contractor_name}]\n{sms_data.message}"
    result = await send_sms(admin_phone, full_message, current_user["user_id"])
    
    # Log conversation
    conversation_log = {
        "id": str(uuid.uuid4()),
        "sender_type": "contractor",
        "sender_id": current_user["user_id"],
        "sender_name": contractor_name,
        "recipient_type": "admin",
        "recipient_phone": admin_phone,
        "direction": "inbound",
        "message": sms_data.message,
        "status": result["status"],
        "channel": "sms",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admin_contractor_messages.insert_one(conversation_log)
    
    return {"message": "SMS sent to admin", "status": result["status"]}

@api_router.get("/admin/sms/contractor/history/{contractor_id}")
async def get_admin_contractor_sms_history(contractor_id: str, current_user: dict = Depends(get_admin_user)):
    """Get SMS conversation history between admin and a contractor"""
    messages = await db.admin_contractor_messages.find(
        {"$or": [
            {"recipient_id": contractor_id, "sender_type": "admin"},
            {"sender_id": contractor_id, "sender_type": "contractor"}
        ]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"messages": messages}

@api_router.get("/contractor/sms/admin/history")
async def get_contractor_admin_sms_history(current_user: dict = Depends(get_contractor_user)):
    """Get contractor's SMS conversation history with admin"""
    messages = await db.admin_contractor_messages.find(
        {"$or": [
            {"recipient_id": current_user["user_id"], "recipient_type": "contractor"},
            {"sender_id": current_user["user_id"], "sender_type": "contractor"}
        ]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"messages": messages}

@api_router.get("/admin/sms/contractors/all")
async def get_all_admin_contractor_messages(current_user: dict = Depends(get_admin_user)):
    """Get all admin-contractor SMS messages"""
    messages = await db.admin_contractor_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"messages": messages}

# ===================== AUTOMATED PAYROLL SYSTEM =====================

@api_router.get("/admin/payroll/pending")
async def get_pending_payroll(current_user: dict = Depends(get_admin_user)):
    """Get all contractors with unpaid earnings"""
    pay_per_stop = await get_pay_per_stop()
    
    # Get all contractors
    contractors = await db.users.find({"role": "contractor"}, {"_id": 0, "password_hash": 0}).to_list(100)
    
    payroll_summary = []
    total_pending = 0
    
    for contractor in contractors:
        # Get completed stops since last payout
        last_payout = await db.payroll_history.find_one(
            {"contractor_id": contractor["id"]},
            {"_id": 0},
            sort=[("paid_at", -1)]
        )
        
        last_paid_date = last_payout.get("paid_at") if last_payout else None
        
        # Query for completed stops
        stop_query = {
            "assigned_contractor_id": contractor["id"],
            "task_status": "completed"
        }
        if last_paid_date:
            stop_query["completed_at"] = {"$gt": last_paid_date}
        
        completed_stops = await db.bookings.count_documents(stop_query)
        unpaid_amount = completed_stops * pay_per_stop
        
        # Get CNS stops (no pay)
        cns_query = {
            "assigned_contractor_id": contractor["id"],
            "task_status": "cns"
        }
        if last_paid_date:
            cns_query["completed_at"] = {"$gt": last_paid_date}
        
        cns_stops = await db.bookings.count_documents(cns_query)
        
        if completed_stops > 0 or cns_stops > 0:
            payroll_summary.append({
                "contractor_id": contractor["id"],
                "contractor_name": contractor.get("full_name", contractor.get("username")),
                "phone": contractor.get("phone", ""),
                "completed_stops": completed_stops,
                "cns_stops": cns_stops,
                "unpaid_amount": unpaid_amount,
                "last_paid": last_paid_date
            })
            total_pending += unpaid_amount
    
    return {
        "payroll_summary": payroll_summary,
        "total_pending": total_pending,
        "pay_rate": pay_per_stop
    }

@api_router.post("/admin/payroll/process/{contractor_id}")
async def process_payroll(contractor_id: str, current_user: dict = Depends(get_admin_user)):
    """Process payroll for a contractor (mark as paid)"""
    pay_per_stop = await get_pay_per_stop()
    
    contractor = await db.users.find_one({"id": contractor_id, "role": "contractor"}, {"_id": 0})
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")
    
    # Get last payout
    last_payout = await db.payroll_history.find_one(
        {"contractor_id": contractor_id},
        {"_id": 0},
        sort=[("paid_at", -1)]
    )
    last_paid_date = last_payout.get("paid_at") if last_payout else None
    
    # Get completed stops
    stop_query = {"assigned_contractor_id": contractor_id, "task_status": "completed"}
    if last_paid_date:
        stop_query["completed_at"] = {"$gt": last_paid_date}
    
    completed_stops = await db.bookings.find(stop_query, {"_id": 0, "id": 1}).to_list(1000)
    stops_count = len(completed_stops)
    amount = stops_count * pay_per_stop
    
    if stops_count == 0:
        return {"message": "No unpaid stops to process", "amount": 0}
    
    # Create payroll record
    payroll_record = {
        "id": str(uuid.uuid4()),
        "contractor_id": contractor_id,
        "contractor_name": contractor.get("full_name", contractor.get("username")),
        "stops_paid": stops_count,
        "pay_rate": pay_per_stop,
        "amount": amount,
        "booking_ids": [s["id"] for s in completed_stops],
        "paid_at": datetime.now(timezone.utc).isoformat(),
        "paid_by": current_user["user_id"],
        "period_start": last_paid_date,
        "period_end": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payroll_history.insert_one(payroll_record)
    
    # Notify contractor
    notification = {
        "id": str(uuid.uuid4()),
        "contractor_id": contractor_id,
        "type": "payroll_processed",
        "title": "Payment Processed!",
        "message": f"Your payment of ${amount:.2f} for {stops_count} stops has been processed.",
        "read": False,
        "play_sound": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    return {
        "message": "Payroll processed",
        "amount": amount,
        "stops_paid": stops_count,
        "payroll_id": payroll_record["id"]
    }

@api_router.post("/admin/payroll/process-all")
async def process_all_payroll(current_user: dict = Depends(get_admin_user)):
    """Process payroll for all contractors with unpaid earnings"""
    pending = await get_pending_payroll(current_user)
    
    processed = []
    total_paid = 0
    
    for contractor in pending["payroll_summary"]:
        if contractor["unpaid_amount"] > 0:
            result = await process_payroll(contractor["contractor_id"], current_user)
            processed.append({
                "contractor_name": contractor["contractor_name"],
                "amount": result["amount"],
                "stops": result["stops_paid"]
            })
            total_paid += result["amount"]
    
    return {
        "message": f"Payroll processed for {len(processed)} contractors",
        "total_paid": total_paid,
        "processed": processed
    }

@api_router.get("/admin/payroll/history")
async def get_payroll_history(current_user: dict = Depends(get_admin_user)):
    """Get payroll history for all contractors"""
    history = await db.payroll_history.find({}, {"_id": 0}).sort("paid_at", -1).to_list(500)
    
    # Group by week
    weekly_totals = {}
    for record in history:
        paid_at = record.get("paid_at", "")[:10]  # Get date part
        week_key = paid_at[:7]  # Year-month for grouping
        if week_key not in weekly_totals:
            weekly_totals[week_key] = {"total": 0, "stops": 0, "payments": 0}
        weekly_totals[week_key]["total"] += record.get("amount", 0)
        weekly_totals[week_key]["stops"] += record.get("stops_paid", 0)
        weekly_totals[week_key]["payments"] += 1
    
    return {
        "history": history,
        "weekly_summary": weekly_totals,
        "total_paid_all_time": sum(r.get("amount", 0) for r in history)
    }

@api_router.get("/contractor/payroll/history")
async def get_contractor_payroll_history(current_user: dict = Depends(get_contractor_user)):
    """Get payroll history for current contractor"""
    pay_per_stop = await get_pay_per_stop()
    
    history = await db.payroll_history.find(
        {"contractor_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("paid_at", -1).to_list(100)
    
    total_earned = sum(r.get("amount", 0) for r in history)
    total_stops = sum(r.get("stops_paid", 0) for r in history)
    
    return {
        "history": history,
        "total_earned": total_earned,
        "total_stops_paid": total_stops,
        "pay_rate": pay_per_stop
    }

# ===================== INQUIRY ROUTES (Contact Form) =====================

class InquiryCreate(BaseModel):
    name: str
    email: str
    phone: str
    message: str

@api_router.post("/inquiries")
async def create_inquiry(inquiry: InquiryCreate):
    inquiry_doc = {
        "id": str(uuid.uuid4()),
        "name": inquiry.name,
        "email": inquiry.email,
        "phone": inquiry.phone,
        "message": inquiry.message,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.inquiries.insert_one(inquiry_doc)
    return {"message": "Inquiry submitted", "id": inquiry_doc["id"]}

@api_router.get("/admin/inquiries")
async def list_inquiries(current_user: dict = Depends(get_admin_user)):
    inquiries = await db.inquiries.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"inquiries": inquiries}

@api_router.patch("/admin/inquiries/{inquiry_id}/read")
async def mark_inquiry_read(inquiry_id: str, current_user: dict = Depends(get_admin_user)):
    await db.inquiries.update_one(
        {"id": inquiry_id},
        {"$set": {"read": True}}
    )
    return {"message": "Marked as read"}

# ===================== QUOTE MANAGEMENT ROUTES =====================

class QuoteUpdate(BaseModel):
    date: str
    time: str
    price: float

@api_router.post("/admin/quotes/{booking_id}/send-invoice")
async def send_quote_invoice(booking_id: str, quote: QuoteUpdate, current_user: dict = Depends(get_admin_user)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if not booking.get("customer_email"):
        raise HTTPException(status_code=400, detail="Customer email required")
    
    # Update booking with quote details
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "booking_dates": [quote.date],
            "booking_time": quote.time,
            "total": quote.price,
            "quote_sent": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # In production, send email with Square payment link
    # For now, return success
    return {
        "success": True,
        "message": f"Quote invoice sent to {booking.get('customer_email')}",
        "amount": quote.price
    }

# ===================== SUBSCRIPTION MANAGEMENT ROUTES =====================

class SubscriptionUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    monthly_service_days: Optional[List[int]] = None
    service_days_per_month: Optional[int] = None
    services: Optional[List[Dict]] = None

class SubscriptionDelete(BaseModel):
    reason: str

@api_router.get("/admin/subscriptions")
async def list_subscriptions(current_user: dict = Depends(get_admin_user)):
    """Get all monthly subscriptions"""
    subscriptions = await db.bookings.find(
        {"is_monthly": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return {"subscriptions": subscriptions}

@api_router.get("/admin/subscriptions/{subscription_id}")
async def get_subscription(subscription_id: str, current_user: dict = Depends(get_admin_user)):
    """Get single subscription details"""
    subscription = await db.bookings.find_one(
        {"id": subscription_id, "is_monthly": True},
        {"_id": 0}
    )
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return subscription

@api_router.patch("/admin/subscriptions/{subscription_id}")
async def update_subscription(subscription_id: str, update: SubscriptionUpdate, current_user: dict = Depends(get_admin_user)):
    """Update subscription information"""
    subscription = await db.bookings.find_one({"id": subscription_id, "is_monthly": True})
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if update.customer_name:
        update_data["customer_name"] = update.customer_name
    if update.customer_email:
        update_data["customer_email"] = update.customer_email
    if update.customer_phone:
        update_data["customer_phone"] = update.customer_phone
    if update.customer_address:
        update_data["customer_address"] = update.customer_address
    if update.monthly_service_days:
        update_data["monthly_service_days"] = update.monthly_service_days
    if update.service_days_per_month:
        update_data["service_days_per_month"] = update.service_days_per_month
    if update.services:
        update_data["services"] = update.services
        # Recalculate pricing
        pricing = calculate_booking_total(
            update.services,
            subscription.get("distance_miles", 0),
            True,
            update.service_days_per_month or subscription.get("service_days_per_month", 1)
        )
        update_data.update({
            "subtotal": pricing["subtotal"],
            "tax": pricing["tax"],
            "discount": pricing["discount"],
            "total": pricing["total"]
        })
    
    await db.bookings.update_one(
        {"id": subscription_id},
        {"$set": update_data}
    )
    
    return {"message": "Subscription updated", "subscription_id": subscription_id}

@api_router.delete("/admin/subscriptions/{subscription_id}")
async def delete_subscription(subscription_id: str, delete_data: SubscriptionDelete, current_user: dict = Depends(get_admin_user)):
    """Delete subscription and keep history"""
    subscription = await db.bookings.find_one({"id": subscription_id, "is_monthly": True}, {"_id": 0})
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    # Save to deleted subscriptions history
    deleted_record = {
        "id": str(uuid.uuid4()),
        "original_subscription_id": subscription_id,
        "subscription_data": subscription,
        "deletion_reason": delete_data.reason,
        "deleted_by": current_user.get("username", "admin"),
        "deleted_at": datetime.now(timezone.utc).isoformat()
    }
    await db.deleted_subscriptions.insert_one(deleted_record)
    
    # Remove from active bookings
    await db.bookings.delete_one({"id": subscription_id})
    
    # Remove from any routes
    await db.routes.update_many(
        {"bookings": subscription_id},
        {"$pull": {"bookings": subscription_id}}
    )
    
    return {"message": "Subscription deleted", "deleted_record_id": deleted_record["id"]}

@api_router.get("/admin/deleted-subscriptions")
async def list_deleted_subscriptions(current_user: dict = Depends(get_admin_user)):
    """Get history of all deleted subscriptions"""
    deleted = await db.deleted_subscriptions.find({}, {"_id": 0}).sort("deleted_at", -1).to_list(500)
    return {"deleted_subscriptions": deleted}

# ===================== ROUTE RELEASE SYSTEM =====================

# Contractor pay rate - $11 per stop (consistent across all route operations)
# Note: CONTRACTOR_PAY_PER_STOP is defined earlier as $11/stop

class RouteRelease(BaseModel):
    reason: Optional[str] = None

@api_router.post("/contractor/routes/{route_id}/release")
async def release_route(route_id: str, release: RouteRelease, current_user: dict = Depends(get_contractor_user)):
    """Contractor releases a route back to admin - automatically moves to released routes"""
    pay_per_stop = await get_pay_per_stop()
    
    route = await db.routes.find_one({"id": route_id}, {"_id": 0})
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    if route.get("assigned_contractor_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="You are not assigned to this route")
    
    # Get contractor name
    contractor = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    contractor_name = contractor.get("full_name", contractor.get("username", "Unknown"))
    
    # Calculate contractor payment for this route
    num_stops = len(route.get("bookings", []))
    contractor_pay = num_stops * pay_per_stop
    
    # Create released route record
    released_route = {
        "id": str(uuid.uuid4()),
        "route_id": route_id,
        "route_name": route.get("name"),
        "route_area": route.get("area"),
        "zip_code": route.get("zip_code"),
        "num_stops": num_stops,
        "contractor_pay": contractor_pay,
        "pay_per_stop": pay_per_stop,
        "bookings": route.get("bookings", []),
        "released_by_contractor_id": current_user["user_id"],
        "released_by_contractor_name": contractor_name,
        "release_reason": release.reason,
        "status": "available",  # available, claimed, dispatched
        "claimed_by_contractor_id": None,
        "released_at": datetime.now(timezone.utc).isoformat(),
        "is_new": True  # Flag for flashing notification
    }
    await db.released_routes.insert_one(released_route)
    
    # REMOVE route from contractor's system completely
    await db.routes.update_one(
        {"id": route_id},
        {"$set": {
            "assigned_contractor_id": None,
            "status": "released",
            "released_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create URGENT admin notification for released route
    admin_notification = {
        "id": str(uuid.uuid4()),
        "type": "route_released",
        "title": "⚠️ ROUTE RELEASED - URGENT!",
        "message": f"Route '{route.get('name')}' was released by {contractor_name}. {num_stops} stops available for reassignment! Reason: {release.reason or 'Not specified'}",
        "route_id": route_id,
        "released_route_id": released_route["id"],
        "read": False,
        "is_urgent": True,  # Flag for flashing caution
        "play_sound": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admin_notifications.insert_one(admin_notification)
    
    return {
        "message": "Route released successfully and removed from your assignments",
        "released_route_id": released_route["id"],
        "num_stops": num_stops,
        "contractor_pay": contractor_pay
    }

@api_router.get("/admin/released-routes")
async def get_released_routes(current_user: dict = Depends(get_admin_user)):
    """Get all released routes available for dispatch"""
    released = await db.released_routes.find(
        {"status": {"$in": ["available", "dispatched"]}},
        {"_id": 0}
    ).sort("released_at", -1).to_list(100)
    
    # Count new releases for flashing indicator
    new_releases_count = len([r for r in released if r.get("is_new", False)])
    
    # Enrich with booking details
    for route in released:
        booking_ids = route.get("bookings", [])
        if booking_ids:
            bookings = await db.bookings.find(
                {"id": {"$in": booking_ids}},
                {"_id": 0, "customer_name": 1, "customer_address": 1, "services": 1}
            ).to_list(200)
            route["booking_details"] = bookings
    
    return {
        "released_routes": released,
        "new_releases_count": new_releases_count
    }

@api_router.patch("/admin/released-routes/{released_route_id}/acknowledge")
async def acknowledge_released_route(released_route_id: str, current_user: dict = Depends(get_admin_user)):
    """Mark a released route as acknowledged (stops flashing)"""
    await db.released_routes.update_one(
        {"id": released_route_id},
        {"$set": {"is_new": False}}
    )
    return {"message": "Route acknowledged"}

class RouteDispatch(BaseModel):
    contractor_id: str
    message: Optional[str] = None

@api_router.post("/admin/released-routes/{released_route_id}/dispatch")
async def dispatch_released_route(released_route_id: str, dispatch: RouteDispatch, current_user: dict = Depends(get_admin_user)):
    """Dispatch a released route to a contractor via messaging"""
    released_route = await db.released_routes.find_one({"id": released_route_id}, {"_id": 0})
    if not released_route:
        raise HTTPException(status_code=404, detail="Released route not found")
    
    if released_route.get("status") == "claimed":
        raise HTTPException(status_code=400, detail="This route has already been claimed")
    
    contractor = await db.users.find_one({"id": dispatch.contractor_id}, {"_id": 0, "full_name": 1})
    if not contractor:
        raise HTTPException(status_code=404, detail="Contractor not found")
    
    # Update released route status
    await db.released_routes.update_one(
        {"id": released_route_id},
        {"$set": {
            "status": "dispatched",
            "dispatched_to": dispatch.contractor_id,
            "dispatched_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    pay_per_stop = await get_pay_per_stop()
    
    # Send notification to contractor with route details
    # NO CHARGE - route is free for contractor
    notification = {
        "id": str(uuid.uuid4()),
        "contractor_id": dispatch.contractor_id,
        "type": "route_offer",
        "title": "Route Available!",
        "message": f"""A route is available for you to claim!
        
Route: {released_route.get('route_name')}
Area: {released_route.get('route_area', 'Not specified')}
Stops: {released_route.get('num_stops', 0)}
Your Pay: ${released_route.get('contractor_pay', 0):.2f} (${pay_per_stop}/stop)

{dispatch.message or 'Would you like to take this route?'}

This route is FREE - no purchase required!""",
        "released_route_id": released_route_id,
        "route_id": released_route.get("route_id"),
        "action_required": True,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    return {
        "message": f"Route dispatched to {contractor.get('full_name')}",
        "contractor_id": dispatch.contractor_id,
        "notification_id": notification["id"]
    }

@api_router.post("/contractor/released-routes/{released_route_id}/claim")
async def claim_released_route(released_route_id: str, current_user: dict = Depends(get_contractor_user)):
    """Contractor claims a released route (FREE - no payment required)"""
    released_route = await db.released_routes.find_one({"id": released_route_id}, {"_id": 0})
    if not released_route:
        raise HTTPException(status_code=404, detail="Released route not found")
    
    if released_route.get("status") == "claimed":
        raise HTTPException(status_code=400, detail="This route has already been claimed")
    
    route_id = released_route.get("route_id")
    
    # Assign route to contractor
    await db.routes.update_one(
        {"id": route_id},
        {"$set": {"assigned_contractor_id": current_user["user_id"]}}
    )
    
    # Update released route status
    await db.released_routes.update_one(
        {"id": released_route_id},
        {"$set": {
            "status": "claimed",
            "claimed_by_contractor_id": current_user["user_id"],
            "claimed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notify admin
    admin_notification = {
        "id": str(uuid.uuid4()),
        "type": "route_claimed",
        "title": "Route Claimed",
        "message": f"Route '{released_route.get('route_name')}' was claimed by {current_user.get('username')}",
        "route_id": route_id,
        "contractor_id": current_user["user_id"],
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admin_notifications.insert_one(admin_notification)
    
    return {
        "message": "Route claimed successfully!",
        "route_id": route_id,
        "num_stops": released_route.get("num_stops"),
        "your_pay": released_route.get("contractor_pay")
    }

@api_router.get("/contractor/available-routes")
async def get_available_routes_for_contractor(current_user: dict = Depends(get_contractor_user)):
    """Get routes dispatched to this contractor"""
    available = await db.released_routes.find(
        {
            "status": "dispatched",
            "dispatched_to": current_user["user_id"]
        },
        {"_id": 0}
    ).to_list(50)
    return {"available_routes": available}

@api_router.get("/admin/notifications")
async def get_admin_notifications(current_user: dict = Depends(get_admin_user)):
    """Get admin notifications"""
    notifications = await db.admin_notifications.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    unread_count = len([n for n in notifications if not n.get("read")])
    return {"notifications": notifications, "unread_count": unread_count}

@api_router.patch("/admin/notifications/{notification_id}/read")
async def mark_admin_notification_read(notification_id: str, current_user: dict = Depends(get_admin_user)):
    await db.admin_notifications.update_one(
        {"id": notification_id},
        {"$set": {"read": True}}
    )
    return {"message": "Marked as read"}

# ===================== ROUTE REQUEST SYSTEM =====================

class RouteRequest(BaseModel):
    zip_codes: List[str]
    num_routes: int = 1
    truck_rental: Optional[str] = None  # "small", "large", or None

@api_router.post("/contractor/route-requests")
async def create_route_request(request: RouteRequest, current_user: dict = Depends(get_contractor_user)):
    """Contractor requests routes by zip code with optional truck rental"""
    
    # Get truck rental price if selected
    truck_rental_cost = 0
    if request.truck_rental:
        truck_settings = await db.settings.find_one({"key": "truck_rentals"})
        truck_prices = truck_settings.get("value") if truck_settings else TRUCK_RENTAL_PRICES
        truck_rental_cost = truck_prices.get(request.truck_rental, 0)
    
    route_request = {
        "id": str(uuid.uuid4()),
        "contractor_id": current_user["user_id"],
        "contractor_name": current_user.get("full_name", current_user.get("username")),
        "zip_codes": request.zip_codes,
        "num_routes_requested": request.num_routes,
        "total_stops": 0,  # Will be calculated when approved
        "truck_rental": request.truck_rental,
        "truck_rental_cost": truck_rental_cost,
        "status": "pending",  # pending, approved, denied
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.route_requests.insert_one(route_request)
    
    # Notify admin
    truck_info = f" + {request.truck_rental.title()} Truck Rental (${truck_rental_cost}/week)" if request.truck_rental else ""
    notification = {
        "id": str(uuid.uuid4()),
        "type": "route_request",
        "title": "New Route Request",
        "message": f"{current_user.get('full_name')} requested {request.num_routes} route(s) in zip codes: {', '.join(request.zip_codes)}{truck_info}",
        "request_id": route_request["id"],
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admin_notifications.insert_one(notification)
    
    return {"message": "Route request submitted", "request_id": route_request["id"], "truck_rental_cost": truck_rental_cost}

@api_router.get("/contractor/truck-rentals")
async def get_truck_rental_prices(current_user: dict = Depends(get_contractor_user)):
    """Get current truck rental prices"""
    truck_settings = await db.settings.find_one({"key": "truck_rentals"})
    truck_prices = truck_settings.get("value") if truck_settings else TRUCK_RENTAL_PRICES
    
    # Get contractor's active rentals
    active_rentals = await db.truck_rentals.find(
        {"contractor_id": current_user["user_id"], "status": "active"},
        {"_id": 0}
    ).to_list(10)
    
    return {
        "prices": truck_prices,
        "active_rentals": active_rentals
    }

@api_router.post("/contractor/truck-rentals")
async def rent_truck(truck_type: str, current_user: dict = Depends(get_contractor_user)):
    """Contractor rents a truck"""
    if truck_type not in ["small", "large"]:
        raise HTTPException(status_code=400, detail="Invalid truck type. Choose 'small' or 'large'")
    
    truck_settings = await db.settings.find_one({"key": "truck_rentals"})
    truck_prices = truck_settings.get("value") if truck_settings else TRUCK_RENTAL_PRICES
    weekly_cost = truck_prices.get(truck_type, 0)
    
    rental = {
        "id": str(uuid.uuid4()),
        "contractor_id": current_user["user_id"],
        "contractor_name": current_user.get("full_name", current_user.get("username")),
        "truck_type": truck_type,
        "weekly_cost": weekly_cost,
        "status": "active",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "next_billing": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    }
    await db.truck_rentals.insert_one(rental)
    
    # Notify admin
    notification = {
        "id": str(uuid.uuid4()),
        "type": "truck_rental",
        "title": "New Truck Rental",
        "message": f"{current_user.get('full_name')} rented a {truck_type} truck (${weekly_cost}/week)",
        "rental_id": rental["id"],
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admin_notifications.insert_one(notification)
    
    return {"message": f"{truck_type.title()} truck rented successfully", "rental_id": rental["id"], "weekly_cost": weekly_cost}

@api_router.delete("/contractor/truck-rentals/{rental_id}")
async def cancel_truck_rental(rental_id: str, current_user: dict = Depends(get_contractor_user)):
    """Cancel a truck rental"""
    rental = await db.truck_rentals.find_one(
        {"id": rental_id, "contractor_id": current_user["user_id"]},
        {"_id": 0}
    )
    if not rental:
        raise HTTPException(status_code=404, detail="Rental not found")
    
    await db.truck_rentals.update_one(
        {"id": rental_id},
        {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Truck rental cancelled"}

@api_router.get("/admin/route-requests")
async def get_route_requests(current_user: dict = Depends(get_admin_user)):
    """Get all route requests"""
    requests = await db.route_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"requests": requests}

@api_router.post("/admin/route-requests/{request_id}/approve")
async def approve_route_request(request_id: str, current_user: dict = Depends(get_admin_user)):
    """Approve route request and assign routes to contractor - charges only for APPROVED routes"""
    request = await db.route_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    # Find pending routes matching zip codes
    zip_codes = request.get("zip_codes", [])
    num_requested = request.get("num_routes_requested", 1)
    
    # Get available routes (not assigned) - ONLY from pending routes
    available_routes = await db.routes.find(
        {
            "assigned_contractor_id": None,
            "status": "pending",  # Only pending routes
            "zip_code": {"$in": zip_codes} if zip_codes else {"$exists": True}
        },
        {"_id": 0}
    ).limit(num_requested).to_list(num_requested)
    
    total_stops = 0
    assigned_routes = []
    
    for route in available_routes:
        # Calculate stops in this route
        route_stops = len(route.get("bookings", []))
        total_stops += route_stops
        
        # Assign route to contractor AND move out of pending
        await db.routes.update_one(
            {"id": route["id"]},
            {"$set": {
                "assigned_contractor_id": request["contractor_id"],
                "status": "assigned",  # Move out of pending
                "assigned_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        assigned_routes.append(route["id"])
    
    # Calculate charge - ONLY for the approved/assigned stops
    pay_per_stop = await get_pay_per_stop()
    charge_amount = total_stops * pay_per_stop
    
    # Update request with actual approved data
    await db.route_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "approved",
            "total_stops": total_stops,
            "charge_amount": charge_amount,
            "pay_per_stop": pay_per_stop,
            "assigned_routes": assigned_routes,
            "approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notify contractor
    contractor_notification = {
        "id": str(uuid.uuid4()),
        "contractor_id": request["contractor_id"],
        "type": "route_approved",
        "title": "Route Request Approved!",
        "message": f"Your route request has been approved. {len(assigned_routes)} route(s) with {total_stops} stops. Charge: ${charge_amount:.2f} (${pay_per_stop}/stop)",
        "read": False,
        "play_sound": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(contractor_notification)
    
    # Create admin notification for route assignment
    admin_notif = {
        "id": str(uuid.uuid4()),
        "type": "route_assigned",
        "title": "Route Request Approved",
        "message": f"Approved {len(assigned_routes)} route(s) for contractor. {total_stops} stops = ${charge_amount:.2f} charged.",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admin_notifications.insert_one(admin_notif)
    
    return {
        "message": "Request approved - routes moved from pending",
        "routes_assigned": len(assigned_routes),
        "total_stops": total_stops,
        "charge_amount": charge_amount,
        "pay_per_stop": pay_per_stop
    }

@api_router.post("/admin/route-requests/{request_id}/deny")
async def deny_route_request(request_id: str, current_user: dict = Depends(get_admin_user)):
    """Deny route request"""
    request = await db.route_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    await db.route_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "denied",
            "denied_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notify contractor
    contractor_notification = {
        "id": str(uuid.uuid4()),
        "contractor_id": request["contractor_id"],
        "type": "route_denied",
        "title": "Route Request Denied",
        "message": "Your route request has been denied. Please contact admin for more information.",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(contractor_notification)
    
    return {"message": "Request denied"}

@api_router.get("/contractor/route-requests")
async def get_contractor_route_requests(current_user: dict = Depends(get_contractor_user)):
    """Get contractor's own route requests"""
    requests = await db.route_requests.find(
        {"contractor_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"requests": requests}

# ===================== CLIENT PORTAL ROUTES =====================

class ClientLogin(BaseModel):
    email: str
    password: str

class ClientRegister(BaseModel):
    name: str
    email: str
    phone: str
    password: str
    address: str

@api_router.post("/client/register")
async def register_client(client_data: ClientRegister):
    """Register a new client account"""
    # Check if email exists
    existing = await db.clients.find_one({"email": client_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    password_hash = bcrypt.hashpw(client_data.password.encode(), bcrypt.gensalt()).decode()
    
    client = {
        "id": str(uuid.uuid4()),
        "name": client_data.name,
        "email": client_data.email,
        "phone": client_data.phone,
        "address": client_data.address,
        "password_hash": password_hash,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.clients.insert_one(client)
    
    return {"message": "Account created successfully"}

@api_router.post("/client/login")
async def login_client(login: ClientLogin):
    """Client login"""
    client = await db.clients.find_one({"email": login.email})
    if not client:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not bcrypt.checkpw(login.password.encode(), client["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = jwt.encode({
        "sub": client["id"],
        "email": client["email"],
        "role": "client",
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }, JWT_SECRET, algorithm="HS256")
    
    return {
        "access_token": token,
        "client": {
            "id": client["id"],
            "name": client["name"],
            "email": client["email"],
            "phone": client["phone"],
            "address": client["address"]
        }
    }

@api_router.get("/client/subscription")
async def get_client_subscription(current_client: dict = Depends(get_client_user)):
    """Get client's subscription details"""
    subscription = await db.bookings.find_one(
        {"customer_email": current_client["email"], "is_monthly": True},
        {"_id": 0}
    )
    return {"subscription": subscription}

@api_router.get("/client/contracts")
async def get_client_contracts(current_client: dict = Depends(get_client_user)):
    """Get client's signed contracts"""
    contracts = await db.contracts.find(
        {"client_id": current_client["client_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"contracts": contracts}

# ===================== CONTRACT MANAGEMENT =====================

class ContractCreate(BaseModel):
    booking_id: str
    contract_type: str  # "weekly" or "biweekly"
    client_email: str
    terms: Optional[str] = None
    price_per_service: Optional[float] = None

class ContractSign(BaseModel):
    signature_data: str  # Base64 signature image
    agreed_terms: bool = True

@api_router.post("/admin/quotes/{booking_id}/send-contract")
async def send_contract(booking_id: str, contract: ContractCreate, current_user: dict = Depends(get_admin_user)):
    """Send contract to client for quote services (weekly or bi-weekly)"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Build contract terms
    service_names = [s.get("service_id", "Service").replace("_", " ").title() for s in booking.get("services", [])]
    default_terms = f"""
SERVICE AGREEMENT CONTRACT

This agreement is between Up-Wash Power Washing ("Company") and the Client.

SERVICES:
{', '.join(service_names)}

SERVICE FREQUENCY: {contract.contract_type.title()}

PRICING:
${contract.price_per_service or booking.get('total', 0):.2f} per service visit
(Price subject to 8.25% sales tax)

TERMS:
1. Services will be performed on the agreed schedule ({contract.contract_type}).
2. Payment is due 3 days before each scheduled service.
3. Either party may cancel with 7 days written notice.
4. Company reserves right to reschedule due to weather conditions.
5. Client agrees to provide clear access to service areas.

By signing below, both parties agree to the terms of this contract.
"""
    
    contract_record = {
        "id": str(uuid.uuid4()),
        "booking_id": booking_id,
        "client_email": contract.client_email,
        "client_name": booking.get("customer_name", ""),
        "client_phone": booking.get("customer_phone", ""),
        "client_address": booking.get("customer_address", ""),
        "client_id": None,  # Will be linked when client signs
        "type": contract.contract_type,
        "frequency": "Weekly" if contract.contract_type == "weekly" else "Bi-Weekly",
        "price_per_service": contract.price_per_service or booking.get("total", 0),
        "terms": contract.terms or default_terms,
        "services": booking.get("services", []),
        "status": "pending",  # pending, signed, cancelled
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "signed_at": None,
        "signature_data": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.contracts.insert_one(contract_record)
    
    # Notify client if they have an account
    client = await db.clients.find_one({"email": contract.client_email})
    if client:
        client_notif = {
            "id": str(uuid.uuid4()),
            "client_id": client["id"],
            "type": "new_contract",
            "title": "New Contract to Sign",
            "message": f"You have a new {contract.contract_type} service contract to review and sign.",
            "contract_id": contract_record["id"],
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.client_notifications.insert_one(client_notif)
    
    return {"message": "Contract sent", "contract_id": contract_record["id"]}

@api_router.get("/admin/contracts")
async def get_all_contracts(current_user: dict = Depends(get_admin_user)):
    """Get all contracts for admin view"""
    contracts = await db.contracts.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"contracts": contracts}

@api_router.get("/client/contracts/pending")
async def get_pending_contracts(current_client: dict = Depends(get_client_user)):
    """Get contracts pending client signature"""
    contracts = await db.contracts.find(
        {"client_email": current_client["email"], "status": "pending"},
        {"_id": 0}
    ).sort("sent_at", -1).to_list(50)
    return {"contracts": contracts}

@api_router.post("/client/contracts/{contract_id}/sign")
async def sign_contract(contract_id: str, sign_data: ContractSign, current_client: dict = Depends(get_client_user)):
    """Client signs a contract with digital signature"""
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if contract.get("client_email") != current_client["email"]:
        raise HTTPException(status_code=403, detail="Not your contract")
    
    if contract.get("status") == "signed":
        raise HTTPException(status_code=400, detail="Contract already signed")
    
    if not sign_data.agreed_terms:
        raise HTTPException(status_code=400, detail="You must agree to the terms")
    
    # Save signature image
    signature_url = None
    if sign_data.signature_data:
        try:
            # Remove data URL prefix if present
            sig_data = sign_data.signature_data
            if "," in sig_data:
                sig_data = sig_data.split(",")[1]
            
            signature_bytes = base64.b64decode(sig_data)
            sig_filename = f"signature_{contract_id}.png"
            sig_path = UPLOAD_DIR / sig_filename
            
            with open(sig_path, "wb") as f:
                f.write(signature_bytes)
            
            signature_url = f"/uploads/photos/{sig_filename}"
        except Exception as e:
            logging.error(f"Signature save error: {e}")
    
    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": {
            "status": "signed",
            "client_id": current_client["client_id"],
            "signed_at": datetime.now(timezone.utc).isoformat(),
            "signature_data": signature_url,
            "signed_by_ip": None  # Could capture IP for legal purposes
        }}
    )
    
    # Notify admin
    admin_notif = {
        "id": str(uuid.uuid4()),
        "type": "contract_signed",
        "title": "Contract Signed!",
        "message": f"{contract.get('client_name', 'Client')} has signed their {contract.get('frequency', '')} service contract.",
        "contract_id": contract_id,
        "read": False,
        "play_sound": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admin_notifications.insert_one(admin_notif)
    
    return {"message": "Contract signed successfully", "signature_url": signature_url}

@api_router.get("/client/notifications")
async def get_client_notifications(current_client: dict = Depends(get_client_user)):
    """Get notifications for client including messages"""
    client_id = current_client["client_id"]
    
    # Get client record to get phone number
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    
    notifications = []
    
    # Get system notifications
    system_notifs = await db.client_notifications.find(
        {"client_id": client_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    notifications.extend(system_notifs)
    
    # Get customer messages (reschedule, en-route, completion notifications)
    if client:
        phone = client.get("phone", "")
        if phone:
            messages = await db.customer_messages.find(
                {"to_customer_phone": phone},
                {"_id": 0}
            ).sort("created_at", -1).to_list(50)
            
            for msg in messages:
                notifications.append({
                    "id": msg.get("id"),
                    "type": f"message_{msg.get('message_type', 'general')}",
                    "title": get_message_title(msg.get("message_type")),
                    "message": msg.get("message"),
                    "booking_id": msg.get("booking_id"),
                    "read": msg.get("read", False),
                    "created_at": msg.get("created_at")
                })
    
    # Sort all by created_at
    notifications.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return {"notifications": notifications[:50]}

def get_message_title(message_type):
    titles = {
        "reschedule": "Service Rescheduled",
        "en_route": "Contractor On The Way",
        "completion": "Service Completed",
        "arrival": "Contractor Arrived",
        "general": "Message from Up-Wash"
    }
    return titles.get(message_type, "Notification")

@api_router.patch("/client/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_client: dict = Depends(get_client_user)):
    """Mark a notification as read"""
    # Try client_notifications first
    result = await db.client_notifications.update_one(
        {"id": notification_id, "client_id": current_client["client_id"]},
        {"$set": {"read": True}}
    )
    
    if result.matched_count == 0:
        # Try customer_messages
        await db.customer_messages.update_one(
            {"id": notification_id},
            {"$set": {"read": True}}
        )
    
    return {"message": "Notification marked as read"}

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
