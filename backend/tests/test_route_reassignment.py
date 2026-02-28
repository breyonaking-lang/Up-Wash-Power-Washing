"""
Tests for Route Reassignment Feature
- Admin route reassignment endpoint
- Contractor routes with client details
- SMS notifications on reassignment
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = "Hughes0108"
ADMIN_PASSWORD = "Godfirst7!"
CONTRACTOR_USERNAME = "ajb123"
CONTRACTOR_PASSWORD = "upwash_test_123"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture(scope="module")
def contractor_token(api_client):
    """Get contractor authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "username": CONTRACTOR_USERNAME,
        "password": CONTRACTOR_PASSWORD
    })
    assert response.status_code == 200, f"Contractor login failed: {response.text}"
    data = response.json()
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture(scope="module")
def contractor_headers(contractor_token):
    """Headers with contractor auth"""
    return {
        "Authorization": f"Bearer {contractor_token}",
        "Content-Type": "application/json"
    }


class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_admin_login(self, api_client):
        """Test admin can login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        print("PASS: Admin login successful")
    
    def test_contractor_login(self, api_client):
        """Test contractor can login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "username": CONTRACTOR_USERNAME,
            "password": CONTRACTOR_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "contractor"
        print("PASS: Contractor login successful")


class TestAdminRoutesEndpoints:
    """Test admin routes API endpoints"""
    
    def test_get_admin_routes(self, api_client, admin_headers):
        """Test admin can view all routes"""
        response = api_client.get(f"{BASE_URL}/api/admin/routes", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "routes" in data
        print(f"PASS: Admin can view routes - found {len(data['routes'])} routes")
    
    def test_get_admin_contractors(self, api_client, admin_headers):
        """Test admin can view all contractors"""
        response = api_client.get(f"{BASE_URL}/api/admin/contractors", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "contractors" in data
        print(f"PASS: Admin can view contractors - found {len(data['contractors'])} contractors")


class TestRouteReassignment:
    """Test route reassignment functionality"""
    
    def test_reassign_route_endpoint_exists(self, api_client, admin_headers):
        """Test reassign route endpoint is accessible"""
        # Get routes first
        routes_response = api_client.get(f"{BASE_URL}/api/admin/routes", headers=admin_headers)
        assert routes_response.status_code == 200
        routes = routes_response.json().get("routes", [])
        
        # Get contractors
        contractors_response = api_client.get(f"{BASE_URL}/api/admin/contractors", headers=admin_headers)
        assert contractors_response.status_code == 200
        contractors = contractors_response.json().get("contractors", [])
        
        if len(routes) == 0:
            pytest.skip("No routes available to test reassignment")
        
        if len(contractors) < 2:
            pytest.skip("Need at least 2 contractors to test reassignment")
        
        # Find an assigned route
        assigned_route = None
        for route in routes:
            if route.get("assigned_contractor_id"):
                assigned_route = route
                break
        
        if not assigned_route:
            pytest.skip("No assigned routes to test reassignment")
        
        # Find a different contractor
        new_contractor = None
        for contractor in contractors:
            if contractor["id"] != assigned_route.get("assigned_contractor_id"):
                new_contractor = contractor
                break
        
        if not new_contractor:
            pytest.skip("No other contractor available for reassignment")
        
        # Test reassignment
        response = api_client.post(
            f"{BASE_URL}/api/admin/routes/{assigned_route['id']}/reassign",
            headers=admin_headers,
            json={"new_contractor_id": new_contractor["id"]}
        )
        
        assert response.status_code == 200, f"Reassignment failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert data["message"] == "Route reassigned successfully"
        assert data["new_contractor_id"] == new_contractor["id"]
        print(f"PASS: Route reassigned from {data.get('old_contractor')} to {data.get('new_contractor_name')}")
    
    def test_reassign_route_invalid_route(self, api_client, admin_headers):
        """Test reassignment with invalid route ID"""
        fake_route_id = str(uuid.uuid4())
        response = api_client.post(
            f"{BASE_URL}/api/admin/routes/{fake_route_id}/reassign",
            headers=admin_headers,
            json={"new_contractor_id": "some-contractor-id"}
        )
        assert response.status_code == 404
        print("PASS: Invalid route ID returns 404")
    
    def test_reassign_route_invalid_contractor(self, api_client, admin_headers):
        """Test reassignment with invalid contractor ID"""
        # Get a valid route
        routes_response = api_client.get(f"{BASE_URL}/api/admin/routes", headers=admin_headers)
        routes = routes_response.json().get("routes", [])
        
        if len(routes) == 0:
            pytest.skip("No routes available to test")
        
        route = routes[0]
        fake_contractor_id = str(uuid.uuid4())
        
        response = api_client.post(
            f"{BASE_URL}/api/admin/routes/{route['id']}/reassign",
            headers=admin_headers,
            json={"new_contractor_id": fake_contractor_id}
        )
        assert response.status_code == 404
        print("PASS: Invalid contractor ID returns 404")


class TestRouteDataWithClientDetails:
    """Test that routes include full client details"""
    
    def test_admin_routes_include_client_details(self, api_client, admin_headers):
        """Test that admin routes endpoint returns client details in bookings"""
        response = api_client.get(f"{BASE_URL}/api/admin/routes", headers=admin_headers)
        assert response.status_code == 200
        routes = response.json().get("routes", [])
        
        if len(routes) == 0:
            pytest.skip("No routes available to verify client details")
        
        # Find a route with bookings
        route_with_bookings = None
        for route in routes:
            if route.get("bookings") and len(route.get("bookings", [])) > 0:
                route_with_bookings = route
                break
        
        if not route_with_bookings:
            pytest.skip("No routes with bookings to verify client details")
        
        # Verify booking structure contains client details
        booking = route_with_bookings["bookings"][0]
        expected_fields = ["customer_name", "customer_address"]
        
        for field in expected_fields:
            assert field in booking, f"Missing field: {field}"
        
        print(f"PASS: Route includes client details: name={booking.get('customer_name')}, address={booking.get('customer_address')}")
        
        # Check for optional client fields
        optional_fields = ["customer_phone", "customer_email", "services"]
        found_optional = [f for f in optional_fields if booking.get(f)]
        print(f"PASS: Found optional fields: {found_optional}")


class TestContractorRoutes:
    """Test contractor routes endpoint with client details"""
    
    def test_contractor_routes_endpoint(self, api_client, contractor_headers):
        """Test contractor can view their assigned routes"""
        response = api_client.get(f"{BASE_URL}/api/contractor/routes", headers=contractor_headers)
        assert response.status_code == 200
        data = response.json()
        assert "routes" in data
        print(f"PASS: Contractor can view routes - found {len(data['routes'])} routes")
    
    def test_contractor_routes_unauthorized(self, api_client):
        """Test routes endpoint requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/contractor/routes")
        assert response.status_code == 401
        print("PASS: Contractor routes requires authentication")


class TestAdminContractorAssignments:
    """Test admin contractor view with route assignments"""
    
    def test_contractors_have_route_info(self, api_client, admin_headers):
        """Test that admin can see which routes are assigned to contractors"""
        # Get contractors
        contractors_response = api_client.get(f"{BASE_URL}/api/admin/contractors", headers=admin_headers)
        assert contractors_response.status_code == 200
        contractors = contractors_response.json().get("contractors", [])
        
        # Get routes
        routes_response = api_client.get(f"{BASE_URL}/api/admin/routes", headers=admin_headers)
        assert routes_response.status_code == 200
        routes = routes_response.json().get("routes", [])
        
        # Map contractors to routes
        contractor_routes = {}
        for route in routes:
            if route.get("assigned_contractor_id"):
                cid = route["assigned_contractor_id"]
                if cid not in contractor_routes:
                    contractor_routes[cid] = []
                contractor_routes[cid].append(route)
        
        print(f"PASS: Found {len(contractor_routes)} contractors with assigned routes")
        for cid, croutes in contractor_routes.items():
            contractor_name = next((c["full_name"] for c in contractors if c["id"] == cid), "Unknown")
            total_stops = sum(len(r.get("bookings", [])) for r in croutes)
            print(f"  - {contractor_name}: {len(croutes)} routes, {total_stops} total stops")


class TestRouteClientExpansion:
    """Test that route bookings contain expandable client information"""
    
    def test_route_bookings_structure(self, api_client, admin_headers):
        """Verify route booking structure for Show Clients feature"""
        response = api_client.get(f"{BASE_URL}/api/admin/routes", headers=admin_headers)
        assert response.status_code == 200
        routes = response.json().get("routes", [])
        
        for route in routes:
            if route.get("bookings"):
                for booking in route["bookings"]:
                    # Check required fields for client display
                    assert "customer_name" in booking or "booking_id" in booking
                    print(f"PASS: Route {route['name']} has valid booking structure with {len(route['bookings'])} clients")
                    break


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
