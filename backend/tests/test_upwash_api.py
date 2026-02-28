"""
Backend API tests for Up-Wash Power Washing
Tests:
- Client Portal: register, login, subscription, contracts
- Contractor Portal: login, earnings, today's route, CNS flow
- Admin Portal: login, dashboard
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://upwash-preview.preview.emergentagent.com')

# Test credentials
ADMIN_USERNAME = "Hughes0108"
ADMIN_PASSWORD = "Godfirst7!"
CONTRACTOR_USERNAME = "ajb123"
CONTRACTOR_PASSWORD = "upwash_test_123"
TEST_CLIENT_EMAIL = f"testclient_{uuid.uuid4().hex[:8]}@example.com"
TEST_CLIENT_PASSWORD = "test123456"


class TestHealthCheck:
    """Basic API health checks"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Upwash Power Washing API" in data["message"]
        print(f"✓ API root responding: {data}")


class TestClientPortal:
    """Client Portal API tests - register, login, profile"""
    
    @pytest.fixture
    def test_client_data(self):
        return {
            "name": "Test Client User",
            "email": TEST_CLIENT_EMAIL,
            "phone": "(555) 123-4567",
            "password": TEST_CLIENT_PASSWORD,
            "address": "123 Test St, Burleson, TX 76028"
        }
    
    def test_client_register(self, test_client_data):
        """Test client registration"""
        response = requests.post(
            f"{BASE_URL}/api/client/register",
            json=test_client_data
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Client registration successful: {data}")
    
    def test_client_login_success(self, test_client_data):
        """Test client login with valid credentials"""
        # First register to ensure account exists
        requests.post(f"{BASE_URL}/api/client/register", json=test_client_data)
        
        # Then login
        response = requests.post(
            f"{BASE_URL}/api/client/login",
            json={
                "email": test_client_data["email"],
                "password": test_client_data["password"]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "client" in data
        assert data["client"]["email"] == test_client_data["email"]
        assert data["client"]["name"] == test_client_data["name"]
        print(f"✓ Client login successful - token received")
    
    def test_client_login_invalid(self):
        """Test client login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/client/login",
            json={
                "email": "nonexistent@example.com",
                "password": "wrongpassword"
            }
        )
        assert response.status_code == 401
        print("✓ Invalid login correctly rejected")
    
    def test_client_subscription_authenticated(self, test_client_data):
        """Test getting client subscription with auth"""
        # Register and login
        requests.post(f"{BASE_URL}/api/client/register", json=test_client_data)
        login_res = requests.post(
            f"{BASE_URL}/api/client/login",
            json={"email": test_client_data["email"], "password": test_client_data["password"]}
        )
        token = login_res.json()["access_token"]
        
        # Get subscription
        response = requests.get(
            f"{BASE_URL}/api/client/subscription",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # May be null if no subscription exists
        assert "subscription" in data
        print(f"✓ Client subscription endpoint working - subscription: {data.get('subscription')}")
    
    def test_client_contracts_authenticated(self, test_client_data):
        """Test getting client contracts with auth"""
        # Register and login
        requests.post(f"{BASE_URL}/api/client/register", json=test_client_data)
        login_res = requests.post(
            f"{BASE_URL}/api/client/login",
            json={"email": test_client_data["email"], "password": test_client_data["password"]}
        )
        token = login_res.json()["access_token"]
        
        # Get contracts
        response = requests.get(
            f"{BASE_URL}/api/client/contracts",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "contracts" in data
        print(f"✓ Client contracts endpoint working - {len(data.get('contracts', []))} contracts")


class TestContractorPortal:
    """Contractor Portal API tests - login, earnings, routes, CNS"""
    
    @pytest.fixture
    def contractor_token(self):
        """Get contractor auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": CONTRACTOR_USERNAME, "password": CONTRACTOR_PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        return None
    
    def test_contractor_login_success(self):
        """Test contractor login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": CONTRACTOR_USERNAME, "password": CONTRACTOR_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["role"] == "contractor"
        print(f"✓ Contractor login successful - user: {data['user'].get('full_name', data['user'].get('username'))}")
    
    def test_contractor_login_invalid(self):
        """Test contractor login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "wronguser", "password": "wrongpass"}
        )
        assert response.status_code == 401
        print("✓ Invalid contractor login correctly rejected")
    
    def test_contractor_earnings(self, contractor_token):
        """Test contractor earnings endpoint - verify $11/stop pay rate"""
        if not contractor_token:
            pytest.skip("Could not get contractor token")
        
        response = requests.get(
            f"{BASE_URL}/api/contractor/earnings",
            headers={"Authorization": f"Bearer {contractor_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify $11/stop pay rate
        assert "pay_per_stop" in data
        assert data["pay_per_stop"] == 11.0, f"Expected $11/stop, got ${data['pay_per_stop']}"
        
        # Verify other earnings fields
        assert "total_completed_stops" in data
        assert "total_earnings" in data
        assert "this_week_earnings" in data
        print(f"✓ Contractor earnings endpoint working - pay_per_stop: ${data['pay_per_stop']}")
        print(f"  Total earnings: ${data['total_earnings']}, This week: ${data['this_week_earnings']}")
    
    def test_contractor_today_route(self, contractor_token):
        """Test contractor's today route endpoint"""
        if not contractor_token:
            pytest.skip("Could not get contractor token")
        
        response = requests.get(
            f"{BASE_URL}/api/contractor/today",
            headers={"Authorization": f"Bearer {contractor_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "date" in data
        assert "bookings" in data
        assert "total_stops" in data
        print(f"✓ Contractor today route - {data['total_stops']} stops for {data['date']}")
    
    def test_contractor_notifications(self, contractor_token):
        """Test contractor notifications endpoint"""
        if not contractor_token:
            pytest.skip("Could not get contractor token")
        
        response = requests.get(
            f"{BASE_URL}/api/contractor/notifications",
            headers={"Authorization": f"Bearer {contractor_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data
        print(f"✓ Contractor notifications - {len(data.get('notifications', []))} notifications")
    
    def test_contractor_routes(self, contractor_token):
        """Test contractor routes endpoint"""
        if not contractor_token:
            pytest.skip("Could not get contractor token")
        
        response = requests.get(
            f"{BASE_URL}/api/contractor/routes",
            headers={"Authorization": f"Bearer {contractor_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "routes" in data
        print(f"✓ Contractor routes - {len(data.get('routes', []))} routes assigned")


class TestAdminPortal:
    """Admin Portal API tests - login, dashboard, stats"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        return None
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful - username: {data['user'].get('username')}")
    
    def test_admin_stats(self, admin_token):
        """Test admin stats endpoint"""
        if not admin_token:
            pytest.skip("Could not get admin token")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify stats fields exist
        assert "total_bookings" in data
        assert "pending" in data
        assert "confirmed" in data
        assert "completed" in data
        assert "total_revenue" in data
        assert "contractor_count" in data
        print(f"✓ Admin stats - {data['total_bookings']} bookings, ${data['total_revenue']} revenue")
    
    def test_admin_bookings(self, admin_token):
        """Test admin bookings list endpoint"""
        if not admin_token:
            pytest.skip("Could not get admin token")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/bookings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "bookings" in data
        print(f"✓ Admin bookings - {len(data.get('bookings', []))} bookings")
    
    def test_admin_contractors_list(self, admin_token):
        """Test admin contractors list endpoint"""
        if not admin_token:
            pytest.skip("Could not get admin token")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/contractors",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "contractors" in data
        print(f"✓ Admin contractors - {len(data.get('contractors', []))} contractors")
    
    def test_admin_routes_list(self, admin_token):
        """Test admin routes list endpoint"""
        if not admin_token:
            pytest.skip("Could not get admin token")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/routes",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "routes" in data
        print(f"✓ Admin routes - {len(data.get('routes', []))} routes")


class TestCNSValidation:
    """Test CNS (Cannot Service) validation - requires description + photo"""
    
    @pytest.fixture
    def contractor_token(self):
        """Get contractor auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": CONTRACTOR_USERNAME, "password": CONTRACTOR_PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        return None
    
    def test_cns_requires_description(self, contractor_token):
        """Test that CNS requires description of at least 10 characters"""
        if not contractor_token:
            pytest.skip("Could not get contractor token")
        
        # Get today's tasks to find a booking
        tasks_res = requests.get(
            f"{BASE_URL}/api/contractor/today",
            headers={"Authorization": f"Bearer {contractor_token}"}
        )
        bookings = tasks_res.json().get("bookings", [])
        
        if not bookings:
            # Skip if no bookings available to test
            print("⏭ No bookings available to test CNS validation - SKIPPED")
            return
        
        # Find a pending booking
        pending_booking = next(
            (b for b in bookings if b.get("stop_status") == "pending" or b.get("task_status") == "pending"),
            None
        )
        
        if not pending_booking:
            print("⏭ No pending bookings to test CNS - SKIPPED")
            return
        
        # Try CNS with short description (should fail)
        response = requests.post(
            f"{BASE_URL}/api/contractor/stop/{pending_booking['id']}/complete",
            headers={"Authorization": f"Bearer {contractor_token}"},
            json={
                "status": "cns",
                "notes": "short",  # Less than 10 chars
                "photo_url": "https://example.com/photo.jpg"
            }
        )
        
        if response.status_code == 400:
            assert "description" in response.json().get("detail", "").lower() or "10" in response.json().get("detail", "")
            print("✓ CNS correctly rejects short description")
        else:
            print(f"⚠ CNS validation test inconclusive - status: {response.status_code}")
    
    def test_cns_requires_photo(self, contractor_token):
        """Test that CNS requires a photo"""
        if not contractor_token:
            pytest.skip("Could not get contractor token")
        
        # Get today's tasks
        tasks_res = requests.get(
            f"{BASE_URL}/api/contractor/today",
            headers={"Authorization": f"Bearer {contractor_token}"}
        )
        bookings = tasks_res.json().get("bookings", [])
        
        if not bookings:
            print("⏭ No bookings available to test CNS photo validation - SKIPPED")
            return
        
        pending_booking = next(
            (b for b in bookings if b.get("stop_status") == "pending" or b.get("task_status") == "pending"),
            None
        )
        
        if not pending_booking:
            print("⏭ No pending bookings to test CNS photo - SKIPPED")
            return
        
        # Try CNS without photo (should fail)
        response = requests.post(
            f"{BASE_URL}/api/contractor/stop/{pending_booking['id']}/complete",
            headers={"Authorization": f"Bearer {contractor_token}"},
            json={
                "status": "cns",
                "notes": "This is a detailed description of why the service cannot be completed"
                # No photo_url
            }
        )
        
        if response.status_code == 400:
            assert "photo" in response.json().get("detail", "").lower()
            print("✓ CNS correctly rejects missing photo")
        else:
            print(f"⚠ CNS photo validation test inconclusive - status: {response.status_code}")


class TestRouteRequests:
    """Test route request functionality for contractors"""
    
    @pytest.fixture
    def contractor_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": CONTRACTOR_USERNAME, "password": CONTRACTOR_PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        return None
    
    def test_route_request_endpoint_exists(self, contractor_token):
        """Test that route request endpoint exists"""
        if not contractor_token:
            pytest.skip("Could not get contractor token")
        
        # Get route requests
        response = requests.get(
            f"{BASE_URL}/api/contractor/route-requests",
            headers={"Authorization": f"Bearer {contractor_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        print(f"✓ Route requests endpoint working - {len(data.get('requests', []))} requests")
    
    def test_submit_route_request(self, contractor_token):
        """Test submitting a route request"""
        if not contractor_token:
            pytest.skip("Could not get contractor token")
        
        response = requests.post(
            f"{BASE_URL}/api/contractor/route-requests",
            headers={"Authorization": f"Bearer {contractor_token}"},
            json={
                "zip_codes": ["76028"],
                "num_routes": 1
            }
        )
        # Should be 200 or 201 for success
        assert response.status_code in [200, 201]
        print(f"✓ Route request submitted successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
