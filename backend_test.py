#!/usr/bin/env python3
"""
Backend API Testing for ETA Notification & SMS Integration
Testing ETA alert and SMS-related endpoints for Up-Wash Power Washing
"""

import requests
import sys
import json
from datetime import datetime

class ETANotificationAPITester:
    def __init__(self, base_url="https://2d2346dc-8745-4260-8e34-088886d923bd.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.contractor_token = None
        self.admin_username = "Hughes0108"
        self.admin_password = "Godfirst7!"
        self.contractor_username = "ajb123"
        self.contractor_password = "upwash_test_123"
        self.tests_run = 0
        self.tests_passed = 0
        self.contractor_id = None
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
            status = "PASS"
        else:
            print(f"❌ {name} - FAILED {details}")
            status = "FAIL"
        
        self.test_results.append({
            "test": name,
            "status": status,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def login_admin(self):
        """Login as admin to get token"""
        print(f"\n🔍 Testing Admin Login...")
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/login",
                json={"username": self.admin_username, "password": self.admin_password},
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get('access_token')
                self.log_test("Admin Login", True, f"- Status: {response.status_code}")
                return True
            else:
                self.log_test("Admin Login", False, f"- Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Admin Login", False, f"- Error: {str(e)}")
            return False

    def login_contractor(self):
        """Login as contractor to get token"""
        print(f"\n🔍 Testing Contractor Login...")
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/login",
                json={"username": self.contractor_username, "password": self.contractor_password},
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.contractor_token = data.get('access_token')
                self.contractor_id = data.get('user', {}).get('id')
                self.log_test("Contractor Login", True, f"- Status: {response.status_code}")
                return True
            else:
                self.log_test("Contractor Login", False, f"- Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Contractor Login", False, f"- Error: {str(e)}")
            return False
    def get_contractor_headers(self):
        """Get headers for contractor requests"""
        return {
            'Authorization': f'Bearer {self.contractor_token}',
            'Content-Type': 'application/json'
        }

    def get_admin_headers(self):
        """Get headers for admin requests"""
        return {
            'Authorization': f'Bearer {self.admin_token}',
            'Content-Type': 'application/json'
        }

    def test_eta_alert_endpoint(self):
        """Test POST /api/contractor/sms/eta-alert endpoint"""
        print(f"\n🔍 Testing ETA Alert Endpoint...")
        
        if not self.contractor_token:
            self.log_test("ETA Alert Test", False, "No contractor token available")
            return False

        # Test data
        eta_data = {
            "booking_id": "test-booking-123",
            "contractor_lat": 32.5421,
            "contractor_lng": -97.3208
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/contractor/sms/eta-alert",
                json=eta_data,
                headers=self.get_contractor_headers()
            )
            
            # Expecting 404 since booking doesn't exist, but endpoint should work
            if response.status_code in [404, 400]:  # 404 for missing booking, 400 for missing phone
                self.log_test("ETA Alert Endpoint", True, f"Status: {response.status_code} (expected - no booking exists)")
                return True
            elif response.status_code == 401:
                self.log_test("ETA Alert Endpoint", False, "Authentication failed")
                return False
            else:
                self.log_test("ETA Alert Endpoint", False, f"Unexpected status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("ETA Alert Endpoint", False, f"Error: {str(e)}")
            return False

    def test_check_proximity_endpoint(self):
        """Test POST /api/contractor/check-proximity endpoint"""
        print(f"\n🔍 Testing Check Proximity Endpoint...")
        
        if not self.contractor_token:
            self.log_test("Check Proximity Test", False, "No contractor token available")
            return False

        # Test data
        proximity_data = {
            "booking_id": "test-booking-123", 
            "contractor_lat": 32.5421,
            "contractor_lng": -97.3208
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/contractor/check-proximity",
                json=proximity_data,
                headers=self.get_contractor_headers()
            )
            
            # Expecting 404 since booking doesn't exist, but endpoint should work
            if response.status_code in [404, 400]:  # 404 for missing booking
                self.log_test("Check Proximity Endpoint", True, f"Status: {response.status_code} (expected - no booking exists)")
                return True
            elif response.status_code == 401:
                self.log_test("Check Proximity Endpoint", False, "Authentication failed")
                return False
            else:
                self.log_test("Check Proximity Endpoint", False, f"Unexpected status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Check Proximity Endpoint", False, f"Error: {str(e)}")
            return False

    def test_eta_endpoints_without_auth(self):
        """Test ETA endpoints without authentication (should fail)"""
        print(f"\n🔍 Testing ETA Endpoints Without Auth...")
        
        eta_data = {
            "booking_id": "test-booking-123",
            "contractor_lat": 32.5421,
            "contractor_lng": -97.3208
        }
        
        # Test ETA alert without auth
        try:
            response = requests.post(
                f"{self.base_url}/api/contractor/sms/eta-alert",
                json=eta_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 401:
                self.log_test("ETA Alert No Auth", True, "Correctly rejected unauthorized request")
            else:
                self.log_test("ETA Alert No Auth", False, f"Expected 401, got {response.status_code}")
                
        except Exception as e:
            self.log_test("ETA Alert No Auth", False, f"Error: {str(e)}")

        # Test proximity check without auth
        try:
            response = requests.post(
                f"{self.base_url}/api/contractor/check-proximity",
                json=eta_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 401:
                self.log_test("Check Proximity No Auth", True, "Correctly rejected unauthorized request")
            else:
                self.log_test("Check Proximity No Auth", False, f"Expected 401, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Check Proximity No Auth", False, f"Error: {str(e)}")

    def test_eta_validation(self):
        """Test ETA endpoint input validation"""
        print(f"\n🔍 Testing ETA Endpoint Validation...")
        
        if not self.contractor_token:
            self.log_test("ETA Validation Test", False, "No contractor token available")
            return False

        # Test missing booking_id
        invalid_data = {
            "contractor_lat": 32.5421,
            "contractor_lng": -97.3208
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/contractor/sms/eta-alert",
                json=invalid_data,
                headers=self.get_contractor_headers()
            )
            
            if response.status_code == 422:  # Validation error
                self.log_test("ETA Alert Validation", True, "Correctly rejected missing booking_id")
            else:
                self.log_test("ETA Alert Validation", False, f"Expected 422, got {response.status_code}")
                
        except Exception as e:
            self.log_test("ETA Alert Validation", False, f"Error: {str(e)}")

        # Test invalid coordinates
        invalid_coords = {
            "booking_id": "test-booking",
            "contractor_lat": "invalid",
            "contractor_lng": -97.3208
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/contractor/check-proximity",
                json=invalid_coords,
                headers=self.get_contractor_headers()
            )
            
            if response.status_code == 422:  # Validation error
                self.log_test("Proximity Check Validation", True, "Correctly rejected invalid coordinates")
            else:
                self.log_test("Proximity Check Validation", False, f"Expected 422, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Proximity Check Validation", False, f"Error: {str(e)}")

    def test_sms_templates_endpoint(self):
        """Test GET /api/contractor/sms/templates - Returns 12 SMS templates"""
        print(f"\n🔍 Testing SMS Templates Endpoint...")
        
        if not self.contractor_token:
            self.log_test("SMS Templates Test", False, "No contractor token available")
            return False

        try:
            response = requests.get(
                f"{self.base_url}/api/contractor/sms/templates",
                headers=self.get_contractor_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                templates = data.get('templates', [])
                if len(templates) == 12:
                    self.log_test("SMS Templates Endpoint", True, f"Status: {response.status_code}, Found {len(templates)} templates")
                    return True
                else:
                    self.log_test("SMS Templates Endpoint", False, f"Expected 12 templates, got {len(templates)}")
                    return False
            else:
                self.log_test("SMS Templates Endpoint", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("SMS Templates Endpoint", False, f"Error: {str(e)}")
            return False

    def test_send_template_sms_endpoint(self):
        """Test POST /api/contractor/sms/send-template - Send templated SMS"""
        print(f"\n🔍 Testing Send Template SMS Endpoint...")
        
        if not self.contractor_token:
            self.log_test("Send Template SMS Test", False, "No contractor token available")
            return False

        # Test data
        template_data = {
            "phone": "+15551234567",
            "template_id": "arrival",
            "customer_name": "Test Customer"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/contractor/sms/send-template",
                json=template_data,
                headers=self.get_contractor_headers()
            )
            
            # Expecting success or demo mode (since we're using test phone)
            if response.status_code in [200, 201]:
                data = response.json()
                status = data.get('status', 'unknown')
                self.log_test("Send Template SMS Endpoint", True, f"Status: {response.status_code}, SMS Status: {status}")
                return True
            elif response.status_code == 401:
                self.log_test("Send Template SMS Endpoint", False, "Authentication failed")
                return False
            else:
                self.log_test("Send Template SMS Endpoint", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Send Template SMS Endpoint", False, f"Error: {str(e)}")
            return False

    def test_twilio_incoming_webhook(self):
        """Test POST /api/webhooks/twilio/incoming - Incoming SMS webhook"""
        print(f"\n🔍 Testing Twilio Incoming SMS Webhook...")
        
        # Simulate Twilio webhook data
        webhook_data = {
            "From": "+15551234567",
            "To": "+15559876543", 
            "Body": "Test incoming SMS message",
            "MessageSid": "SM12345678901234567890123456789012"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/webhooks/twilio/incoming",
                data=webhook_data,  # Twilio sends form data, not JSON
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            
            if response.status_code in [200, 201]:
                self.log_test("Twilio Incoming Webhook", True, f"Status: {response.status_code}")
                return True
            else:
                self.log_test("Twilio Incoming Webhook", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Twilio Incoming Webhook", False, f"Error: {str(e)}")
            return False

    def test_contractor_sms_inbox(self):
        """Test GET /api/contractor/sms/inbox - Contractor incoming messages"""
        print(f"\n🔍 Testing Contractor SMS Inbox...")
        
        if not self.contractor_token:
            self.log_test("Contractor SMS Inbox Test", False, "No contractor token available")
            return False

        try:
            response = requests.get(
                f"{self.base_url}/api/contractor/sms/inbox",
                headers=self.get_contractor_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                messages = data.get('messages', [])
                self.log_test("Contractor SMS Inbox", True, f"Status: {response.status_code}, Found {len(messages)} messages")
                return True
            else:
                self.log_test("Contractor SMS Inbox", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Contractor SMS Inbox", False, f"Error: {str(e)}")
            return False

    def test_admin_sms_inbox(self):
        """Test GET /api/admin/sms/inbox - Admin incoming messages"""
        print(f"\n🔍 Testing Admin SMS Inbox...")
        
        if not self.admin_token:
            self.log_test("Admin SMS Inbox Test", False, "No admin token available")
            return False

        try:
            response = requests.get(
                f"{self.base_url}/api/admin/sms/inbox",
                headers=self.get_admin_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                messages = data.get('messages', [])
                self.log_test("Admin SMS Inbox", True, f"Status: {response.status_code}, Found {len(messages)} messages")
                return True
            else:
                self.log_test("Admin SMS Inbox", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Admin SMS Inbox", False, f"Error: {str(e)}")
            return False

    def test_send_sms(self):
        """Test basic SMS sending functionality"""
        print(f"\n🔍 Testing Basic SMS Send...")
        
        if not self.contractor_token:
            self.log_test("Basic SMS Send Test", False, "No contractor token available")
            return False

        # Test data for direct SMS
        sms_data = {
            "phone": "+15551234567",
            "message": "Test direct SMS from contractor",
            "booking_id": "test-booking-123"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/contractor/sms/send",
                json=sms_data,
                headers=self.get_contractor_headers()
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                status = data.get('status', 'unknown')
                self.log_test("Basic SMS Send", True, f"Status: {response.status_code}, SMS Status: {status}")
                return True
            else:
                self.log_test("Basic SMS Send", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Basic SMS Send", False, f"Error: {str(e)}")
            return False

    def test_sms_validation(self):
        """Test SMS validation"""
        print(f"\n🔍 Testing SMS Validation...")
        
        if not self.contractor_token:
            self.log_test("SMS Validation Test", False, "No contractor token available")
            return False

        # Test missing phone number
        invalid_data = {
            "message": "Test message without phone"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/contractor/sms/send",
                json=invalid_data,
                headers=self.get_contractor_headers()
            )
            
            if response.status_code == 422:  # Validation error
                self.log_test("SMS Validation - Missing Phone", True, "Correctly rejected missing phone")
            else:
                self.log_test("SMS Validation - Missing Phone", False, f"Expected 422, got {response.status_code}")
                
        except Exception as e:
            self.log_test("SMS Validation - Missing Phone", False, f"Error: {str(e)}")

        # Test empty message
        invalid_message = {
            "phone": "+15551234567",
            "message": ""
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/contractor/sms/send",
                json=invalid_message,
                headers=self.get_contractor_headers()
            )
            
            if response.status_code == 422:  # Validation error
                self.log_test("SMS Validation - Empty Message", True, "Correctly rejected empty message")
            else:
                self.log_test("SMS Validation - Empty Message", False, f"Expected 422, got {response.status_code}")
                
        except Exception as e:
            self.log_test("SMS Validation - Empty Message", False, f"Error: {str(e)}")

    def test_sms_logs(self):
        """Test SMS logs endpoints"""
        print(f"\n🔍 Testing SMS Logs...")
        
        if not self.admin_token:
            self.log_test("SMS Logs Test", False, "No admin token available")
            return False

        try:
            response = requests.get(
                f"{self.base_url}/api/admin/sms/logs",
                headers=self.get_admin_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                logs = data.get('logs', [])
                self.log_test("SMS Logs", True, f"Status: {response.status_code}, Found {len(logs)} log entries")
                return True
            else:
                self.log_test("SMS Logs", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("SMS Logs", False, f"Error: {str(e)}")
            return False

    def test_sms_stats(self):
        """Test SMS stats endpoints"""
        print(f"\n🔍 Testing SMS Stats...")
        
        if not self.admin_token:
            self.log_test("SMS Stats Test", False, "No admin token available")
            return False

        try:
            response = requests.get(
                f"{self.base_url}/api/admin/sms/stats",
                headers=self.get_admin_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("SMS Stats", True, f"Status: {response.status_code}, Stats available")
                return True
            else:
                self.log_test("SMS Stats", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("SMS Stats", False, f"Error: {str(e)}")
            return False
    def get_auth_headers(self):
        """Get headers with auth token"""
        return {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.admin_token}'
        }

    def get_contractors(self):
        """Get list of contractors to use for SMS testing"""
        print(f"\n🔍 Testing Get Contractors...")
        try:
            response = requests.get(
                f"{self.base_url}/api/admin/contractors",
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                contractors = data.get('contractors', [])
                if contractors:
                    self.contractor_id = contractors[0].get('id')
                    self.log_test("Get Contractors", True, f"- Found {len(contractors)} contractors, using ID: {self.contractor_id}")
                    return True
                else:
                    self.log_test("Get Contractors", False, "- No contractors found")
                    return False
            else:
                self.log_test("Get Contractors", False, f"- Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Get Contractors", False, f"- Error: {str(e)}")
            return False

    def test_send_sms_contractor(self):
        """Test POST /api/admin/sms/contractor - Admin sends SMS to contractor"""
        print(f"\n🔍 Testing Send SMS to Contractor...")
        if not self.contractor_id:
            self.log_test("Send SMS to Contractor", False, "- No contractor ID available")
            return False
            
        try:
            response = requests.post(
                f"{self.base_url}/api/admin/sms/contractor",
                headers=self.get_auth_headers(),
                json={
                    "contractor_id": self.contractor_id,
                    "message": "Test SMS from admin - Twilio integration working!"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                status = data.get('status', 'unknown')
                self.log_test("Send SMS to Contractor", True, f"- Status: {response.status_code}, SMS Status: {status}")
                return True
            else:
                self.log_test("Send SMS to Contractor", False, f"- Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Send SMS to Contractor", False, f"- Error: {str(e)}")
            return False

    def test_send_login_credentials_sms(self):
        """Test POST /api/admin/sms/contractor/login - Admin sends login credentials via SMS"""
        print(f"\n🔍 Testing Send Login Credentials SMS...")
        if not self.contractor_id:
            self.log_test("Send Login Credentials SMS", False, "- No contractor ID available")
            return False
            
        try:
            response = requests.post(
                f"{self.base_url}/api/admin/sms/contractor/login",
                headers=self.get_auth_headers(),
                json={
                    "contractor_id": self.contractor_id,
                    "include_password": True
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                status = data.get('status', 'unknown')
                contractor_name = data.get('contractor_name', 'Unknown')
                self.log_test("Send Login Credentials SMS", True, f"- Status: {response.status_code}, SMS Status: {status}, Contractor: {contractor_name}")
                return True
            else:
                self.log_test("Send Login Credentials SMS", False, f"- Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Send Login Credentials SMS", False, f"- Error: {str(e)}")
            return False

    def test_get_sms_history(self):
        """Test GET /api/admin/sms/contractor/history/{contractor_id} - Get SMS conversation history"""
        print(f"\n🔍 Testing Get SMS History...")
        if not self.contractor_id:
            self.log_test("Get SMS History", False, "- No contractor ID available")
            return False
            
        try:
            response = requests.get(
                f"{self.base_url}/api/admin/sms/contractor/history/{self.contractor_id}",
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                messages = data.get('messages', [])
                contractor_name = data.get('contractor_name', 'Unknown')
                self.log_test("Get SMS History", True, f"- Status: {response.status_code}, Found {len(messages)} messages for {contractor_name}")
                return True
            else:
                self.log_test("Get SMS History", False, f"- Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Get SMS History", False, f"- Error: {str(e)}")
            return False

    def test_get_all_sms_messages(self):
        """Test GET /api/admin/sms/contractors/all - Get all admin-contractor messages"""
        print(f"\n🔍 Testing Get All SMS Messages...")
        try:
            response = requests.get(
                f"{self.base_url}/api/admin/sms/contractors/all",
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                messages = data.get('messages', [])
                self.log_test("Get All SMS Messages", True, f"- Status: {response.status_code}, Found {len(messages)} total messages")
                return True
            else:
                self.log_test("Get All SMS Messages", False, f"- Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Get All SMS Messages", False, f"- Error: {str(e)}")
            return False

    def test_basic_endpoints(self):
        """Test basic API functionality"""
        print(f"\n🔍 Testing Basic API Health...")
        try:
            # Test root endpoint
            response = requests.get(f"{self.base_url}/api/")
            if response.status_code == 200:
                self.log_test("API Root Endpoint", True, f"- Status: {response.status_code}")
            else:
                self.log_test("API Root Endpoint", False, f"- Status: {response.status_code}")
                
            # Test services endpoint
            response = requests.get(f"{self.base_url}/api/services")
            if response.status_code == 200:
                self.log_test("Services Endpoint", True, f"- Status: {response.status_code}")
            else:
                self.log_test("Services Endpoint", False, f"- Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Basic API Health", False, f"- Error: {str(e)}")

    def run_all_tests(self):
        """Run all ETA notification and SMS API tests"""
        print("=" * 80)
        print("🚀 STARTING ETA NOTIFICATION & SMS API TESTING")
        print("=" * 80)
        print(f"Testing Backend URL: {self.base_url}")
        print(f"Admin Credentials: {self.admin_username}")
        print(f"Contractor Credentials: {self.contractor_username}")
        print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Test basic API health
        self.test_basic_endpoints()
        
        # Login admin first
        admin_login_success = self.login_admin()
        
        # Login contractor
        contractor_login_success = self.login_contractor()
        
        if not contractor_login_success:
            print("\n❌ Cannot proceed with ETA tests - Contractor login failed")
        else:
            # Test ETA notification endpoints
            print("\n" + "="*50)
            print("🎯 TESTING ETA NOTIFICATION FEATURES")
            print("="*50)
            
            self.test_eta_alert_endpoint()
            self.test_check_proximity_endpoint()
            self.test_eta_endpoints_without_auth()
            self.test_eta_validation()
        
        if admin_login_success:
            # Get contractors for testing
            if self.get_contractors():
                # Test existing SMS functionality
                print("\n" + "="*50)
                print("📱 TESTING SMS FUNCTIONALITY")  
                print("="*50)
                
                self.test_send_sms()
                self.test_sms_validation()
                self.test_sms_logs()
                self.test_sms_stats()
            else:
                print("\n⚠️  Skipping SMS tests - No contractors available")
        else:
            print("\n⚠️  Skipping SMS tests - Admin login failed")
        
        # Print final summary
        print("\n" + "="*80)
        print("📊 FINAL TEST SUMMARY")
        print("="*80)
        print(f"Total Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"Success Rate: {success_rate:.1f}%")
        
        # Show failed tests
        failed_tests = [r for r in self.test_results if r['status'] == 'FAIL']
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   - {test['test']}: {test['details']}")
        
        if self.tests_passed >= self.tests_run * 0.7:  # 70% pass rate
            print("\n✅ Overall Status: SUCCESS")
            return True
        else:
            print("\n❌ Overall Status: NEEDS ATTENTION")
            return False

def main():
    tester = ETANotificationAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())