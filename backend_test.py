import requests
import sys
import json
from datetime import datetime

class UpwashBackendTester:
    def __init__(self, base_url="https://github-link-finder.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.contractors = []
        
        # Test credentials from review request
        self.admin_username = "Hughes0108"
        self.admin_password = "Godfirst7!"

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        request_headers = {'Content-Type': 'application/json'}
        if self.token:
            request_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            request_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=request_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=request_headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=request_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=request_headers, timeout=30)

            success = response.status_code == expected_status
            print(f"   Status: {response.status_code} (expected {expected_status})")
            
            if success:
                self.tests_passed += 1
                print(f"✅ {name} - PASSED")
                try:
                    resp_json = response.json()
                    if isinstance(resp_json, dict) and len(str(resp_json)) < 500:
                        print(f"   Response: {resp_json}")
                    return True, resp_json
                except:
                    return True, response.text
            else:
                print(f"❌ {name} - FAILED")
                print(f"   Response: {response.text[:200]}...")
                return False, {}

        except Exception as e:
            print(f"❌ {name} - ERROR: {str(e)}")
            return False, {}

    def authenticate_admin(self):
        """Test admin login and get token"""
        print("\n🔑 Authenticating as admin...")
        success, response = self.run_test(
            "Admin Login",
            "POST", 
            "auth/login",
            200,
            data={"username": self.admin_username, "password": self.admin_password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"✅ Admin authenticated successfully")
            return True
        print(f"❌ Admin authentication failed")
        return False

    def test_contractors_list(self):
        """Test fetching contractors list for messages page"""
        success, response = self.run_test(
            "Get Contractors List",
            "GET",
            "admin/contractors",
            200
        )
        if success and 'contractors' in response:
            self.contractors = response['contractors']
            print(f"   Found {len(self.contractors)} contractors")
            return True
        return False

    def test_sms_to_contractor(self):
        """Test sending SMS to contractor"""
        if not self.contractors:
            print("❌ No contractors available for SMS test")
            return False
            
        contractor = self.contractors[0]
        contractor_id = contractor.get('id')
        contractor_name = contractor.get('full_name', 'Unknown')
        
        success, response = self.run_test(
            f"Send SMS to Contractor ({contractor_name})",
            "POST",
            "admin/sms/contractor", 
            200,
            data={
                "contractor_id": contractor_id,
                "message": f"Test message from API testing at {datetime.now().strftime('%H:%M:%S')}"
            }
        )
        return success

    def test_sms_history(self):
        """Test getting SMS history for contractor"""
        if not self.contractors:
            print("❌ No contractors available for SMS history test")
            return False
            
        contractor_id = self.contractors[0].get('id')
        contractor_name = self.contractors[0].get('full_name', 'Unknown')
        
        success, response = self.run_test(
            f"Get SMS History for Contractor ({contractor_name})",
            "GET",
            f"admin/sms/contractor/history/{contractor_id}",
            200
        )
        
        if success and 'messages' in response:
            messages = response['messages']
            print(f"   Found {len(messages)} message(s) in history")
            # Check if messages have timestamps
            if messages:
                first_msg = messages[0]
                if 'created_at' in first_msg or 'timestamp' in first_msg:
                    print(f"   ✅ Messages have timestamps")
                else:
                    print(f"   ⚠️  Messages may be missing timestamps")
        return success

    def test_bin_placement_reminders(self):
        """Test bin placement reminder cron endpoint"""
        success, response = self.run_test(
            "Bin Placement Reminders Cron",
            "POST",
            "cron/bin-placement-reminders",
            200
        )
        return success

    def test_services_endpoint(self):
        """Test services endpoint to verify Scent Bomb and Trash Bin services"""
        success, response = self.run_test(
            "Get Services Configuration", 
            "GET",
            "services",
            200
        )
        
        if success and 'services' in response:
            services = response['services']
            service_ids = [s.get('service_id') for s in services]
            
            # Check for Scent Bomb
            if 'scent_bomb' in service_ids:
                print(f"   ✅ Scent Bomb service found")
            else:
                print(f"   ❌ Scent Bomb service NOT found")
                
            # Check for Trash/Recycling Bin (could be recycling_bin or trash_bin)
            trash_services = [sid for sid in service_ids if 'bin' in sid.lower()]
            if trash_services:
                print(f"   ✅ Bin services found: {trash_services}")
            else:
                print(f"   ❌ No bin cleaning services found")
                
            print(f"   Available services: {service_ids}")
            
        return success

    def test_admin_stats(self):
        """Test admin dashboard stats"""
        success, response = self.run_test(
            "Admin Dashboard Stats",
            "GET", 
            "admin/stats",
            200
        )
        return success

    def run_all_tests(self):
        """Run all backend tests"""
        print("=" * 60)
        print("🚀 Starting Upwash Backend API Tests")
        print("=" * 60)
        
        # Test authentication first
        if not self.authenticate_admin():
            print("\n❌ Cannot proceed without admin authentication")
            return False
            
        # Test core features from the review request
        print(f"\n📋 Testing Core Features...")
        
        # 1. Admin Messages page loads and shows contractor list
        self.test_contractors_list()
        
        # 2. POST /api/admin/sms/contractor sends SMS to contractor
        self.test_sms_to_contractor()
        
        # 3. GET /api/admin/sms/contractor/history/{id} returns messages with timestamps  
        self.test_sms_history()
        
        # 4. POST /api/cron/bin-placement-reminders works
        self.test_bin_placement_reminders()
        
        # 5. Services page shows Scent Bomb and Trash Bin
        self.test_services_endpoint()
        
        # Additional tests
        self.test_admin_stats()
        
        # Print final results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = UpwashBackendTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())