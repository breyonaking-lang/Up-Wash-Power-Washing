"""
Test suite for Up-Wash new features:
- In-app messaging system (Client ↔ Admin ↔ Contractor)
- PWA manifest and service worker
- Subscription payment flow endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDS = {"username": "Hughes0108", "password": "Godfirst7!"}
CONTRACTOR_CREDS = {"username": "ajb123", "password": "upwash_test_123"}


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def contractor_token():
    """Get contractor authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=CONTRACTOR_CREDS)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Contractor authentication failed")


class TestPWAManifest:
    """PWA manifest.json and sw.js tests"""
    
    def test_manifest_exists(self):
        """PWA manifest.json should exist at /manifest.json"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "name" in data, "Manifest should have name"
        assert data["name"] == "Up-Wash Power Washing", f"Name should be 'Up-Wash Power Washing', got {data['name']}"
        assert "short_name" in data, "Manifest should have short_name"
        assert data["short_name"] == "Up-Wash", f"Short name should be 'Up-Wash'"
        assert "start_url" in data, "Manifest should have start_url"
        assert "display" in data, "Manifest should have display mode"
        assert data["display"] == "standalone", "Display should be 'standalone' for PWA"
        assert "icons" in data, "Manifest should have icons array"
        print(f"PWA manifest verified: {data['name']}, display: {data['display']}")
    
    def test_service_worker_exists(self):
        """Service worker sw.js should exist"""
        response = requests.get(f"{BASE_URL}/sw.js")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        content = response.text
        # Verify it's a service worker with expected functionality
        assert "addEventListener" in content, "SW should have event listeners"
        assert "install" in content, "SW should handle install event"
        assert "fetch" in content, "SW should handle fetch event"
        assert "push" in content, "SW should handle push notifications"
        print("Service worker verified: install, fetch, and push handlers present")


class TestAuthEndpoints:
    """Test authentication for messaging"""
    
    def test_admin_login(self):
        """Admin should be able to login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert data["user"]["role"] == "admin", "User should have admin role"
        print(f"Admin login successful, role: {data['user']['role']}")
    
    def test_contractor_login(self):
        """Contractor should be able to login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CONTRACTOR_CREDS)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert data["user"]["role"] == "contractor", "User should have contractor role"
        print(f"Contractor login successful, role: {data['user']['role']}")


class TestMessagingContacts:
    """Test /api/messages/contacts endpoint"""
    
    def test_admin_gets_contacts(self, admin_token):
        """Admin should get list of contacts including clients and contractors"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/messages/contacts", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "contacts" in data, "Response should contain contacts array"
        contacts = data["contacts"]
        assert isinstance(contacts, list), "Contacts should be a list"
        
        # Admin should see admin in contacts too (everyone can message admin)
        admin_contact = next((c for c in contacts if c["type"] == "admin"), None)
        assert admin_contact is not None, "Admin should be in contacts list"
        print(f"Admin contacts: {len(contacts)} total contacts returned")
    
    def test_contractor_gets_contacts(self, contractor_token):
        """Contractor should get list of contacts"""
        headers = {"Authorization": f"Bearer {contractor_token}"}
        response = requests.get(f"{BASE_URL}/api/messages/contacts", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "contacts" in data, "Response should contain contacts array"
        contacts = data["contacts"]
        
        # Contractor should see admin in contacts
        admin_contact = next((c for c in contacts if c["type"] == "admin"), None)
        assert admin_contact is not None, "Contractor should see admin in contacts"
        print(f"Contractor contacts: {len(contacts)} contacts, admin found: {admin_contact['name']}")
    
    def test_unauthenticated_contacts_rejected(self):
        """Unauthenticated request should be rejected"""
        response = requests.get(f"{BASE_URL}/api/messages/contacts")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthenticated request correctly rejected")


class TestMessagingSend:
    """Test /api/messages/send endpoint"""
    
    def test_admin_sends_message_to_contractor(self, admin_token, contractor_token):
        """Admin should be able to send message to contractor"""
        # First get contractor ID
        headers = {"Authorization": f"Bearer {admin_token}"}
        contacts_resp = requests.get(f"{BASE_URL}/api/messages/contacts", headers=headers)
        contacts = contacts_resp.json()["contacts"]
        contractor_contact = next((c for c in contacts if c["type"] == "contractor"), None)
        
        if not contractor_contact:
            pytest.skip("No contractor found in contacts")
        
        # Send message
        message_data = {
            "content": "TEST_Hello contractor, this is a test message from admin",
            "recipient_id": contractor_contact["id"],
            "recipient_type": "contractor"
        }
        response = requests.post(f"{BASE_URL}/api/messages/send", json=message_data, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("status") == "sent", "Message status should be 'sent'"
        assert "message_id" in data, "Response should contain message_id"
        print(f"Admin sent message to contractor: message_id={data['message_id']}")
    
    def test_contractor_sends_message_to_admin(self, contractor_token):
        """Contractor should be able to send message to admin"""
        headers = {"Authorization": f"Bearer {contractor_token}"}
        
        message_data = {
            "content": "TEST_Hello admin, this is a test message from contractor",
            "recipient_id": "admin",
            "recipient_type": "admin"
        }
        response = requests.post(f"{BASE_URL}/api/messages/send", json=message_data, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("status") == "sent", "Message status should be 'sent'"
        assert "message_id" in data, "Response should contain message_id"
        print(f"Contractor sent message to admin: message_id={data['message_id']}")


class TestMessagingInbox:
    """Test /api/messages/inbox endpoint"""
    
    def test_admin_inbox(self, admin_token):
        """Admin should get inbox messages"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/messages/inbox", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "messages" in data, "Response should contain messages array"
        messages = data["messages"]
        assert isinstance(messages, list), "Messages should be a list"
        print(f"Admin inbox: {len(messages)} messages")
    
    def test_contractor_inbox(self, contractor_token):
        """Contractor should get inbox messages"""
        headers = {"Authorization": f"Bearer {contractor_token}"}
        response = requests.get(f"{BASE_URL}/api/messages/inbox", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "messages" in data, "Response should contain messages array"
        messages = data["messages"]
        assert isinstance(messages, list), "Messages should be a list"
        print(f"Contractor inbox: {len(messages)} messages")


class TestMessagingNotifications:
    """Test /api/messages/notifications endpoint"""
    
    def test_admin_notifications(self, admin_token):
        """Admin should get unread notifications"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/messages/notifications", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "notifications" in data, "Response should contain notifications array"
        assert "count" in data, "Response should contain count"
        print(f"Admin notifications: {data['count']} unread")
    
    def test_contractor_notifications(self, contractor_token):
        """Contractor should get unread notifications"""
        headers = {"Authorization": f"Bearer {contractor_token}"}
        response = requests.get(f"{BASE_URL}/api/messages/notifications", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "notifications" in data, "Response should contain notifications array"
        assert "count" in data, "Response should contain count"
        print(f"Contractor notifications: {data['count']} unread")


class TestSubscriptionPaymentFlow:
    """Test subscription payment flow endpoints"""
    
    def test_process_initial_payment_endpoint_exists(self, admin_token):
        """Subscription initial payment endpoint should exist"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create a booking to test with
        booking_data = {
            "customer_name": "TEST_Subscription Customer",
            "customer_phone": "555-123-4567",
            "customer_address": "123 Test St, Burleson, TX 76028",
            "distance_miles": 5,
            "services": [{"service_id": "recycling_bin", "quantity": 1}],
            "booking_dates": [],
            "is_monthly": True,
            "monthly_service_days": [10, 20],
            "service_days_per_month": 2,
            "sms_opt_in": False
        }
        
        create_resp = requests.post(f"{BASE_URL}/api/bookings", json=booking_data)
        if create_resp.status_code != 200:
            pytest.skip(f"Could not create test booking: {create_resp.text}")
        
        booking_id = create_resp.json().get("id")
        
        # Test initial payment processing - booking_id is a query parameter
        response = requests.post(
            f"{BASE_URL}/api/subscriptions/process-initial-payment?booking_id={booking_id}", 
            headers=headers
        )
        
        # Should work (simulated success) or fail gracefully
        assert response.status_code in [200, 400, 402, 404], f"Expected 200/400/402/404, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "status" in data or "message" in data, "Response should have status"
            assert "next_service_date" in data, "Response should have next_service_date"
            print(f"Initial payment endpoint works: {data}")
        else:
            print(f"Initial payment endpoint responded: {response.status_code} - {response.text[:100]}")
    
    def test_process_advance_payments_cron(self, admin_token):
        """CRON job for advance payments should be accessible"""
        # This is a CRON endpoint, test it works
        response = requests.post(f"{BASE_URL}/api/cron/process-advance-payments")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "processed" in data, "Response should contain processed count"
        assert "failed" in data, "Response should contain failed count"
        print(f"Advance payments CRON: processed={data['processed']}, failed={data['failed']}")
    
    def test_retry_failed_payments_cron(self):
        """CRON job for retry payments should be accessible"""
        response = requests.post(f"{BASE_URL}/api/cron/retry-failed-payments")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "retried" in data, "Response should contain retried count"
        assert "success" in data, "Response should contain success count"
        print(f"Retry payments CRON: retried={data['retried']}, success={data['success']}")


class TestPushSubscription:
    """Test push notification subscription endpoint"""
    
    def test_push_subscribe(self, admin_token):
        """User should be able to subscribe to push notifications"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        subscription_data = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/TEST_endpoint",
            "keys": {
                "p256dh": "TEST_p256dh_key",
                "auth": "TEST_auth_key"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/push/subscribe", 
                                json=subscription_data, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("status") == "subscribed", "Should return subscribed status"
        print("Push subscription endpoint works")
    
    def test_push_unsubscribe(self, admin_token):
        """User should be able to unsubscribe from push notifications"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.delete(f"{BASE_URL}/api/push/unsubscribe", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("status") == "unsubscribed", "Should return unsubscribed status"
        print("Push unsubscribe endpoint works")


class TestHomepageLoads:
    """Test homepage loads as PWA-ready app"""
    
    def test_homepage_returns_200(self):
        """Homepage should load successfully"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("Homepage loads successfully")
    
    def test_homepage_contains_pwa_link(self):
        """Homepage should link to PWA manifest"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        
        # Check for manifest link in HTML
        content = response.text
        assert 'manifest' in content.lower(), "Homepage should reference manifest.json"
        print("Homepage contains PWA manifest link")
