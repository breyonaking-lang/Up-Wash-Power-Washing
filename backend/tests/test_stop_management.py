"""
Tests for Stop Management Feature - Admin can manage route stops
Features tested:
- GET /api/admin/routes/{route_id} - Get route details
- PATCH /api/admin/routes/{route_id}/stops/{booking_id}/status - Update stop status
- POST /api/admin/routes/{route_id}/stops/{booking_id}/reschedule - Reschedule stop
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials from environment
ADMIN_USERNAME = "Hughes0108"
ADMIN_PASSWORD = "Godfirst7!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Return auth headers for API calls"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture(scope="module")
def test_route(auth_headers):
    """Find a route with bookings for testing"""
    response = requests.get(f"{BASE_URL}/api/admin/routes", headers=auth_headers)
    assert response.status_code == 200, f"Failed to fetch routes: {response.text}"
    
    routes = response.json().get("routes", [])
    # Find a route with at least 1 booking
    for route in routes:
        if route.get("bookings") and len(route.get("bookings", [])) > 0:
            return route
    
    pytest.skip("No routes with bookings found for testing")


class TestGetRouteDetails:
    """Tests for GET /api/admin/routes/{route_id} endpoint"""
    
    def test_get_route_details_success(self, auth_headers, test_route):
        """Test successful retrieval of route details"""
        route_id = test_route["id"]
        response = requests.get(f"{BASE_URL}/api/admin/routes/{route_id}", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "route" in data
        assert data["route"]["id"] == route_id
        print(f"✓ Route details fetched successfully: {data['route']['name']}")
    
    def test_get_route_details_not_found(self, auth_headers):
        """Test 404 for non-existent route"""
        response = requests.get(f"{BASE_URL}/api/admin/routes/non-existent-route-id", headers=auth_headers)
        
        assert response.status_code == 404
        assert "Route not found" in response.json().get("detail", "")
        print("✓ Returns 404 for non-existent route")
    
    def test_get_route_details_unauthorized(self):
        """Test unauthorized access returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/routes/any-route-id")
        
        assert response.status_code == 401
        print("✓ Returns 401 without authorization")


class TestUpdateStopStatus:
    """Tests for PATCH /api/admin/routes/{route_id}/stops/{booking_id}/status endpoint"""
    
    def test_mark_stop_completed(self, auth_headers, test_route):
        """Test marking a stop as completed"""
        route_id = test_route["id"]
        booking_id = test_route["bookings"][0]["booking_id"]
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/routes/{route_id}/stops/{booking_id}/status",
            headers=auth_headers,
            json={"status": "completed"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["new_status"] == "completed"
        assert data["booking_id"] == booking_id
        print(f"✓ Stop marked as completed: {booking_id}")
    
    def test_mark_stop_incomplete(self, auth_headers, test_route):
        """Test marking a stop as incomplete"""
        route_id = test_route["id"]
        booking_id = test_route["bookings"][0]["booking_id"]
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/routes/{route_id}/stops/{booking_id}/status",
            headers=auth_headers,
            json={"status": "incomplete"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["new_status"] == "incomplete"
        print(f"✓ Stop marked as incomplete: {booking_id}")
    
    def test_mark_stop_pending(self, auth_headers, test_route):
        """Test marking a stop as pending"""
        route_id = test_route["id"]
        booking_id = test_route["bookings"][0]["booking_id"]
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/routes/{route_id}/stops/{booking_id}/status",
            headers=auth_headers,
            json={"status": "pending"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["new_status"] == "pending"
        print(f"✓ Stop marked as pending: {booking_id}")
    
    def test_invalid_status_value(self, auth_headers, test_route):
        """Test that invalid status values are rejected"""
        route_id = test_route["id"]
        booking_id = test_route["bookings"][0]["booking_id"]
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/routes/{route_id}/stops/{booking_id}/status",
            headers=auth_headers,
            json={"status": "invalid_status"}
        )
        
        assert response.status_code == 400
        assert "Invalid status" in response.json().get("detail", "")
        print("✓ Invalid status value rejected with 400")
    
    def test_update_nonexistent_route(self, auth_headers):
        """Test updating stop in non-existent route"""
        response = requests.patch(
            f"{BASE_URL}/api/admin/routes/fake-route-id/stops/fake-booking-id/status",
            headers=auth_headers,
            json={"status": "completed"}
        )
        
        assert response.status_code == 404
        print("✓ Returns 404 for non-existent route")


class TestRescheduleStop:
    """Tests for POST /api/admin/routes/{route_id}/stops/{booking_id}/reschedule endpoint"""
    
    def test_reschedule_invalid_date_format(self, auth_headers, test_route):
        """Test that invalid date format is rejected"""
        route_id = test_route["id"]
        booking_id = test_route["bookings"][0]["booking_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/admin/routes/{route_id}/stops/{booking_id}/reschedule",
            headers=auth_headers,
            json={"new_date": "invalid-date"}
        )
        
        assert response.status_code == 400
        assert "Invalid date format" in response.json().get("detail", "")
        print("✓ Invalid date format rejected with 400")
    
    def test_reschedule_nonexistent_route(self, auth_headers):
        """Test rescheduling stop in non-existent route"""
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/routes/fake-route-id/stops/fake-booking-id/reschedule",
            headers=auth_headers,
            json={"new_date": future_date}
        )
        
        assert response.status_code == 404
        print("✓ Returns 404 for non-existent route")


class TestAuthenticationRequired:
    """Test that all endpoints require authentication"""
    
    def test_get_route_requires_auth(self):
        """GET route details requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/routes/any-id")
        assert response.status_code == 401
        print("✓ GET route requires authentication")
    
    def test_update_status_requires_auth(self):
        """PATCH status requires authentication"""
        response = requests.patch(
            f"{BASE_URL}/api/admin/routes/any-id/stops/any-booking/status",
            json={"status": "completed"}
        )
        assert response.status_code == 401
        print("✓ PATCH status requires authentication")
    
    def test_reschedule_requires_auth(self):
        """POST reschedule requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/admin/routes/any-id/stops/any-booking/reschedule",
            json={"new_date": "2026-03-20"}
        )
        assert response.status_code == 401
        print("✓ POST reschedule requires authentication")


class TestStatusPersistence:
    """Test that status updates persist correctly"""
    
    def test_status_persists_after_update(self, auth_headers, test_route):
        """Verify status update persists in route data"""
        route_id = test_route["id"]
        booking_id = test_route["bookings"][0]["booking_id"]
        
        # Update to completed
        update_response = requests.patch(
            f"{BASE_URL}/api/admin/routes/{route_id}/stops/{booking_id}/status",
            headers=auth_headers,
            json={"status": "completed"}
        )
        assert update_response.status_code == 200
        
        # Fetch route and verify status
        get_response = requests.get(f"{BASE_URL}/api/admin/routes/{route_id}", headers=auth_headers)
        assert get_response.status_code == 200
        
        route_data = get_response.json()["route"]
        booking = next((b for b in route_data.get("bookings", []) if b.get("booking_id") == booking_id), None)
        
        if booking:
            assert booking.get("stop_status") == "completed", f"Expected 'completed', got '{booking.get('stop_status')}'"
            print(f"✓ Status persisted correctly in route data: {booking.get('stop_status')}")
        
        # Reset to pending for other tests
        requests.patch(
            f"{BASE_URL}/api/admin/routes/{route_id}/stops/{booking_id}/status",
            headers=auth_headers,
            json={"status": "pending"}
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
