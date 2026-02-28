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
    def __init__(self, base_url="https://xzr8d2y3-preview.emergentagent.com"):
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
        else:
            print(f"❌ {name} - FAILED {details}")

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
                self.token = data.get('access_token')
                self.log_test("Admin Login", True, f"- Status: {response.status_code}")
                return True
            else:
                self.log_test("Admin Login", False, f"- Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Admin Login", False, f"- Error: {str(e)}")
            return False

    def get_auth_headers(self):
        """Get headers with auth token"""
        return {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.token}'
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
        """Run all SMS API tests"""
        print("=" * 80)
        print("🚀 STARTING TWILIO SMS API TESTING")
        print("=" * 80)
        print(f"Testing Backend URL: {self.base_url}")
        print(f"Admin Credentials: {self.admin_username}")
        print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Test basic API health
        self.test_basic_endpoints()
        
        # Login first
        if not self.login_admin():
            print("\n❌ Cannot proceed with SMS tests - Admin login failed")
            return False
            
        # Get contractors for testing
        if not self.get_contractors():
            print("\n❌ Cannot proceed with SMS tests - No contractors available")
            return False
            
        # Test all SMS endpoints
        print("\n" + "=" * 60)
        print("📱 TESTING TWILIO SMS ENDPOINTS")
        print("=" * 60)
        
        self.test_send_sms_contractor()
        self.test_send_login_credentials_sms()
        self.test_get_sms_history()
        self.test_get_all_sms_messages()
        
        # Print results
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        print(f"✅ Tests Passed: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Tests Failed: {self.tests_run - self.tests_passed}/{self.tests_run}")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("\n🎉 SMS Integration Status: WORKING")
        elif success_rate >= 50:
            print("\n⚠️  SMS Integration Status: PARTIAL")
        else:
            print("\n🚨 SMS Integration Status: FAILING")
            
        return success_rate >= 80

def main():
    """Main test execution"""
    tester = TwilioSMSAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())