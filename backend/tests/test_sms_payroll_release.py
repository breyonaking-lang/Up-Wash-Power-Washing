"""
Backend API Tests for Up-Wash Power Washing - Iteration 8
Testing: SMS Notifications, Payroll System, Route Release

Features tested:
- SMS en-route notification API
- SMS completion notification API  
- Direct SMS send API
- SMS logs API
- Payroll pending API
- Payroll history API
- Payroll process API
- Route release with auto-move
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Get backend URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://upwash-preview.preview.emergentagent.com"

# Admin credentials from .env
ADMIN_USERNAME = "Hughes0108"
ADMIN_PASSWORD = "Godfirst7!"

# Contractor credentials
CONTRACTOR_USERNAME = "ajb123"
CONTRACTOR_PASSWORD = "upwash_test_123"


class TestAPIAccess:
    """Test basic API access and authentication"""
    
    def test_api_root(self):
        """Test API root endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print(f"API root: {response.json()}")
    
    def test_admin_login(self):
        """Test admin login returns valid token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert len(data["access_token"]) > 0
        print(f"Admin login successful, token: {data['access_token'][:20]}...")
    
    def test_contractor_login(self):
        """Test contractor login returns valid token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": CONTRACTOR_USERNAME,
            "password": CONTRACTOR_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print(f"Contractor login successful, token: {data['access_token'][:20]}...")


@pytest.fixture
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed")


@pytest.fixture
def contractor_token():
    """Get contractor auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": CONTRACTOR_USERNAME,
        "password": CONTRACTOR_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Contractor authentication failed")


@pytest.fixture
def admin_headers(admin_token):
    """Get admin auth headers"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture
def contractor_headers(contractor_token):
    """Get contractor auth headers"""
    return {
        "Authorization": f"Bearer {contractor_token}",
        "Content-Type": "application/json"
    }


class TestSMSAPIs:
    """Test SMS notification APIs"""
    
    def test_admin_sms_logs_endpoint(self, admin_headers):
        """Test GET /api/admin/sms/logs - returns logs list"""
        response = requests.get(f"{BASE_URL}/api/admin/sms/logs", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        assert isinstance(data["logs"], list)
        print(f"SMS logs count: {len(data['logs'])}")
    
    def test_direct_sms_send(self, contractor_headers):
        """Test POST /api/contractor/sms/send - direct SMS"""
        test_phone = "+15555550001"
        response = requests.post(f"{BASE_URL}/api/contractor/sms/send", 
            headers=contractor_headers,
            json={
                "phone": test_phone,
                "message": "Test message from automated test",
                "booking_id": None
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "status" in data
        # In demo mode, status should be "demo_logged"
        assert data["status"] in ["sent", "demo_logged", "failed"]
        print(f"SMS send result: {data}")
    
    def test_sms_en_route_invalid_booking(self, contractor_headers):
        """Test POST /api/contractor/sms/en-route/{booking_id} with invalid booking"""
        fake_booking_id = "nonexistent-booking-123"
        response = requests.post(
            f"{BASE_URL}/api/contractor/sms/en-route/{fake_booking_id}",
            headers=contractor_headers
        )
        # Should return 404 for non-existent booking
        assert response.status_code == 404
        print(f"En-route SMS with invalid booking: {response.json()}")
    
    def test_sms_completed_invalid_booking(self, contractor_headers):
        """Test POST /api/contractor/sms/completed/{booking_id} with invalid booking"""
        fake_booking_id = "nonexistent-booking-456"
        response = requests.post(
            f"{BASE_URL}/api/contractor/sms/completed/{fake_booking_id}",
            headers=contractor_headers
        )
        # Should return 404 for non-existent booking
        assert response.status_code == 404
        print(f"Completion SMS with invalid booking: {response.json()}")
    
    def test_sms_history_endpoint(self, contractor_headers):
        """Test GET /api/contractor/sms/history/{customer_phone}"""
        test_phone = "+15555550001"
        response = requests.get(
            f"{BASE_URL}/api/contractor/sms/history/{test_phone}",
            headers=contractor_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "messages" in data
        assert isinstance(data["messages"], list)
        print(f"SMS history for {test_phone}: {len(data['messages'])} messages")


class TestPayrollAPIs:
    """Test Payroll System APIs"""
    
    def test_payroll_pending_endpoint(self, admin_headers):
        """Test GET /api/admin/payroll/pending - returns pending payroll data"""
        response = requests.get(f"{BASE_URL}/api/admin/payroll/pending", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "payroll_summary" in data
        assert "total_pending" in data
        assert "pay_rate" in data
        assert isinstance(data["payroll_summary"], list)
        assert isinstance(data["total_pending"], (int, float))
        
        # Verify pay rate is $11 as expected
        assert data["pay_rate"] == 11  # $11 per stop
        
        print(f"Pending payroll - Total: ${data['total_pending']}, Rate: ${data['pay_rate']}/stop")
        print(f"Contractors with pending: {len(data['payroll_summary'])}")
        
        # Verify contractor data structure if any
        for contractor in data["payroll_summary"]:
            assert "contractor_id" in contractor
            assert "contractor_name" in contractor
            assert "completed_stops" in contractor
            assert "unpaid_amount" in contractor
    
    def test_payroll_history_endpoint(self, admin_headers):
        """Test GET /api/admin/payroll/history - returns payment history"""
        response = requests.get(f"{BASE_URL}/api/admin/payroll/history", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "history" in data
        assert "weekly_summary" in data
        assert "total_paid_all_time" in data
        assert isinstance(data["history"], list)
        
        print(f"Payroll history - Total paid all time: ${data['total_paid_all_time']}")
        print(f"History records: {len(data['history'])}")
        
        # Verify history record structure if any
        for record in data["history"]:
            assert "id" in record
            assert "contractor_id" in record
            assert "amount" in record
            assert "stops_paid" in record
            assert "paid_at" in record
    
    def test_payroll_process_invalid_contractor(self, admin_headers):
        """Test POST /api/admin/payroll/process/{contractor_id} with invalid ID"""
        fake_contractor_id = "nonexistent-contractor-123"
        response = requests.post(
            f"{BASE_URL}/api/admin/payroll/process/{fake_contractor_id}",
            headers=admin_headers
        )
        # Should return 404 for non-existent contractor
        assert response.status_code == 404
        print(f"Process payroll invalid contractor: {response.json()}")
    
    def test_contractor_payroll_history(self, contractor_headers):
        """Test GET /api/contractor/payroll/history - contractor's own history"""
        response = requests.get(
            f"{BASE_URL}/api/contractor/payroll/history",
            headers=contractor_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "history" in data
        assert "total_earned" in data
        assert "total_stops_paid" in data
        assert "pay_rate" in data
        
        print(f"Contractor earnings - Total: ${data['total_earned']}, Stops: {data['total_stops_paid']}")


class TestRouteReleaseAPIs:
    """Test Route Release System APIs"""
    
    def test_get_released_routes(self, admin_headers):
        """Test GET /api/admin/released-routes - returns released routes list"""
        response = requests.get(f"{BASE_URL}/api/admin/released-routes", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "released_routes" in data
        assert "new_releases_count" in data
        assert isinstance(data["released_routes"], list)
        
        print(f"Released routes: {len(data['released_routes'])}, New: {data['new_releases_count']}")
        
        # Verify route structure if any routes exist
        for route in data["released_routes"]:
            assert "id" in route
            assert "route_name" in route or "route_id" in route
            assert "num_stops" in route
            assert "contractor_pay" in route
            assert "status" in route
    
    def test_release_route_not_assigned(self, contractor_headers):
        """Test POST /api/contractor/routes/{route_id}/release - not assigned route"""
        fake_route_id = "nonexistent-route-123"
        response = requests.post(
            f"{BASE_URL}/api/contractor/routes/{fake_route_id}/release",
            headers=contractor_headers,
            json={"reason": "Test release"}
        )
        # Should return 404 for non-existent route
        assert response.status_code == 404
        print(f"Release invalid route: {response.json()}")
    
    def test_acknowledge_released_route_invalid(self, admin_headers):
        """Test PATCH /api/admin/released-routes/{id}/acknowledge with invalid ID"""
        fake_id = "nonexistent-release-123"
        response = requests.patch(
            f"{BASE_URL}/api/admin/released-routes/{fake_id}/acknowledge",
            headers=admin_headers
        )
        # Should succeed even with invalid ID (upsert behavior) or return appropriate error
        assert response.status_code in [200, 404]
        print(f"Acknowledge invalid release: {response.json()}")
    
    def test_dispatch_released_route_invalid(self, admin_headers):
        """Test POST /api/admin/released-routes/{id}/dispatch with invalid ID"""
        fake_id = "nonexistent-release-456"
        response = requests.post(
            f"{BASE_URL}/api/admin/released-routes/{fake_id}/dispatch",
            headers=admin_headers,
            json={"contractor_id": "fake-contractor", "message": "Test dispatch"}
        )
        # Should return 404 for non-existent release
        assert response.status_code == 404
        print(f"Dispatch invalid release: {response.json()}")
    
    def test_claim_released_route_invalid(self, contractor_headers):
        """Test POST /api/contractor/released-routes/{id}/claim with invalid ID"""
        fake_id = "nonexistent-release-789"
        response = requests.post(
            f"{BASE_URL}/api/contractor/released-routes/{fake_id}/claim",
            headers=contractor_headers
        )
        # Should return 404 for non-existent release
        assert response.status_code == 404
        print(f"Claim invalid release: {response.json()}")


class TestSMSWithValidBooking:
    """Test SMS APIs with a valid booking (integration test)"""
    
    def test_get_contractor_tasks_and_sms(self, contractor_headers):
        """Get contractor tasks and test SMS on a real booking"""
        # First get contractor's assigned tasks/bookings
        response = requests.get(
            f"{BASE_URL}/api/contractor/tasks",
            headers=contractor_headers
        )
        
        if response.status_code != 200:
            pytest.skip("Could not fetch contractor tasks")
        
        data = response.json()
        tasks = data.get("tasks", [])
        
        if not tasks:
            print("No tasks assigned to contractor - skipping SMS test with real booking")
            pytest.skip("No tasks available for SMS test")
        
        # Get a task with a customer phone
        valid_task = None
        for task in tasks:
            if task.get("customer_phone"):
                valid_task = task
                break
        
        if not valid_task:
            print("No tasks with customer phone found")
            pytest.skip("No tasks with phone for SMS test")
        
        booking_id = valid_task["id"]
        print(f"Testing SMS with booking {booking_id}, customer: {valid_task.get('customer_name')}")
        
        # Test en-route SMS
        response = requests.post(
            f"{BASE_URL}/api/contractor/sms/en-route/{booking_id}",
            headers=contractor_headers
        )
        
        # Could be 200 (success) or 400 (no phone) depending on data
        assert response.status_code in [200, 400]
        print(f"En-route SMS result: {response.json()}")


class TestIntegratedRouteFlow:
    """Test integrated route release flow"""
    
    def test_get_contractor_routes(self, contractor_headers):
        """Get contractor's assigned routes"""
        response = requests.get(
            f"{BASE_URL}/api/contractor/routes",
            headers=contractor_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        routes = data.get("routes", [])
        print(f"Contractor has {len(routes)} assigned routes")
        
        # Return routes for further testing
        return routes
    
    def test_get_admin_routes(self, admin_headers):
        """Get all routes from admin perspective"""
        response = requests.get(
            f"{BASE_URL}/api/admin/routes",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        routes = data.get("routes", [])
        print(f"Total routes in system: {len(routes)}")
        
        # Check for released routes
        released = [r for r in routes if r.get("status") == "released"]
        assigned = [r for r in routes if r.get("assigned_contractor_id")]
        
        print(f"Released routes: {len(released)}, Assigned routes: {len(assigned)}")


class TestSMSLogsVerification:
    """Verify SMS logs after sending messages"""
    
    def test_sms_logs_contain_recent_messages(self, admin_headers, contractor_headers):
        """Send SMS and verify it appears in logs"""
        # Send a test SMS
        unique_msg = f"Test verification message {datetime.now().isoformat()}"
        test_phone = "+15555559999"
        
        send_response = requests.post(
            f"{BASE_URL}/api/contractor/sms/send",
            headers=contractor_headers,
            json={
                "phone": test_phone,
                "message": unique_msg
            }
        )
        
        if send_response.status_code != 200:
            pytest.skip("Could not send SMS")
        
        # Check SMS logs
        logs_response = requests.get(
            f"{BASE_URL}/api/admin/sms/logs",
            headers=admin_headers
        )
        
        assert logs_response.status_code == 200
        logs_data = logs_response.json()
        
        # Verify our message is in logs (should be in demo_logged status)
        found = False
        for log in logs_data.get("logs", []):
            if unique_msg in log.get("message", ""):
                found = True
                assert log["to_phone"] == test_phone
                assert log["status"] in ["sent", "demo_logged"]
                print(f"Found our SMS in logs with status: {log['status']}")
                break
        
        assert found, "Sent SMS should appear in admin logs"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
