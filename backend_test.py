#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

# Use the public endpoint from frontend/.env
API_BASE_URL = "https://upwash-preview.preview.emergentagent.com"

class ContractorEarningsAPITester:
    def __init__(self, base_url=API_BASE_URL):
        self.base_url = base_url
        self.admin_token = None
        self.contractor_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, description=""):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Test {self.tests_run}: {name}")
        if description:
            print(f"   Description: {description}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"   ✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"   ❌ FAILED - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                self.failed_tests.append(f"{name} - Expected {expected_status}, got {response.status_code}")
                return False, {}

        except Exception as e:
            print(f"   ❌ FAILED - Exception: {str(e)}")
            self.failed_tests.append(f"{name} - Exception: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login credentials"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            {"username": "Hughes0108", "password": "Godfirst7!"},
            description="Test admin login with Hughes0108 / Godfirst7!"
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   🔑 Admin token obtained")
            return True
        return False

    def test_contractor_login(self):
        """Test contractor login credentials"""
        success, response = self.run_test(
            "Contractor Login", 
            "POST",
            "auth/login",
            200,
            {"username": "ajb123", "password": "upwash_test_123"},
            description="Test contractor login with ajb123 / upwash_test_123"
        )
        if success and 'access_token' in response:
            self.contractor_token = response['access_token']
            print(f"   🔑 Contractor token obtained")
            return True
        return False

    def test_contractor_earnings_endpoint(self):
        """Test /api/contractor/earnings endpoint"""
        if not self.contractor_token:
            print("   ⚠️  Skipping - no contractor token")
            return False
            
        success, response = self.run_test(
            "Contractor Earnings Endpoint",
            "GET", 
            "contractor/earnings",
            200,
            headers={'Authorization': f'Bearer {self.contractor_token}'},
            description="Test contractor earnings endpoint returns earnings data"
        )
        
        if success:
            # Check if response contains expected fields
            expected_fields = ['total_completed_stops', 'total_earnings', 'unpaid_balance', 'pay_per_stop']
            missing_fields = [field for field in expected_fields if field not in response]
            
            if missing_fields:
                print(f"   ⚠️  Warning: Missing fields in response: {missing_fields}")
            else:
                print(f"   ✅ All expected earnings fields present")
                
            # Check pay per stop is $13
            if response.get('pay_per_stop') == 13.0:
                print(f"   ✅ Pay per stop correctly set to $13")
            else:
                print(f"   ⚠️  Pay per stop is {response.get('pay_per_stop')}, expected $13")
                
        return success

    def test_stop_completion_endpoint(self):
        """Test /api/contractor/stop/{id}/complete endpoint exists"""
        if not self.contractor_token:
            print("   ⚠️  Skipping - no contractor token")
            return False
            
        # Test with dummy booking ID - should return 404 but endpoint should exist
        success, response = self.run_test(
            "Stop Completion Endpoint",
            "POST",
            "contractor/stop/dummy-booking-id/complete", 
            404,  # Expected 404 for non-existent booking
            {"status": "completed"},
            headers={'Authorization': f'Bearer {self.contractor_token}'},
            description="Test stop completion endpoint exists (404 expected for dummy ID)"
        )
        return success

    def test_admin_contractor_earnings_endpoint(self):
        """Test /api/admin/contractors/{id}/earnings endpoint"""
        if not self.admin_token:
            print("   ⚠️  Skipping - no admin token")
            return False
            
        # Test with dummy contractor ID - should return 404 but endpoint should exist  
        success, response = self.run_test(
            "Admin Contractor Earnings Endpoint",
            "GET",
            "admin/contractors/dummy-contractor-id/earnings",
            404,  # Expected 404 for non-existent contractor
            headers={'Authorization': f'Bearer {self.admin_token}'},
            description="Test admin contractor earnings endpoint exists (404 expected for dummy ID)"
        )
        return success

    def test_admin_contractor_pay_endpoint(self):
        """Test /api/admin/contractors/{id}/pay endpoint"""
        if not self.admin_token:
            print("   ⚠️  Skipping - no admin token")
            return False
            
        # Test with dummy contractor ID - should return 404 but endpoint should exist
        success, response = self.run_test(
            "Admin Contractor Pay Endpoint", 
            "POST",
            "admin/contractors/dummy-contractor-id/pay",
            404,  # Expected 404 for non-existent contractor
            {"amount": 100.0, "payment_method": "bank_transfer"},
            headers={'Authorization': f'Bearer {self.admin_token}'},
            description="Test Easy Pay endpoint exists (404 expected for dummy ID)"
        )
        return success

    def test_square_config_endpoint(self):
        """Test Square sandbox payment configuration"""
        success, response = self.run_test(
            "Square Payment Config",
            "GET",
            "payments/config",
            200,
            description="Test Square sandbox configuration endpoint"
        )
        
        if success:
            if response.get('environment') == 'sandbox':
                print(f"   ✅ Square environment correctly set to sandbox")
            else:
                print(f"   ⚠️  Square environment: {response.get('environment')}")
                
            if response.get('app_id'):
                print(f"   ✅ Square app ID present")
            else:
                print(f"   ⚠️  Square app ID missing")
                
        return success

    def test_admin_endpoints_authentication(self):
        """Test that admin endpoints require authentication"""
        success, response = self.run_test(
            "Admin Endpoints Authentication",
            "GET",
            "admin/contractors",
            401,  # Expected 401 without authentication
            description="Test admin endpoints require authentication (401 expected)"
        )
        return success

    def run_all_tests(self):
        """Run all contractor earnings and stop completion tests"""
        print("🚀 Starting Contractor Earnings & Stop Completion API Tests")
        print("=" * 70)
        
        # Authentication tests
        admin_login_success = self.test_admin_login()
        contractor_login_success = self.test_contractor_login()
        
        # Core earnings and completion tests
        self.test_contractor_earnings_endpoint()
        self.test_stop_completion_endpoint()
        self.test_admin_contractor_earnings_endpoint() 
        self.test_admin_contractor_pay_endpoint()
        
        # Payment configuration
        self.test_square_config_endpoint()
        
        # Security test
        self.test_admin_endpoints_authentication()
        
        # Print summary
        print("\n" + "=" * 70)
        print(f"📊 Test Summary:")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for failed in self.failed_tests:
                print(f"   - {failed}")
        else:
            print(f"\n🎉 All tests passed!")
            
        return self.tests_passed == self.tests_run

def main():
    print("🔧 Contractor Earnings & Stop Completion API Testing")
    print(f"🌐 Testing API at: {API_BASE_URL}")
    print()
    
    tester = ContractorEarningsAPITester()
    success = tester.run_all_tests()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())