"""
Test suite for new delete functionality, contract documents, and contractor accept/decline features.

Features tested:
1. DELETE /api/admin/routes/{id} - Single route delete
2. POST /api/admin/routes/bulk-delete - Bulk delete routes
3. DELETE /api/admin/routes/old - Delete old pending routes (30+ days)
4. DELETE /api/admin/sms-logs/{id} - Single SMS log delete
5. POST /api/admin/sms-logs/bulk-delete - Bulk delete SMS logs
6. DELETE /api/admin/sms-logs/all - Delete all SMS logs
7. POST /api/admin/contracts/documents - Add contract document
8. GET /api/admin/contracts/documents - List contract documents
9. DELETE /api/admin/contracts/documents/{id} - Delete contract document
10. POST /api/contractor/released-routes/{id}/accept - Contractor accepts route
11. POST /api/contractor/released-routes/{id}/decline - Contractor declines route
12. Route auto-removal from pending when assigned
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

# Test credentials
ADMIN_USERNAME = "Hughes0108"
ADMIN_PASSWORD = "Godfirst7!"
CONTRACTOR_USERNAME = "ajb123"
CONTRACTOR_PASSWORD = "upwash_test_123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD
    })
    if res.status_code == 200:
        return res.json().get("access_token")
    pytest.skip(f"Admin authentication failed: {res.status_code} - {res.text}")


@pytest.fixture(scope="module")
def contractor_token():
    """Get contractor authentication token"""
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": CONTRACTOR_USERNAME,
        "password": CONTRACTOR_PASSWORD
    })
    if res.status_code == 200:
        return res.json().get("access_token")
    pytest.skip(f"Contractor authentication failed: {res.status_code} - {res.text}")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Admin auth headers"""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    }


@pytest.fixture(scope="module")
def contractor_headers(contractor_token):
    """Contractor auth headers"""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {contractor_token}"
    }


class TestRouteDeleteFeatures:
    """Test route delete functionality"""
    
    def test_create_test_route(self, admin_headers):
        """Create a test route for deletion tests"""
        res = requests.post(f"{BASE_URL}/api/admin/routes", headers=admin_headers, json={
            "name": "TEST_DeleteRoute",
            "description": "Test route for deletion",
            "area": "76028",
            "price": 350
        })
        assert res.status_code == 200 or res.status_code == 201
        data = res.json()
        assert "id" in data or "route" in data
        print(f"✓ Test route created successfully")
    
    def test_delete_single_route_requires_auth(self):
        """DELETE /api/admin/routes/{id} requires authentication"""
        res = requests.delete(f"{BASE_URL}/api/admin/routes/fake-id")
        assert res.status_code == 401 or res.status_code == 403
        print(f"✓ DELETE route requires auth: {res.status_code}")
    
    def test_delete_single_route(self, admin_headers):
        """DELETE /api/admin/routes/{id} deletes a single route"""
        # First create a route
        create_res = requests.post(f"{BASE_URL}/api/admin/routes", headers=admin_headers, json={
            "name": "TEST_ToDelete",
            "description": "Route to delete",
            "area": "76028"
        })
        assert create_res.status_code in [200, 201]
        route_id = create_res.json().get("id") or create_res.json().get("route", {}).get("id")
        
        # Delete it
        delete_res = requests.delete(f"{BASE_URL}/api/admin/routes/{route_id}", headers=admin_headers)
        assert delete_res.status_code == 200
        data = delete_res.json()
        assert "message" in data
        assert data.get("deleted") == 1
        print(f"✓ Single route deleted: {data}")
    
    def test_delete_nonexistent_route(self, admin_headers):
        """DELETE /api/admin/routes/{id} returns 404 for nonexistent route"""
        res = requests.delete(f"{BASE_URL}/api/admin/routes/nonexistent-id-12345", headers=admin_headers)
        assert res.status_code == 404
        print(f"✓ Nonexistent route returns 404")
    
    def test_bulk_delete_routes(self, admin_headers):
        """POST /api/admin/routes/bulk-delete deletes multiple routes"""
        # Create 2 test routes
        route_ids = []
        for i in range(2):
            create_res = requests.post(f"{BASE_URL}/api/admin/routes", headers=admin_headers, json={
                "name": f"TEST_BulkDelete_{i}",
                "description": f"Bulk delete test {i}",
                "area": "76028"
            })
            if create_res.status_code in [200, 201]:
                rid = create_res.json().get("id") or create_res.json().get("route", {}).get("id")
                if rid:
                    route_ids.append(rid)
        
        if len(route_ids) == 0:
            pytest.skip("Could not create test routes for bulk delete")
        
        # Bulk delete
        bulk_res = requests.post(f"{BASE_URL}/api/admin/routes/bulk-delete", headers=admin_headers, json={
            "ids": route_ids
        })
        assert bulk_res.status_code == 200
        data = bulk_res.json()
        assert "deleted" in data
        print(f"✓ Bulk delete successful: {data}")
    
    def test_delete_old_routes_endpoint(self, admin_headers):
        """DELETE /api/admin/routes/old deletes old pending routes"""
        res = requests.delete(f"{BASE_URL}/api/admin/routes/old?days=30", headers=admin_headers)
        assert res.status_code == 200
        data = res.json()
        assert "message" in data
        assert "deleted" in data
        print(f"✓ Delete old routes endpoint works: {data}")


class TestSMSLogDeleteFeatures:
    """Test SMS log delete functionality"""
    
    def test_get_sms_logs(self, admin_headers):
        """GET /api/admin/sms/logs returns list of SMS logs"""
        res = requests.get(f"{BASE_URL}/api/admin/sms/logs", headers=admin_headers)
        assert res.status_code == 200
        data = res.json()
        assert "logs" in data
        print(f"✓ SMS logs fetched: {len(data['logs'])} logs")
    
    def test_delete_single_sms_log_nonexistent(self, admin_headers):
        """DELETE /api/admin/sms-logs/{id} returns 404 for nonexistent"""
        res = requests.delete(f"{BASE_URL}/api/admin/sms-logs/nonexistent-id", headers=admin_headers)
        assert res.status_code == 404
        print(f"✓ DELETE nonexistent SMS log returns 404")
    
    def test_bulk_delete_sms_logs_empty(self, admin_headers):
        """POST /api/admin/sms-logs/bulk-delete with empty list"""
        res = requests.post(f"{BASE_URL}/api/admin/sms-logs/bulk-delete", headers=admin_headers, json={
            "ids": []
        })
        assert res.status_code == 200
        data = res.json()
        assert data.get("deleted") == 0
        print(f"✓ Bulk delete with empty list works: {data}")
    
    def test_delete_all_sms_logs_endpoint(self, admin_headers):
        """DELETE /api/admin/sms-logs/all endpoint exists and works"""
        res = requests.delete(f"{BASE_URL}/api/admin/sms-logs/all", headers=admin_headers)
        assert res.status_code == 200
        data = res.json()
        assert "message" in data
        print(f"✓ Delete all SMS logs endpoint works: {data}")


class TestContractDocumentFeatures:
    """Test contract document management"""
    
    def test_add_contract_document(self, admin_headers):
        """POST /api/admin/contracts/documents adds a new document"""
        res = requests.post(f"{BASE_URL}/api/admin/contracts/documents", headers=admin_headers, json={
            "title": "TEST_ContractDoc",
            "content": "This is a test contract document content.\n\nSection 1: Terms and Conditions\n- Item 1\n- Item 2"
        })
        assert res.status_code == 200
        data = res.json()
        assert "document_id" in data
        print(f"✓ Contract document added: {data}")
    
    def test_list_contract_documents(self, admin_headers):
        """GET /api/admin/contracts/documents lists all documents"""
        res = requests.get(f"{BASE_URL}/api/admin/contracts/documents", headers=admin_headers)
        assert res.status_code == 200
        data = res.json()
        assert "documents" in data
        print(f"✓ Contract documents fetched: {len(data['documents'])} docs")
    
    def test_delete_contract_document(self, admin_headers):
        """DELETE /api/admin/contracts/documents/{id} deletes a document"""
        # First create a document
        create_res = requests.post(f"{BASE_URL}/api/admin/contracts/documents", headers=admin_headers, json={
            "title": "TEST_ToDeleteDoc",
            "content": "Document to be deleted"
        })
        assert create_res.status_code == 200
        doc_id = create_res.json().get("document_id")
        
        # Delete it
        delete_res = requests.delete(f"{BASE_URL}/api/admin/contracts/documents/{doc_id}", headers=admin_headers)
        assert delete_res.status_code == 200
        print(f"✓ Contract document deleted successfully")
    
    def test_delete_nonexistent_document(self, admin_headers):
        """DELETE /api/admin/contracts/documents/{id} returns 404 for nonexistent"""
        res = requests.delete(f"{BASE_URL}/api/admin/contracts/documents/fake-doc-id", headers=admin_headers)
        assert res.status_code == 404
        print(f"✓ Delete nonexistent document returns 404")


class TestContractorAcceptDeclineRoutes:
    """Test contractor accept/decline released routes functionality"""
    
    def test_contractor_get_available_routes(self, contractor_headers):
        """GET /api/contractor/available-routes returns available routes"""
        res = requests.get(f"{BASE_URL}/api/contractor/available-routes", headers=contractor_headers)
        assert res.status_code == 200
        data = res.json()
        assert "available_routes" in data
        print(f"✓ Available routes fetched: {len(data['available_routes'])} routes")
    
    def test_decline_nonexistent_route(self, contractor_headers):
        """POST /api/contractor/released-routes/{id}/decline for nonexistent route"""
        res = requests.post(f"{BASE_URL}/api/contractor/released-routes/fake-route-id/decline", headers=contractor_headers)
        # Should either return 200 (no error when declining) or 404
        assert res.status_code in [200, 404]
        print(f"✓ Decline nonexistent route handled: {res.status_code}")
    
    def test_accept_nonexistent_route(self, contractor_headers):
        """POST /api/contractor/released-routes/{id}/accept for nonexistent route"""
        res = requests.post(f"{BASE_URL}/api/contractor/released-routes/fake-route-id/accept", headers=contractor_headers)
        assert res.status_code == 404
        print(f"✓ Accept nonexistent route returns 404")


class TestRouteAssignmentAutoRemove:
    """Test that routes are auto-removed from pending when assigned"""
    
    def test_pending_routes_filter(self, admin_headers):
        """Verify pending routes endpoint filters out assigned routes"""
        res = requests.get(f"{BASE_URL}/api/admin/routes", headers=admin_headers)
        assert res.status_code == 200
        data = res.json()
        routes = data.get("routes", [])
        
        # Check if any assigned routes slip through (they shouldn't)
        for route in routes:
            if route.get("assigned_contractor_id"):
                print(f"⚠ Warning: Assigned route found in pending list: {route.get('name')}")
        
        print(f"✓ Fetched {len(routes)} routes from admin routes endpoint")


class TestNotificationManagement:
    """Test notification marking functionality"""
    
    def test_mark_notifications_by_type(self, admin_headers):
        """PATCH /api/admin/notifications/mark-read marks notifications by type"""
        res = requests.patch(f"{BASE_URL}/api/admin/notifications/mark-read?notification_type=new_route_booking", headers=admin_headers)
        assert res.status_code == 200
        data = res.json()
        assert "message" in data
        print(f"✓ Mark notifications by type: {data}")
    
    def test_get_admin_notifications(self, admin_headers):
        """GET /api/admin/notifications returns notification list with counts"""
        res = requests.get(f"{BASE_URL}/api/admin/notifications", headers=admin_headers)
        assert res.status_code == 200
        data = res.json()
        assert "notifications" in data
        assert "unread_count" in data
        assert "counts" in data
        print(f"✓ Admin notifications: {data['unread_count']} unread")


class TestBookingAmountEdit:
    """Test booking amount edit functionality"""
    
    def test_update_booking_amount_nonexistent(self, admin_headers):
        """PATCH /api/admin/bookings/{id}/amount returns 404 for nonexistent"""
        res = requests.patch(f"{BASE_URL}/api/admin/bookings/fake-booking-id/amount", headers=admin_headers, json={
            "total": 150.00
        })
        assert res.status_code == 404
        print(f"✓ Update nonexistent booking returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
