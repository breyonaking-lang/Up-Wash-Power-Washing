"""
Upwash Power Washing - Backend API Tests
Testing: Admin login, Calendar, Unpaid Subscriptions, Booking with monthly days
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Admin credentials from .env
ADMIN_USERNAME = "Hughes0108"
ADMIN_PASSWORD = "Godfirst7!"

class TestAdminAuth:
    """Test admin authentication flow"""
    
    def test_admin_login_success(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["username"] == ADMIN_USERNAME
        print(f"✓ Admin login successful with username: {ADMIN_USERNAME}")
        return data["access_token"]
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with wrong credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "wronguser",
            "password": "wrongpass"
        })
        
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")


class TestAdminCalendar:
    """Test admin calendar endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin authentication failed")
    
    def test_calendar_endpoint_exists(self, admin_token):
        """Test that admin calendar endpoint exists and returns data"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/calendar", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "calendar" in data
        assert "today" in data
        assert "routes" in data
        assert "month" in data
        assert "year" in data
        print(f"✓ Calendar endpoint returns valid data structure")
    
    def test_calendar_month_filter(self, admin_token):
        """Test calendar with month and year parameters"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/calendar?month=1&year=2026", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["month"] == 1
        assert data["year"] == 2026
        print("✓ Calendar month filter works correctly")


class TestUnpaidSubscriptions:
    """Test unpaid subscriptions endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin authentication failed")
    
    def test_unpaid_subscriptions_endpoint(self, admin_token):
        """Test that unpaid subscriptions endpoint exists"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/unpaid-subscriptions", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "unpaid_subscriptions" in data
        assert isinstance(data["unpaid_subscriptions"], list)
        print(f"✓ Unpaid subscriptions endpoint works, found {len(data['unpaid_subscriptions'])} subscriptions")


class TestServices:
    """Test services endpoint for Commercial Properties"""
    
    def test_services_includes_commercial(self):
        """Test that Commercial Properties service exists"""
        response = requests.get(f"{BASE_URL}/api/services")
        
        assert response.status_code == 200
        data = response.json()
        
        services = data.get("services", [])
        commercial_service = next((s for s in services if s.get("service_id") == "commercial"), None)
        
        assert commercial_service is not None, "Commercial Properties service not found"
        assert commercial_service["name"] == "Commercial Properties"
        assert commercial_service["pricing_type"] == "quote"
        print(f"✓ Commercial Properties service exists: {commercial_service['name']}")


class TestMonthlySubscriptionBooking:
    """Test booking with monthly service days (days of month)"""
    
    def test_booking_with_monthly_service_days(self):
        """Test creating a booking with days of month selection"""
        booking_data = {
            "customer_name": "TEST_MonthlySubscriber",
            "customer_email": "test_monthly@example.com",
            "customer_phone": "8175551234",
            "customer_address": "123 Test St, Burleson, TX",
            "distance_miles": 10,
            "services": [
                {"service_id": "recycling_bin", "quantity": 2}
            ],
            "booking_dates": ["2026-01-15"],
            "is_monthly": True,
            "monthly_service_days": [1, 15],  # 1st and 15th of each month
            "service_days_per_month": 2,  # 2 days per month
            "sms_opt_in": True,
            "recurring_payment": True,
            "notes": "Test monthly subscription"
        }
        
        response = requests.post(f"{BASE_URL}/api/bookings", json=booking_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify monthly service days are saved
        assert data["is_monthly"] == True
        assert data["monthly_service_days"] == [1, 15]
        assert data["service_days_per_month"] == 2
        
        # Verify pricing has 5% discount for monthly
        assert data["discount"] > 0, "Monthly discount should be applied"
        
        print(f"✓ Monthly subscription created with days of month: {data['monthly_service_days']}")
        print(f"  Total: ${data['total']}, Discount: ${data['discount']}")
        
        # Return booking ID for cleanup
        return data["id"]
    
    def test_booking_with_more_monthly_days(self):
        """Test booking with 4 days per month"""
        booking_data = {
            "customer_name": "TEST_FourDaySubscriber",
            "customer_email": "test_fourday@example.com",
            "customer_phone": "8175559999",
            "customer_address": "456 Test Ave, Burleson, TX",
            "distance_miles": 5,
            "services": [
                {"service_id": "dumpster", "quantity": 1}
            ],
            "booking_dates": ["2026-01-07"],
            "is_monthly": True,
            "monthly_service_days": [7, 14, 21, 28],  # Every week
            "service_days_per_month": 4,
            "sms_opt_in": False,
            "recurring_payment": False
        }
        
        response = requests.post(f"{BASE_URL}/api/bookings", json=booking_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert len(data["monthly_service_days"]) == 4
        assert data["service_days_per_month"] == 4
        print(f"✓ 4-day monthly subscription created: {data['monthly_service_days']}")


class TestPriceCalculation:
    """Test price calculation with monthly discount"""
    
    def test_monthly_discount_calculation(self):
        """Test that monthly subscriptions get 5% discount"""
        # Single booking (no discount)
        single_response = requests.post(f"{BASE_URL}/api/calculate-price", json={
            "services": [{"service_id": "recycling_bin", "quantity": 2}],
            "distance_miles": 10,
            "is_monthly": False,
            "num_service_days": 1
        })
        single_data = single_response.json()
        
        # Monthly booking (5% discount, 2 days)
        monthly_response = requests.post(f"{BASE_URL}/api/calculate-price", json={
            "services": [{"service_id": "recycling_bin", "quantity": 2}],
            "distance_miles": 10,
            "is_monthly": True,
            "num_service_days": 2
        })
        monthly_data = monthly_response.json()
        
        # Verify monthly has discount
        assert monthly_data["discount"] > 0, "Monthly should have discount"
        assert monthly_data["discount_percent"] == 5, "Discount should be 5%"
        
        # Verify discount is 5% of subtotal
        expected_discount = monthly_data["subtotal"] * 0.05
        assert abs(monthly_data["discount"] - expected_discount) < 0.01, "Discount should be 5% of subtotal"
        
        print(f"✓ Single booking: ${single_data['total']} (no discount)")
        print(f"✓ Monthly booking: ${monthly_data['total']} (5% discount = ${monthly_data['discount']})")


class TestAdminStats:
    """Test admin stats endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin authentication failed")
    
    def test_admin_stats_endpoint(self, admin_token):
        """Test admin stats returns all required fields"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected fields
        required_fields = ["total_bookings", "pending", "completed", "total_revenue", "contractor_count"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Admin stats: {data['total_bookings']} bookings, ${data['total_revenue']} revenue")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
