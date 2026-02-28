"""
Tests for Admin Clients Page, Create Booking, and Client Notifications
Features tested:
- Admin Clients page: GET /api/admin/clients/all - lists all clients with search stats
- Admin Create Booking: POST /api/admin/bookings/create - manual booking creation
- Client Notifications: GET /api/client/notifications - includes reschedule messages
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Admin credentials
ADMIN_USERNAME = "Hughes0108"
ADMIN_PASSWORD = "Godfirst7!"

# Test client credentials
CLIENT_EMAIL = "test@example.com"
CLIENT_PASSWORD = "test123"


class TestAdminClientsEndpoint:
    """Tests for GET /api/admin/clients/all endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["access_token"]
    
    def test_clients_endpoint_requires_auth(self):
        """Test that clients endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/clients/all")
        assert response.status_code == 401
    
    def test_clients_endpoint_returns_list(self, admin_token):
        """Test that clients endpoint returns list of clients"""
        response = requests.get(
            f"{BASE_URL}/api/admin/clients/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "clients" in data
        assert "total" in data
        assert isinstance(data["clients"], list)
        assert isinstance(data["total"], int)
        assert data["total"] == len(data["clients"])
    
    def test_client_has_required_fields(self, admin_token):
        """Test that each client has expected fields for UI display"""
        response = requests.get(
            f"{BASE_URL}/api/admin/clients/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["clients"]) > 0:
            client = data["clients"][0]
            # Check expected fields for Clients Page display
            expected_fields = ["id", "name", "email", "phone", "address", "total_bookings", 
                              "total_spent", "is_subscriber", "has_portal_account"]
            for field in expected_fields:
                assert field in client, f"Missing field: {field}"
            
            # Check data types
            assert isinstance(client["total_bookings"], int)
            assert isinstance(client["total_spent"], (int, float))
            assert isinstance(client["is_subscriber"], bool)
            assert isinstance(client["has_portal_account"], bool)


class TestAdminCreateBooking:
    """Tests for POST /api/admin/bookings/create endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_create_booking_requires_auth(self):
        """Test that create booking endpoint requires authentication"""
        booking_data = {
            "customer_name": "TEST_Auth_User",
            "customer_email": "test@test.com",
            "customer_phone": "555-111-2222",
            "customer_address": "123 Test St",
            "customer_zip": "76028",
            "services": ["recycling_bin"],
            "booking_dates": [(datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")]
        }
        response = requests.post(f"{BASE_URL}/api/admin/bookings/create", json=booking_data)
        assert response.status_code == 401
    
    def test_create_booking_success(self, admin_token):
        """Test successful booking creation with all fields"""
        test_phone = f"555-{str(uuid.uuid4())[:4]}-{str(uuid.uuid4())[:4]}"
        booking_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        booking_data = {
            "customer_name": "TEST_Manual_Client",
            "customer_email": "testmanual@example.com",
            "customer_phone": test_phone,
            "customer_address": "456 Admin Created St",
            "customer_city": "Burleson",
            "customer_state": "TX",
            "customer_zip": "76028",
            "services": ["recycling_bin", "patio"],
            "booking_dates": [booking_date],
            "is_monthly": False,
            "payment_status": "unpaid",
            "notes": "Created via admin portal test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/bookings/create",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=booking_data
        )
        
        assert response.status_code == 200, f"Create booking failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "message" in data
        assert "booking" in data
        assert data["message"] == "Booking created successfully"
        
        # Verify booking data
        booking = data["booking"]
        assert booking["customer_name"] == "TEST_Manual_Client"
        assert booking["customer_email"] == "testmanual@example.com"
        assert booking["customer_phone"] == test_phone
        assert booking["customer_address"] == "456 Admin Created St"
        assert booking["customer_city"] == "Burleson"
        assert booking["customer_state"] == "TX"
        assert booking["customer_zip"] == "76028"
        assert booking["services"] == ["recycling_bin", "patio"]
        assert booking_date in booking["booking_dates"]
        assert booking["payment_status"] == "unpaid"
        assert booking["status"] == "confirmed"
        assert "created_by" in booking
        assert booking["created_by"] == "admin"
        
        # Verify pricing calculated
        assert "subtotal" in booking
        assert "tax" in booking
        assert "total" in booking
        assert booking["total"] > 0
    
    def test_create_booking_with_monthly_discount(self, admin_token):
        """Test booking creation with monthly subscription discount"""
        test_phone = f"555-{str(uuid.uuid4())[:4]}-{str(uuid.uuid4())[:4]}"
        booking_date = (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d")
        
        booking_data = {
            "customer_name": "TEST_Monthly_Client",
            "customer_email": "monthly@example.com",
            "customer_phone": test_phone,
            "customer_address": "789 Monthly Blvd",
            "customer_zip": "76028",
            "services": ["driveway"],
            "booking_dates": [booking_date],
            "is_monthly": True,
            "payment_status": "paid",
            "notes": "Monthly subscription client"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/bookings/create",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=booking_data
        )
        
        assert response.status_code == 200
        data = response.json()
        booking = data["booking"]
        
        # Verify monthly flag is set
        assert booking["is_monthly"] == True
        assert booking["payment_status"] == "paid"
    
    def test_create_booking_with_total_override(self, admin_token):
        """Test booking creation with total override (custom pricing)"""
        test_phone = f"555-{str(uuid.uuid4())[:4]}-{str(uuid.uuid4())[:4]}"
        booking_date = (datetime.now() + timedelta(days=12)).strftime("%Y-%m-%d")
        
        custom_total = 500.00
        
        booking_data = {
            "customer_name": "TEST_Custom_Price_Client",
            "customer_email": "custom@example.com",
            "customer_phone": test_phone,
            "customer_address": "123 Custom Price Lane",
            "customer_zip": "76028",
            "services": ["home_powerwash"],  # Quote service
            "booking_dates": [booking_date],
            "is_monthly": False,
            "payment_status": "unpaid",
            "total_override": custom_total,
            "notes": "Custom quote price applied"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/bookings/create",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=booking_data
        )
        
        assert response.status_code == 200
        data = response.json()
        booking = data["booking"]
        
        # Verify total override was applied
        assert booking["total"] == custom_total
    
    def test_create_booking_appears_in_clients_list(self, admin_token):
        """Test that a newly created booking client appears in clients list"""
        unique_phone = f"TEST-{str(uuid.uuid4())[:8]}"
        booking_date = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
        
        # Create a booking
        booking_data = {
            "customer_name": "TEST_New_Client_Check",
            "customer_email": "newclient@example.com",
            "customer_phone": unique_phone,
            "customer_address": "999 New Client Ave",
            "customer_zip": "76028",
            "services": ["patio"],
            "booking_dates": [booking_date],
            "is_monthly": False,
            "payment_status": "unpaid",
            "notes": ""
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/bookings/create",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=booking_data
        )
        assert response.status_code == 200
        
        # Now check clients list
        clients_response = requests.get(
            f"{BASE_URL}/api/admin/clients/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert clients_response.status_code == 200
        clients = clients_response.json()["clients"]
        
        # Find the client we just created
        found_client = None
        for client in clients:
            if client.get("phone") == unique_phone:
                found_client = client
                break
        
        assert found_client is not None, f"Client with phone {unique_phone} not found in clients list"
        assert found_client["name"] == "TEST_New_Client_Check"
        assert found_client["total_bookings"] >= 1


class TestClientNotifications:
    """Tests for GET /api/client/notifications endpoint"""
    
    @pytest.fixture(scope="class")
    def client_token(self):
        """Get client authentication token"""
        response = requests.post(f"{BASE_URL}/api/client/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Client login failed: {response.text} - may not have test client account")
        return response.json()["access_token"]
    
    def test_notifications_endpoint_requires_auth(self):
        """Test that notifications endpoint requires client authentication"""
        response = requests.get(f"{BASE_URL}/api/client/notifications")
        assert response.status_code == 401
    
    def test_notifications_endpoint_returns_list(self, client_token):
        """Test that notifications endpoint returns list of notifications"""
        response = requests.get(
            f"{BASE_URL}/api/client/notifications",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "notifications" in data
        assert isinstance(data["notifications"], list)
    
    def test_notification_structure(self, client_token):
        """Test notification has expected fields"""
        response = requests.get(
            f"{BASE_URL}/api/client/notifications",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        notifications = response.json()["notifications"]
        
        if len(notifications) > 0:
            notif = notifications[0]
            # Check expected fields
            expected_fields = ["id", "type", "title", "message", "read", "created_at"]
            for field in expected_fields:
                assert field in notif, f"Missing field in notification: {field}"


class TestServicesForBooking:
    """Test that services are returned correctly for booking form"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_settings_returns_services(self, admin_token):
        """Test that admin settings returns services list for booking form"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify services in response
        assert "services" in data
        services = data["services"]
        assert isinstance(services, dict)
        
        # Check expected services exist
        expected_services = ["recycling_bin", "patio", "driveway", "dumpster", 
                           "home_powerwash", "construction", "commercial"]
        for service_id in expected_services:
            assert service_id in services, f"Missing service: {service_id}"
            
            service = services[service_id]
            assert "name" in service
            assert "price" in service or "is_quote" in service
            
            # Check price or quote flag
            if not service.get("is_quote"):
                assert isinstance(service["price"], (int, float))
                assert service["price"] >= 0


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
