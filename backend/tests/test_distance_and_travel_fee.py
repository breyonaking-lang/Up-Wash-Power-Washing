"""
Test suite for distance calculation and travel fee features
Tests: Distance API, travel fee calculation, booking with distance, quote follow-ups
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://clean-pro-dispatch.preview.emergentagent.com')


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def get_next_weekday():
    """Get the next weekday date for bookings"""
    date = datetime.now() + timedelta(days=1)
    while date.weekday() >= 5:  # Skip weekends
        date += timedelta(days=1)
    return date.strftime("%Y-%m-%d")


class TestDistanceCalculation:
    """Test distance calculation API using Google Maps"""
    
    def test_distance_outside_free_radius(self, api_client):
        """Test address outside 15-mile free radius (Arlington, TX)"""
        response = api_client.post(
            f"{BASE_URL}/api/calculate-distance",
            json={"address": "1000 Ballpark Way, Arlington, TX"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["distance_miles"] > 15  # Should be ~29-30 miles
        assert data["is_within_free_radius"] == False
        assert data["travel_fee"] > 0  # $1/mile beyond 15
        assert data["free_radius"] == 15
        assert "distance_text" in data
        assert "duration_text" in data
    
    def test_distance_within_free_radius(self, api_client):
        """Test address within 15-mile free radius (Burleson, TX)"""
        response = api_client.post(
            f"{BASE_URL}/api/calculate-distance",
            json={"address": "100 S Main St, Burleson, TX"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["distance_miles"] < 15
        assert data["is_within_free_radius"] == True
        assert data["travel_fee"] == 0.0
    
    def test_distance_empty_address(self, api_client):
        """Test empty address returns error"""
        response = api_client.post(
            f"{BASE_URL}/api/calculate-distance",
            json={"address": ""}
        )
        assert response.status_code == 400


class TestTravelFeeCalculation:
    """Test travel fee is correctly calculated in pricing"""
    
    def test_price_with_travel_fee(self, api_client):
        """Test pricing includes travel fee for distant locations"""
        response = api_client.post(
            f"{BASE_URL}/api/calculate-price",
            json={
                "services": [{"service_id": "patio", "quantity": 1}],
                "distance_miles": 30,
                "is_monthly": False,
                "num_service_days": 1
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["subtotal"] == 85.0  # Patio price
        assert data["travel_fee"] == 15.0  # (30 - 15) * $1
        assert data["total"] == 100.0  # 85 + 15
    
    def test_price_no_travel_fee_within_radius(self, api_client):
        """Test no travel fee for locations within free radius"""
        response = api_client.post(
            f"{BASE_URL}/api/calculate-price",
            json={
                "services": [{"service_id": "driveway", "quantity": 1}],
                "distance_miles": 10,
                "is_monthly": False,
                "num_service_days": 1
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["subtotal"] == 85.0
        assert data["travel_fee"] == 0.0
        assert data["total"] == 85.0
    
    def test_price_exact_boundary(self, api_client):
        """Test exactly 15 miles has no travel fee"""
        response = api_client.post(
            f"{BASE_URL}/api/calculate-price",
            json={
                "services": [{"service_id": "patio", "quantity": 1}],
                "distance_miles": 15,
                "is_monthly": False,
                "num_service_days": 1
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["travel_fee"] == 0.0


class TestBookingWithTravelFee:
    """Test booking creation with travel fee included in total"""
    
    def test_create_booking_with_travel_fee(self, api_client):
        """Create booking outside free radius and verify travel fee is saved"""
        booking_date = get_next_weekday()
        
        response = api_client.post(
            f"{BASE_URL}/api/bookings",
            json={
                "customer_name": "TEST_Travel Fee User",
                "customer_email": "test_travelfee@test.com",
                "customer_phone": "817-555-1111",
                "customer_address": "1000 Ballpark Way, Arlington, TX",
                "distance_miles": 29.7,
                "services": [{"service_id": "patio", "quantity": 1}],
                "booking_dates": [booking_date],
                "is_monthly": False,
                "sms_opt_in": False
            }
        )
        assert response.status_code == 200
        
        booking = response.json()
        assert "id" in booking
        assert booking["subtotal"] == 85.0
        
        # Travel fee: (29.7 - 15) * $1 = $14.70
        expected_fee = round((29.7 - 15) * 1, 2)
        assert abs(booking["travel_fee"] - expected_fee) < 0.1
        
        # Total should include travel fee
        expected_total = 85.0 + expected_fee
        assert abs(booking["total"] - expected_total) < 0.1
        
        # Verify persisted via GET
        get_response = api_client.get(f"{BASE_URL}/api/bookings/{booking['id']}")
        assert get_response.status_code == 200
        
        fetched = get_response.json()
        assert fetched["travel_fee"] == booking["travel_fee"]
        assert fetched["distance_miles"] == 29.7
    
    def test_create_booking_no_travel_fee(self, api_client):
        """Create booking within free radius - no travel fee"""
        booking_date = get_next_weekday()
        
        response = api_client.post(
            f"{BASE_URL}/api/bookings",
            json={
                "customer_name": "TEST_Local User",
                "customer_email": "test_local@test.com",
                "customer_phone": "817-555-2222",
                "customer_address": "100 S Main St, Burleson, TX",
                "distance_miles": 2.0,
                "services": [{"service_id": "driveway", "quantity": 1}],
                "booking_dates": [booking_date],
                "is_monthly": False,
                "sms_opt_in": False
            }
        )
        assert response.status_code == 200
        
        booking = response.json()
        assert booking["travel_fee"] == 0.0
        assert booking["total"] == 85.0


class TestQuoteFollowUpSystem:
    """Test quote follow-up tracking and notification system"""
    
    def test_create_quote_booking_sets_flag(self, api_client):
        """Quote-based services should set is_quote_service flag"""
        booking_date = get_next_weekday()
        
        response = api_client.post(
            f"{BASE_URL}/api/bookings",
            json={
                "customer_name": "TEST_Quote Service User",
                "customer_email": "test_quote@test.com",
                "customer_phone": "817-555-3333",
                "customer_address": "500 AT&T Way, Arlington, TX",
                "distance_miles": 25.0,
                "services": [{"service_id": "home_powerwash", "quantity": 1}],
                "booking_dates": [booking_date],
                "is_monthly": False,
                "sms_opt_in": False,
                "quote_description": "Full house exterior power wash needed"
            }
        )
        assert response.status_code == 200
        
        booking = response.json()
        assert booking["is_quote_service"] == True
        assert booking["subtotal"] == 0.0  # Quote services have no fixed price
        
        # Travel fee should still apply
        expected_travel_fee = (25.0 - 15) * 1
        assert booking["travel_fee"] == expected_travel_fee
    
    def test_pending_quotes_endpoint(self, api_client):
        """Test admin endpoint to list pending quotes"""
        response = api_client.get(f"{BASE_URL}/api/admin/pending-quotes")
        assert response.status_code == 200
        
        data = response.json()
        assert "pending_quotes" in data
        assert "count" in data
        assert isinstance(data["pending_quotes"], list)
    
    def test_mark_quote_responded(self, api_client):
        """Test marking a quote as responded"""
        # First create a quote booking
        booking_date = get_next_weekday()
        
        create_response = api_client.post(
            f"{BASE_URL}/api/bookings",
            json={
                "customer_name": "TEST_Quote Respond User",
                "customer_email": "test_respond@test.com",
                "customer_phone": "817-555-4444",
                "customer_address": "600 Main St, Fort Worth, TX",
                "distance_miles": 20.0,
                "services": [{"service_id": "construction_cleanup", "quantity": 1}],
                "booking_dates": [booking_date],
                "is_monthly": False,
                "sms_opt_in": False,
                "quote_description": "Post-construction cleanup needed"
            }
        )
        assert create_response.status_code == 200
        booking_id = create_response.json()["id"]
        
        # Mark as responded
        respond_response = api_client.post(
            f"{BASE_URL}/api/admin/quote/{booking_id}/respond"
        )
        assert respond_response.status_code == 200
        
        # Verify it's no longer in pending quotes
        pending_response = api_client.get(f"{BASE_URL}/api/admin/pending-quotes")
        pending_data = pending_response.json()
        
        pending_ids = [q["id"] for q in pending_data["pending_quotes"]]
        assert booking_id not in pending_ids
    
    def test_process_followups_endpoint(self, api_client):
        """Test the process followups cron endpoint"""
        response = api_client.post(f"{BASE_URL}/api/admin/process-followups")
        assert response.status_code == 200
        
        data = response.json()
        assert "processed" in data
        assert "followups_sent" in data
        assert "message" in data


class TestMultipleServicesWithDistance:
    """Test booking with multiple services and travel fee"""
    
    def test_multiple_services_travel_fee(self, api_client):
        """Test travel fee is added once for multiple services"""
        booking_date = get_next_weekday()
        
        response = api_client.post(
            f"{BASE_URL}/api/bookings",
            json={
                "customer_name": "TEST_Multi Service User",
                "customer_email": "test_multi@test.com",
                "customer_phone": "817-555-5555",
                "customer_address": "1234 Distant Rd, Dallas, TX",
                "distance_miles": 40.0,  # 25 miles extra
                "services": [
                    {"service_id": "patio", "quantity": 1},
                    {"service_id": "driveway", "quantity": 1}
                ],
                "booking_dates": [booking_date],
                "is_monthly": False,
                "sms_opt_in": False
            }
        )
        assert response.status_code == 200
        
        booking = response.json()
        
        # Subtotal: $85 + $85 = $170
        assert booking["subtotal"] == 170.0
        
        # Travel fee: (40 - 15) * $1 = $25
        assert booking["travel_fee"] == 25.0
        
        # Total: $170 + $25 = $195
        assert booking["total"] == 195.0
