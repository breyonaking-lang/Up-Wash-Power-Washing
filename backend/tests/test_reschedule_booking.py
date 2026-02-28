"""
Test cases for the booking reschedule feature in Up-Wash Power Washing admin portal.

Tests cover:
1. Reschedule booking API endpoint (PATCH /api/admin/bookings/{id}/reschedule)
2. Validation for weekday-only scheduling  
3. SMS notification option for rescheduling
4. Custom message support for reschedule notifications
5. Calendar endpoint showing bookings
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

# Get backend URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://upwash-preview.preview.emergentagent.com"

# Test credentials
ADMIN_USERNAME = "Hughes0108"
ADMIN_PASSWORD = "Godfirst7!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture
def admin_headers(admin_token):
    """Get headers with admin auth"""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    }


@pytest.fixture
def test_booking():
    """Create a test booking for reschedule tests"""
    # Create booking without auth (public endpoint)
    # Use a future weekday date
    today = datetime.now()
    # Find next Monday (weekday 0)
    days_ahead = 0 - today.weekday()
    if days_ahead <= 0:
        days_ahead += 7
    next_monday = today + timedelta(days=days_ahead)
    booking_date = next_monday.strftime("%Y-%m-%d")
    
    booking_data = {
        "customer_name": f"TEST_Reschedule_{uuid.uuid4().hex[:8]}",
        "customer_email": "test@example.com",
        "customer_phone": "5551234567",
        "customer_address": "123 Test St, Burleson, TX 76028",
        "distance_miles": 5.0,
        "services": [{"service_id": "recycling_bin", "quantity": 1}],
        "booking_dates": [booking_date],
        "is_monthly": False,
        "sms_opt_in": True,
        "notes": "Test booking for reschedule"
    }
    
    response = requests.post(f"{BASE_URL}/api/bookings", json=booking_data)
    assert response.status_code == 200, f"Failed to create test booking: {response.text}"
    booking = response.json()
    return booking


class TestRescheduleBookingAPI:
    """Test the reschedule booking API endpoint"""
    
    def test_reschedule_booking_success(self, admin_headers, test_booking):
        """Test successful booking reschedule to a new weekday"""
        booking_id = test_booking["id"]
        old_date = test_booking["booking_dates"][0]
        
        # Calculate new date (next weekday, not the same as old)
        old_date_obj = datetime.strptime(old_date, "%Y-%m-%d")
        new_date_obj = old_date_obj + timedelta(days=1)
        
        # Make sure it's a weekday
        while new_date_obj.weekday() > 4:  # Skip weekends
            new_date_obj += timedelta(days=1)
        new_date = new_date_obj.strftime("%Y-%m-%d")
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/bookings/{booking_id}/reschedule",
            headers=admin_headers,
            json={
                "new_date": new_date,
                "send_sms": True,
                "custom_message": None
            }
        )
        
        assert response.status_code == 200, f"Reschedule failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data["message"] == "Booking rescheduled successfully"
        assert data["old_date"] == old_date
        assert data["new_date"] == new_date
        assert "sms_sent" in data
        print(f"SUCCESS: Booking rescheduled from {old_date} to {new_date}")
    
    def test_reschedule_with_custom_message(self, admin_headers, test_booking):
        """Test reschedule with custom SMS message"""
        booking_id = test_booking["id"]
        
        # Get current date and calculate new date
        today = datetime.now()
        # Find a weekday at least 7 days ahead
        new_date_obj = today + timedelta(days=14)
        while new_date_obj.weekday() > 4:
            new_date_obj += timedelta(days=1)
        new_date = new_date_obj.strftime("%Y-%m-%d")
        
        custom_msg = "Your service has been moved to a new date. Please call us if you have questions!"
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/bookings/{booking_id}/reschedule",
            headers=admin_headers,
            json={
                "new_date": new_date,
                "send_sms": True,
                "custom_message": custom_msg
            }
        )
        
        assert response.status_code == 200, f"Reschedule with custom message failed: {response.text}"
        data = response.json()
        assert data["new_date"] == new_date
        print(f"SUCCESS: Reschedule with custom message to {new_date}")
    
    def test_reschedule_without_sms(self, admin_headers, test_booking):
        """Test reschedule without sending SMS notification"""
        booking_id = test_booking["id"]
        
        # Get a future weekday
        today = datetime.now()
        new_date_obj = today + timedelta(days=21)
        while new_date_obj.weekday() > 4:
            new_date_obj += timedelta(days=1)
        new_date = new_date_obj.strftime("%Y-%m-%d")
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/bookings/{booking_id}/reschedule",
            headers=admin_headers,
            json={
                "new_date": new_date,
                "send_sms": False,
                "custom_message": None
            }
        )
        
        assert response.status_code == 200, f"Reschedule without SMS failed: {response.text}"
        data = response.json()
        assert data["sms_sent"] == False
        print(f"SUCCESS: Reschedule without SMS notification to {new_date}")
    
    def test_reschedule_to_weekend_rejected(self, admin_headers, test_booking):
        """Test that rescheduling to weekend date is rejected"""
        booking_id = test_booking["id"]
        
        # Find next Saturday
        today = datetime.now()
        days_until_saturday = (5 - today.weekday()) % 7
        if days_until_saturday == 0:
            days_until_saturday = 7
        saturday = today + timedelta(days=days_until_saturday)
        weekend_date = saturday.strftime("%Y-%m-%d")
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/bookings/{booking_id}/reschedule",
            headers=admin_headers,
            json={
                "new_date": weekend_date,
                "send_sms": True,
                "custom_message": None
            }
        )
        
        # Should fail with 400 error
        assert response.status_code == 400, f"Should reject weekend date but got: {response.status_code}"
        data = response.json()
        assert "weekday" in data.get("detail", "").lower() or "monday" in data.get("detail", "").lower()
        print(f"SUCCESS: Weekend date {weekend_date} correctly rejected")
    
    def test_reschedule_invalid_date_format(self, admin_headers, test_booking):
        """Test reschedule with invalid date format"""
        booking_id = test_booking["id"]
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/bookings/{booking_id}/reschedule",
            headers=admin_headers,
            json={
                "new_date": "01/15/2026",  # Wrong format
                "send_sms": True,
                "custom_message": None
            }
        )
        
        assert response.status_code == 400, f"Should reject invalid date format"
        print("SUCCESS: Invalid date format correctly rejected")
    
    def test_reschedule_nonexistent_booking(self, admin_headers):
        """Test reschedule on non-existent booking returns 404"""
        fake_booking_id = str(uuid.uuid4())
        
        today = datetime.now()
        new_date_obj = today + timedelta(days=7)
        while new_date_obj.weekday() > 4:
            new_date_obj += timedelta(days=1)
        new_date = new_date_obj.strftime("%Y-%m-%d")
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/bookings/{fake_booking_id}/reschedule",
            headers=admin_headers,
            json={
                "new_date": new_date,
                "send_sms": True,
                "custom_message": None
            }
        )
        
        assert response.status_code == 404, f"Should return 404 for non-existent booking"
        print("SUCCESS: Non-existent booking correctly returns 404")


class TestCalendarEndpoint:
    """Test the admin calendar endpoint"""
    
    def test_calendar_returns_bookings(self, admin_headers):
        """Test that calendar endpoint returns bookings by date"""
        # Get calendar for current month
        today = datetime.now()
        
        response = requests.get(
            f"{BASE_URL}/api/admin/calendar?month={today.month}&year={today.year}",
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Calendar fetch failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "calendar" in data
        assert "routes" in data
        assert "today" in data
        print(f"SUCCESS: Calendar endpoint returned data for {today.month}/{today.year}")
        print(f"  - Total dates with bookings: {len(data['calendar'])}")
        print(f"  - Total routes: {len(data['routes'])}")
    
    def test_calendar_booking_structure(self, admin_headers):
        """Test that calendar booking entries have correct structure"""
        today = datetime.now()
        
        response = requests.get(
            f"{BASE_URL}/api/admin/calendar?month={today.month}&year={today.year}",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        calendar = data.get("calendar", {})
        
        # Check a booking entry if exists
        for date_str, bookings in calendar.items():
            if bookings:
                booking = bookings[0]
                # Verify required fields
                assert "id" in booking, "Booking missing 'id'"
                assert "customer_name" in booking, "Booking missing 'customer_name'"
                assert "services" in booking, "Booking missing 'services'"
                assert "status" in booking, "Booking missing 'status'"
                assert "payment_status" in booking, "Booking missing 'payment_status'"
                assert "address" in booking, "Booking missing 'address'"
                print(f"SUCCESS: Calendar booking structure verified for date {date_str}")
                break
        else:
            print("INFO: No bookings in current month to verify structure")


class TestReleasedRoutesFlashingIcon:
    """Test released routes notification icon feature"""
    
    def test_released_routes_endpoint(self, admin_headers):
        """Test that released routes endpoint returns proper data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/released-routes",
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Released routes fetch failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "released_routes" in data
        assert isinstance(data["released_routes"], list)
        print(f"SUCCESS: Released routes endpoint working, count: {len(data['released_routes'])}")


class TestAdminAuth:
    """Test admin authentication"""
    
    def test_admin_login(self):
        """Test admin can log in with correct credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        print("SUCCESS: Admin login working correctly")
    
    def test_reschedule_requires_auth(self):
        """Test that reschedule endpoint requires admin authentication"""
        # Try without auth
        response = requests.patch(
            f"{BASE_URL}/api/admin/bookings/fake-id/reschedule",
            json={
                "new_date": "2026-02-15",
                "send_sms": False
            }
        )
        
        assert response.status_code == 401 or response.status_code == 403, \
            f"Should require auth but got {response.status_code}"
        print("SUCCESS: Reschedule endpoint correctly requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
