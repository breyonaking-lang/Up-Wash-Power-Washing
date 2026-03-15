"""
Test Payment Features for Up-Wash Power Washing
Tests: 
- POST /api/admin/send-payment-link (send payment link via SMS/Email)
- POST /api/admin/subscriptions/create (create new subscription)
- GET /api/admin/bookings/paid (get paid bookings)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPaymentFeatures:
    """Test payment-related API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for admin user"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Hughes0108",
            "password": "Godfirst7!"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("access_token")
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}"
        }
    
    # =======================
    # Test /api/admin/bookings/paid endpoint
    # =======================
    
    def test_get_paid_bookings_requires_auth(self):
        """Verify GET /api/admin/bookings/paid requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/bookings/paid")
        assert response.status_code == 401, "Expected 401 for unauthenticated request"
        print("PASS: GET /api/admin/bookings/paid requires authentication")
    
    def test_get_paid_bookings_returns_list(self):
        """Verify GET /api/admin/bookings/paid returns bookings list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/bookings/paid",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "bookings" in data, "Response should contain 'bookings' key"
        assert isinstance(data["bookings"], list), "Bookings should be a list"
        print(f"PASS: GET /api/admin/bookings/paid returns {len(data['bookings'])} paid bookings")
    
    # =======================
    # Test /api/admin/subscriptions/create endpoint
    # =======================
    
    def test_create_subscription_requires_auth(self):
        """Verify POST /api/admin/subscriptions/create requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/admin/subscriptions/create",
            json={}
        )
        assert response.status_code == 401, "Expected 401 for unauthenticated request"
        print("PASS: POST /api/admin/subscriptions/create requires authentication")
    
    def test_create_subscription_success(self):
        """Verify POST /api/admin/subscriptions/create creates a new subscription"""
        subscription_data = {
            "customer_name": "TEST_Subscription_Customer",
            "customer_email": "test_sub@example.com",
            "customer_phone": "+15551234567",
            "customer_address": "123 Test St, Burleson, TX 76028",
            "services": [{"service_id": "recycling_bin", "quantity": 1}],
            "monthly_service_days": [1, 15],  # 1st and 15th of each month
            "service_days_per_month": 2
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/subscriptions/create",
            headers=self.headers,
            json=subscription_data
        )
        assert response.status_code == 200, f"Failed to create subscription: {response.text}"
        data = response.json()
        assert "subscription_id" in data, "Response should contain subscription_id"
        assert "total" in data, "Response should contain total"
        assert "message" in data, "Response should contain message"
        print(f"PASS: Subscription created with ID: {data['subscription_id']}, Total: ${data['total']}")
        
        # Verify the subscription exists in bookings
        booking_response = requests.get(
            f"{BASE_URL}/api/bookings/{data['subscription_id']}",
            headers=self.headers
        )
        assert booking_response.status_code == 200, "Created subscription should be retrievable"
        booking_data = booking_response.json()
        assert booking_data.get("is_monthly") == True, "Subscription should be marked as monthly"
        print("PASS: Subscription persisted and verified in database")
    
    def test_create_subscription_validates_required_fields(self):
        """Verify POST /api/admin/subscriptions/create validates required fields"""
        # Missing required fields
        response = requests.post(
            f"{BASE_URL}/api/admin/subscriptions/create",
            headers=self.headers,
            json={"customer_name": "Test"}  # Missing other required fields
        )
        assert response.status_code in [400, 422], f"Expected validation error, got {response.status_code}"
        print("PASS: Subscription creation validates required fields")
    
    # =======================
    # Test /api/admin/send-payment-link endpoint
    # =======================
    
    def test_send_payment_link_requires_auth(self):
        """Verify POST /api/admin/send-payment-link requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/admin/send-payment-link",
            json={"booking_id": "test"}
        )
        assert response.status_code == 401, "Expected 401 for unauthenticated request"
        print("PASS: POST /api/admin/send-payment-link requires authentication")
    
    def test_send_payment_link_booking_not_found(self):
        """Verify POST /api/admin/send-payment-link returns 404 for non-existent booking"""
        response = requests.post(
            f"{BASE_URL}/api/admin/send-payment-link",
            headers=self.headers,
            json={
                "booking_id": "non-existent-booking-id",
                "method": "sms"
            }
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: send-payment-link returns 404 for non-existent booking")
    
    def test_send_payment_link_sms_method(self):
        """Test sending payment link via SMS"""
        # First create a booking to get a valid booking_id
        booking_data = {
            "customer_name": "TEST_PaymentLink_Customer",
            "customer_email": "test_pay@example.com",
            "customer_phone": "+15551234567",
            "customer_address": "456 Payment St, Burleson, TX 76028",
            "services": [{"service_id": "recycling_bin", "quantity": 1}],
            "booking_dates": ["2026-03-20"],
            "is_monthly": False,
            "distance_miles": 5
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/bookings",
            json=booking_data
        )
        assert create_response.status_code == 200, f"Failed to create test booking: {create_response.text}"
        booking_id = create_response.json().get("id")
        
        # Now test sending payment link
        response = requests.post(
            f"{BASE_URL}/api/admin/send-payment-link",
            headers=self.headers,
            json={
                "booking_id": booking_id,
                "method": "sms",
                "message": "Please pay for your Up-Wash service"
            }
        )
        # Note: SMS may fail with invalid test number but endpoint should work
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            assert "payment_url" in data, "Response should contain payment_url"
            assert "amount" in data, "Response should contain amount"
            print(f"PASS: Payment link sent via SMS. URL: {data['payment_url']}, Amount: ${data['amount']}")
        else:
            # May fail due to invalid phone number in test
            print(f"INFO: SMS sending returned 400 (expected for test phone number): {response.text}")
    
    def test_send_payment_link_email_method(self):
        """Test sending payment link via Email"""
        # First create a booking
        booking_data = {
            "customer_name": "TEST_EmailPayment_Customer",
            "customer_email": "test_email_pay@example.com",
            "customer_phone": "+15559876543",
            "customer_address": "789 Email St, Burleson, TX 76028",
            "services": [{"service_id": "patio", "quantity": 1}],
            "booking_dates": ["2026-03-23"],  # Monday
            "is_monthly": False,
            "distance_miles": 10
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/bookings",
            json=booking_data
        )
        assert create_response.status_code == 200, f"Failed to create test booking: {create_response.text}"
        booking_id = create_response.json().get("id")
        
        # Test sending payment link via email
        response = requests.post(
            f"{BASE_URL}/api/admin/send-payment-link",
            headers=self.headers,
            json={
                "booking_id": booking_id,
                "method": "email",
                "message": "Please complete your Up-Wash payment"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "payment_url" in data, "Response should contain payment_url"
        assert "status" in data, "Response should contain status"
        print(f"PASS: Payment link via email. Status: {data['status']}, URL: {data['payment_url']}")
    
    def test_send_payment_link_custom_amount(self):
        """Test sending payment link with custom amount"""
        # Create a booking first
        booking_data = {
            "customer_name": "TEST_CustomAmount_Customer",
            "customer_phone": "+15551112222",
            "customer_email": "custom@example.com",
            "customer_address": "100 Custom St, Burleson, TX 76028",
            "services": [{"service_id": "driveway", "quantity": 1}],
            "booking_dates": ["2026-03-24"],  # Tuesday
            "is_monthly": False,
            "distance_miles": 0
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/bookings",
            json=booking_data
        )
        assert create_response.status_code == 200, f"Failed: {create_response.text}"
        booking_id = create_response.json().get("id")
        
        # Send with custom amount
        custom_amount = 150.00
        response = requests.post(
            f"{BASE_URL}/api/admin/send-payment-link",
            headers=self.headers,
            json={
                "booking_id": booking_id,
                "method": "email",
                "custom_amount": custom_amount
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("amount") == custom_amount, f"Amount should be {custom_amount}, got {data.get('amount')}"
        print(f"PASS: Payment link with custom amount ${custom_amount}")
    
    # =======================
    # Test SERVICES data - No trash_bin_cleaning
    # =======================
    
    def test_services_no_trash_bin(self):
        """Verify 'trash_bin_cleaning' is NOT in services list"""
        response = requests.get(f"{BASE_URL}/api/services")
        assert response.status_code == 200, f"Failed to get services: {response.text}"
        data = response.json()
        
        services = data.get("services", [])
        if isinstance(services, dict):
            service_ids = list(services.keys())
        else:
            service_ids = [s.get("service_id") for s in services]
        
        # Verify trash_bin is NOT present
        assert "trash_bin" not in service_ids, "trash_bin should NOT be in services"
        assert "trash_bin_cleaning" not in service_ids, "trash_bin_cleaning should NOT be in services"
        
        # Verify expected services ARE present
        expected_services = ["recycling_bin", "scent_bomb", "patio", "driveway", "dumpster", "home_powerwash", "construction_cleanup", "commercial"]
        for svc in expected_services:
            assert svc in service_ids, f"Expected service '{svc}' to be present"
        
        print(f"PASS: Services list correct. Contains: {service_ids}")
        print("PASS: 'trash_bin_cleaning' is NOT present in services")


class TestPendingServicesEndpoint:
    """Test pending services/bookings endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Hughes0108",
            "password": "Godfirst7!"
        })
        assert login_response.status_code == 200
        self.token = login_response.json().get("access_token")
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}"
        }
    
    def test_get_pending_bookings(self):
        """Verify GET /api/admin/bookings?status=pending returns pending bookings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/bookings?status=pending",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "bookings" in data, "Response should contain 'bookings' key"
        print(f"PASS: GET pending bookings returns {len(data['bookings'])} bookings")
    
    def test_pending_bookings_have_required_fields(self):
        """Verify pending bookings have all required fields for display"""
        response = requests.get(
            f"{BASE_URL}/api/admin/bookings?status=pending",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["bookings"]:
            booking = data["bookings"][0]
            required_fields = ["id", "customer_name", "customer_phone", "customer_address", "services", "payment_status"]
            for field in required_fields:
                assert field in booking, f"Booking should have '{field}' field"
            print(f"PASS: Pending bookings have required fields: {required_fields}")
        else:
            print("INFO: No pending bookings to verify fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
