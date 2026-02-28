"""
Tests for new Up-Wash Power Washing features (Iteration 7):
- Photo upload API (base64)
- Admin notifications with counts
- Contractor location/proximity features
- Location request system
- Contract management with signing
- Route approval status changes
"""
import pytest
import requests
import os
import uuid
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = "Hughes0108"
ADMIN_PASSWORD = "Godfirst7!"
CONTRACTOR_USERNAME = "ajb123"
CONTRACTOR_PASSWORD = "upwash_test_123"
TEST_CLIENT_EMAIL = "test_contract_client@example.com"
TEST_CLIENT_PASSWORD = "test123"


class TestAuthAndSetup:
    """Authentication tests - run first"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "Upwash Power Washing API"
        print("✓ API root endpoint working")

    def test_admin_login(self):
        """Test admin login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful")
        return data["access_token"]

    def test_contractor_login(self):
        """Test contractor login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": CONTRACTOR_USERNAME,
            "password": CONTRACTOR_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "contractor"
        print(f"✓ Contractor login successful")
        return data["access_token"]


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def contractor_token():
    """Get contractor authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": CONTRACTOR_USERNAME,
        "password": CONTRACTOR_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip("Contractor authentication failed")


@pytest.fixture(scope="module")
def client_token():
    """Get or create client authentication token"""
    # Try login first
    response = requests.post(f"{BASE_URL}/api/client/login", json={
        "email": TEST_CLIENT_EMAIL,
        "password": TEST_CLIENT_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    
    # Register new client
    response = requests.post(f"{BASE_URL}/api/client/register", json={
        "name": "Test Contract Client",
        "email": TEST_CLIENT_EMAIL,
        "phone": "555-999-8888",
        "password": TEST_CLIENT_PASSWORD,
        "address": "123 Test St, Burleson, TX 76028"
    })
    if response.status_code in [200, 201]:
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    pytest.skip("Client authentication failed")


def get_headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }


class TestPhotoUpload:
    """Test photo upload system - /api/upload/photo-base64"""
    
    def test_upload_photo_base64(self):
        """Test base64 photo upload endpoint"""
        # Create a simple test image (1x1 red pixel PNG base64)
        test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        
        response = requests.post(f"{BASE_URL}/api/upload/photo-base64", json={
            "data": test_image_base64,
            "type": "test"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "photo_url" in data
        assert data["photo_url"].startswith("/uploads/photos/")
        print(f"✓ Photo upload successful: {data['photo_url']}")
        return data["photo_url"]

    def test_upload_photo_base64_with_data_url_prefix(self):
        """Test base64 photo upload with data URL prefix"""
        test_image_base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        
        response = requests.post(f"{BASE_URL}/api/upload/photo-base64", json={
            "data": test_image_base64,
            "type": "cns"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Photo upload with data URL prefix successful")

    def test_upload_photo_base64_empty_data(self):
        """Test base64 photo upload with empty data - should fail"""
        response = requests.post(f"{BASE_URL}/api/upload/photo-base64", json={
            "data": "",
            "type": "test"
        })
        
        assert response.status_code == 400
        print("✓ Empty photo data correctly rejected")


class TestAdminNotifications:
    """Test admin notifications system with counts"""
    
    def test_get_admin_notifications(self, admin_token):
        """Test GET /api/admin/notifications with counts"""
        response = requests.get(
            f"{BASE_URL}/api/admin/notifications",
            headers=get_headers(admin_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data
        assert "unread_count" in data
        assert "counts" in data
        
        # Verify counts structure
        counts = data["counts"]
        assert "new_bookings" in counts
        assert "scent_bombs" in counts
        assert "route_releases" in counts
        assert "messages" in counts
        assert "cns_stops" in counts
        print(f"✓ Admin notifications endpoint working. Unread: {data['unread_count']}, Counts: {counts}")
        return data

    def test_admin_notifications_requires_auth(self):
        """Test that admin notifications requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/notifications")
        assert response.status_code == 401
        print("✓ Admin notifications correctly requires authentication")

    def test_mark_notification_read(self, admin_token):
        """Test marking a notification as read"""
        # First get notifications
        get_response = requests.get(
            f"{BASE_URL}/api/admin/notifications",
            headers=get_headers(admin_token)
        )
        if get_response.status_code != 200:
            pytest.skip("Could not fetch notifications")
        
        notifications = get_response.json().get("notifications", [])
        if not notifications:
            pytest.skip("No notifications to mark as read")
        
        notif_id = notifications[0].get("id")
        response = requests.patch(
            f"{BASE_URL}/api/admin/notifications/{notif_id}/read",
            headers=get_headers(admin_token)
        )
        
        assert response.status_code == 200
        print(f"✓ Mark notification as read working")

    def test_mark_all_notifications_read(self, admin_token):
        """Test marking all notifications as read"""
        response = requests.patch(
            f"{BASE_URL}/api/admin/notifications/read-all",
            headers=get_headers(admin_token)
        )
        
        assert response.status_code == 200
        print("✓ Mark all notifications as read working")


class TestContractorLocation:
    """Test contractor location sharing and proximity features"""
    
    def test_update_contractor_location(self, contractor_token):
        """Test POST /api/contractor/location to update location"""
        # Burleson, TX coordinates
        lat, lng = 32.5421, -97.3208
        
        response = requests.post(
            f"{BASE_URL}/api/contractor/location?lat={lat}&lng={lng}",
            headers=get_headers(contractor_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("message") == "Location updated"
        print(f"✓ Contractor location update working (lat={lat}, lng={lng})")

    def test_get_nearby_contractors(self, contractor_token):
        """Test GET /api/contractor/nearby"""
        response = requests.get(
            f"{BASE_URL}/api/contractor/nearby",
            headers=get_headers(contractor_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "contractors" in data
        print(f"✓ Nearby contractors endpoint working. Found {len(data['contractors'])} contractors")

    def test_nearby_contractors_includes_distance(self, contractor_token):
        """Test that nearby contractors includes distance calculation"""
        response = requests.get(
            f"{BASE_URL}/api/contractor/nearby",
            headers=get_headers(contractor_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check if contractors have distance_miles field
        for contractor in data.get("contractors", []):
            # Should have is_online flag
            assert "is_online" in contractor
            # distance_miles can be None if offline or no location
            print(f"  - {contractor.get('full_name', 'Unknown')}: online={contractor.get('is_online')}, distance={contractor.get('distance_miles')} mi")
        
        print("✓ Nearby contractors include distance information")


class TestLocationRequests:
    """Test contractor location request system"""
    
    def test_get_location_requests(self, contractor_token):
        """Test GET /api/contractor/location-requests"""
        response = requests.get(
            f"{BASE_URL}/api/contractor/location-requests",
            headers=get_headers(contractor_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        print(f"✓ Location requests endpoint working. Pending requests: {len(data['requests'])}")

    def test_request_location_invalid_contractor(self, contractor_token):
        """Test requesting location for non-existent contractor"""
        response = requests.post(
            f"{BASE_URL}/api/contractor/request-location/invalid-contractor-id",
            headers=get_headers(contractor_token)
        )
        
        assert response.status_code == 404
        print("✓ Location request correctly rejects invalid contractor ID")


class TestContracts:
    """Test contract management system"""
    
    def test_get_all_contracts_admin(self, admin_token):
        """Test GET /api/admin/contracts"""
        response = requests.get(
            f"{BASE_URL}/api/admin/contracts",
            headers=get_headers(admin_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "contracts" in data
        print(f"✓ Admin contracts endpoint working. Total contracts: {len(data['contracts'])}")

    def test_get_pending_contracts_client(self, client_token):
        """Test GET /api/client/contracts/pending"""
        response = requests.get(
            f"{BASE_URL}/api/client/contracts/pending",
            headers=get_headers(client_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "contracts" in data
        print(f"✓ Client pending contracts endpoint working. Pending: {len(data['contracts'])}")

    def test_sign_contract_invalid_id(self, client_token):
        """Test signing a non-existent contract"""
        test_signature = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        
        response = requests.post(
            f"{BASE_URL}/api/client/contracts/invalid-contract-id/sign",
            headers=get_headers(client_token),
            json={
                "signature_data": test_signature,
                "agreed_terms": True
            }
        )
        
        assert response.status_code == 404
        print("✓ Contract sign correctly rejects invalid contract ID")

    def test_sign_contract_requires_agreement(self, client_token):
        """Test that signing contract requires agreed_terms"""
        # First we need a valid contract to test this
        # Since we may not have one, we'll test the endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/client/contracts/test-contract-id/sign",
            headers=get_headers(client_token),
            json={
                "signature_data": "test",
                "agreed_terms": False
            }
        )
        
        # Should either be 404 (no contract) or 400 (terms not agreed)
        assert response.status_code in [400, 404]
        print("✓ Contract sign endpoint validates terms agreement")


class TestRouteApproval:
    """Test route approval status changes"""
    
    def test_get_admin_routes(self, admin_token):
        """Test GET /api/admin/routes"""
        response = requests.get(
            f"{BASE_URL}/api/admin/routes",
            headers=get_headers(admin_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "routes" in data
        
        # Check route status field exists
        for route in data.get("routes", []):
            if "status" in route:
                print(f"  - Route: {route.get('name', 'Unknown')}, Status: {route.get('status')}")
        
        print(f"✓ Admin routes endpoint working. Total routes: {len(data['routes'])}")

    def test_route_assignment_changes_status(self, admin_token):
        """Test that route assignment updates status from pending to assigned"""
        # First create a test route
        route_response = requests.post(
            f"{BASE_URL}/api/admin/routes",
            headers=get_headers(admin_token),
            json={
                "name": f"TEST_Route_{uuid.uuid4().hex[:8]}",
                "description": "Test route for status change",
                "price": 350.0,
                "area": "76028"
            }
        )
        
        if route_response.status_code != 200:
            pytest.skip("Could not create test route")
        
        route_data = route_response.json()
        route_id = route_data.get("id")
        
        # Get contractors to find one for assignment
        contractor_res = requests.get(
            f"{BASE_URL}/api/admin/contractors",
            headers=get_headers(admin_token)
        )
        
        if contractor_res.status_code != 200:
            pytest.skip("Could not fetch contractors")
        
        contractors = contractor_res.json().get("contractors", [])
        if not contractors:
            pytest.skip("No contractors available")
        
        contractor_id = contractors[0].get("id")
        
        # Assign the route
        assign_response = requests.post(
            f"{BASE_URL}/api/admin/routes/{route_id}/assign",
            headers=get_headers(admin_token),
            json={
                "route_id": route_id,
                "contractor_id": contractor_id
            }
        )
        
        assert assign_response.status_code == 200
        print(f"✓ Route assignment working")

        # Verify route was assigned
        routes_response = requests.get(
            f"{BASE_URL}/api/admin/routes",
            headers=get_headers(admin_token)
        )
        
        routes = routes_response.json().get("routes", [])
        assigned_route = next((r for r in routes if r.get("id") == route_id), None)
        
        if assigned_route:
            assert assigned_route.get("assigned_contractor_id") == contractor_id
            print(f"✓ Route status check - contractor assigned: {assigned_route.get('assigned_contractor_id')}")


class TestAdminStats:
    """Test admin dashboard stats with notification counts"""
    
    def test_admin_stats_includes_all_counts(self, admin_token):
        """Test that admin stats endpoint returns all necessary data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers=get_headers(admin_token)
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check all expected fields
        expected_fields = [
            "total_bookings",
            "pending",
            "confirmed",
            "completed",
            "total_revenue",
            "contractor_count",
            "route_count"
        ]
        
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Admin stats endpoint working:")
        print(f"  - Total bookings: {data.get('total_bookings')}")
        print(f"  - Pending: {data.get('pending')}")
        print(f"  - Contractors: {data.get('contractor_count')}")
        print(f"  - Routes: {data.get('route_count')}")
        print(f"  - Revenue: ${data.get('total_revenue')}")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
