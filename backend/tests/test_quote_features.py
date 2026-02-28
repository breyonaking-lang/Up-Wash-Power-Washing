"""
Test suite for Up-Wash Power Washing new features
- Quote Request API
- Services endpoint validation
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestQuoteRequestAPI:
    """Quote Request endpoint tests"""
    
    def test_create_quote_request_success(self):
        """Test successful quote request submission"""
        response = requests.post(f"{BASE_URL}/api/quotes/request", json={
            "service_type": "home_powerwash",
            "customer_name": "TEST_John Doe",
            "customer_email": "test@example.com",
            "customer_phone": "8175551234",
            "customer_address": "123 Test St, Burleson, TX 76028",
            "description": "Need home power washing for 2-story house",
            "preferred_day": "Thursday",
            "photos": []
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "quote_id" in data, "Response should contain quote_id"
        assert "message" in data, "Response should contain message"
        assert data["message"] == "Quote request submitted"
        print(f"✓ Quote request created with ID: {data['quote_id']}")
    
    def test_create_quote_request_minimal_data(self):
        """Test quote request with minimal required data"""
        response = requests.post(f"{BASE_URL}/api/quotes/request", json={
            "service_type": "construction_cleanup",
            "customer_name": "TEST_Jane Smith",
            "customer_phone": "8175559876",
            "customer_address": "456 Oak Ave, Fort Worth, TX 76102",
            "description": "Post-construction cleanup needed"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "quote_id" in data
        print(f"✓ Quote request with minimal data created: {data['quote_id']}")
    
    def test_create_quote_request_missing_required_fields(self):
        """Test quote request with missing required fields"""
        response = requests.post(f"{BASE_URL}/api/quotes/request", json={
            "service_type": "commercial",
            # Missing customer_name, customer_phone, customer_address, description
        })
        
        # Should fail validation
        assert response.status_code == 422, f"Expected 422 validation error, got {response.status_code}"
        print("✓ Missing required fields correctly rejected with 422")
    

class TestServicesEndpoint:
    """Services endpoint validation"""
    
    def test_get_services(self):
        """Test services endpoint returns all services"""
        response = requests.get(f"{BASE_URL}/api/services")
        
        assert response.status_code == 200
        data = response.json()
        assert "services" in data
        
        services = data["services"]
        assert len(services) > 0, "Should have at least one service"
        
        # Check for quote-based services
        service_ids = [s["service_id"] for s in services]
        assert "home_powerwash" in service_ids, "Should have home_powerwash service"
        assert "construction_cleanup" in service_ids, "Should have construction_cleanup service"
        assert "commercial" in service_ids, "Should have commercial service"
        assert "scent_bomb" in service_ids, "Should have scent_bomb service"
        
        print(f"✓ Found {len(services)} services: {service_ids}")
    
    def test_quote_services_have_quote_pricing(self):
        """Test quote-based services have pricing_type='quote'"""
        response = requests.get(f"{BASE_URL}/api/services")
        data = response.json()
        
        quote_services = ["home_powerwash", "construction_cleanup", "commercial"]
        
        for service in data["services"]:
            if service["service_id"] in quote_services:
                assert service.get("pricing_type") == "quote", \
                    f"Service {service['service_id']} should have pricing_type='quote'"
                print(f"✓ {service['service_id']} has quote pricing")


class TestAdminLogin:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Hughes0108",
            "password": "Godfirst7!"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        print("✓ Admin login successful")
        return data["token"]
    
    def test_admin_get_quotes_authenticated(self):
        """Test getting quote requests with valid auth"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Hughes0108",
            "password": "Godfirst7!"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Could not login as admin")
            
        token = login_response.json().get("token")
        
        # Get quotes
        response = requests.get(
            f"{BASE_URL}/api/admin/quotes",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "quotes" in data
        print(f"✓ Retrieved {len(data['quotes'])} quote requests")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
