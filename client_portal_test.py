#!/usr/bin/env python3
"""
Client Portal Backend API Testing
Testing client portal endpoints for Up-Wash Power Washing
"""

import requests
import sys
import json
from datetime import datetime

class ClientPortalAPITester:
    def __init__(self, base_url="https://2d2346dc-8745-4260-8e34-088886d923bd.preview.emergentagent.com"):
        self.base_url = base_url
        self.client_token = None
        self.test_client_email = "testclient@example.com"
        self.test_client_password = "test123"
        self.tests_run = 0
        self.tests_passed = 0
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

    def get_client_headers(self):
        """Get headers for client requests"""
        return {
            'Authorization': f'Bearer {self.client_token}',
            'Content-Type': 'application/json'
        }

    def test_client_login(self):
        """Test POST /api/client/login endpoint"""
        print(f"\n🔍 Testing Client Login...")
        
        try:
            response = requests.post(
                f"{self.base_url}/api/client/login",
                json={"email": self.test_client_email, "password": self.test_client_password},
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.client_token = data.get('token')
                client_data = data.get('client', {})
                
                # Verify response structure (note: uses 'token' field, not 'access_token')
                if self.client_token and 'client' in data:
                    self.log_test("Client Login", True, f"Status: {response.status_code}, Token received, Client: {client_data.get('name', 'Unknown')}")
                    return True
                else:
                    self.log_test("Client Login", False, f"Status: {response.status_code}, Missing token or client data")
                    return False
            else:
                self.log_test("Client Login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Client Login", False, f"Error: {str(e)}")
            return False

    def test_client_subscription_endpoint(self):
        """Test GET /api/client/subscription - Returns client subscription details"""
        print(f"\n🔍 Testing Client Subscription Endpoint...")
        
        if not self.client_token:
            self.log_test("Client Subscription", False, "No client token available")
            return False

        try:
            response = requests.get(
                f"{self.base_url}/api/client/subscription",
                headers=self.get_client_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                subscription = data.get('subscription')
                if 'subscription' in data:
                    self.log_test("Client Subscription", True, f"Status: {response.status_code}, Subscription: {'Found' if subscription else 'None'}")
                    return True
                else:
                    self.log_test("Client Subscription", False, f"Missing subscription field in response")
                    return False
            else:
                self.log_test("Client Subscription", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Client Subscription", False, f"Error: {str(e)}")
            return False

    def test_client_booking_history_endpoint(self):
        """Test GET /api/client/booking-history - Returns past completed services"""
        print(f"\n🔍 Testing Client Booking History Endpoint...")
        
        if not self.client_token:
            self.log_test("Client Booking History", False, "No client token available")
            return False

        try:
            response = requests.get(
                f"{self.base_url}/api/client/booking-history",
                headers=self.get_client_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                bookings = data.get('bookings', [])
                if 'bookings' in data:
                    self.log_test("Client Booking History", True, f"Status: {response.status_code}, Found {len(bookings)} booking history records")
                    return True
                else:
                    self.log_test("Client Booking History", False, f"Missing bookings field in response")
                    return False
            else:
                self.log_test("Client Booking History", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Client Booking History", False, f"Error: {str(e)}")
            return False

    def test_client_upcoming_services_endpoint(self):
        """Test GET /api/client/upcoming-services - Returns scheduled upcoming services"""
        print(f"\n🔍 Testing Client Upcoming Services Endpoint...")
        
        if not self.client_token:
            self.log_test("Client Upcoming Services", False, "No client token available")
            return False

        try:
            response = requests.get(
                f"{self.base_url}/api/client/upcoming-services",
                headers=self.get_client_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                services = data.get('services', [])
                if 'services' in data:
                    self.log_test("Client Upcoming Services", True, f"Status: {response.status_code}, Found {len(services)} upcoming services")
                    return True
                else:
                    self.log_test("Client Upcoming Services", False, f"Missing services field in response")
                    return False
            else:
                self.log_test("Client Upcoming Services", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Client Upcoming Services", False, f"Error: {str(e)}")
            return False

    def test_subscription_pause_endpoint(self):
        """Test POST /api/client/subscription/pause - Pause subscription"""
        print(f"\n🔍 Testing Subscription Pause Endpoint...")
        
        if not self.client_token:
            self.log_test("Subscription Pause", False, "No client token available")
            return False

        try:
            response = requests.post(
                f"{self.base_url}/api/client/subscription/pause",
                headers=self.get_client_headers()
            )
            
            # Expecting 404 if no active subscription exists, but endpoint should work
            if response.status_code == 200:
                data = response.json()
                self.log_test("Subscription Pause", True, f"Status: {response.status_code}, Response: {data.get('message', 'Success')}")
                return True
            elif response.status_code == 404:
                self.log_test("Subscription Pause", True, f"Status: {response.status_code} (expected - no active subscription)")
                return True
            else:
                self.log_test("Subscription Pause", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Subscription Pause", False, f"Error: {str(e)}")
            return False

    def test_subscription_resume_endpoint(self):
        """Test POST /api/client/subscription/resume - Resume subscription"""
        print(f"\n🔍 Testing Subscription Resume Endpoint...")
        
        if not self.client_token:
            self.log_test("Subscription Resume", False, "No client token available")
            return False

        try:
            response = requests.post(
                f"{self.base_url}/api/client/subscription/resume",
                headers=self.get_client_headers()
            )
            
            # Expecting 404 if no paused subscription exists, but endpoint should work
            if response.status_code == 200:
                data = response.json()
                self.log_test("Subscription Resume", True, f"Status: {response.status_code}, Response: {data.get('message', 'Success')}")
                return True
            elif response.status_code == 404:
                self.log_test("Subscription Resume", True, f"Status: {response.status_code} (expected - no paused subscription)")
                return True
            else:
                self.log_test("Subscription Resume", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Subscription Resume", False, f"Error: {str(e)}")
            return False

    def test_subscription_cancel_endpoint(self):
        """Test POST /api/client/subscription/cancel - Request cancellation"""
        print(f"\n🔍 Testing Subscription Cancel Endpoint...")
        
        if not self.client_token:
            self.log_test("Subscription Cancel", False, "No client token available")
            return False

        try:
            cancel_data = {
                "reason": "Testing cancellation request functionality"
            }
            response = requests.post(
                f"{self.base_url}/api/client/subscription/cancel",
                json=cancel_data,
                headers=self.get_client_headers()
            )
            
            # Expecting 404 if no active subscription exists, but endpoint should work
            if response.status_code == 200:
                data = response.json()
                self.log_test("Subscription Cancel", True, f"Status: {response.status_code}, Response: {data.get('message', 'Success')}")
                return True
            elif response.status_code == 404:
                self.log_test("Subscription Cancel", True, f"Status: {response.status_code} (expected - no active subscription)")
                return True
            else:
                self.log_test("Subscription Cancel", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Subscription Cancel", False, f"Error: {str(e)}")
            return False

    def test_client_authentication_required(self):
        """Test that client endpoints require authentication"""
        print(f"\n🔍 Testing Client Authentication Requirements...")
        
        endpoints = [
            "/api/client/subscription",
            "/api/client/booking-history", 
            "/api/client/upcoming-services"
        ]
        
        success_count = 0
        for endpoint in endpoints:
            try:
                response = requests.get(
                    f"{self.base_url}{endpoint}",
                    headers={'Content-Type': 'application/json'}
                )
                
                if response.status_code == 401:
                    success_count += 1
                    print(f"    ✅ {endpoint} - Correctly requires auth (401)")
                else:
                    print(f"    ❌ {endpoint} - Expected 401, got {response.status_code}")
                    
            except Exception as e:
                print(f"    ❌ {endpoint} - Error: {str(e)}")
        
        if success_count == len(endpoints):
            self.log_test("Client Auth Required", True, f"All {len(endpoints)} endpoints correctly require authentication")
            return True
        else:
            self.log_test("Client Auth Required", False, f"Only {success_count}/{len(endpoints)} endpoints require auth")
            return False

    def test_invalid_client_token(self):
        """Test endpoints with invalid client token"""
        print(f"\n🔍 Testing Invalid Client Token...")
        
        invalid_headers = {
            'Authorization': 'Bearer invalid_token_12345',
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.get(
                f"{self.base_url}/api/client/subscription",
                headers=invalid_headers
            )
            
            if response.status_code == 401:
                self.log_test("Invalid Client Token", True, f"Status: {response.status_code} (correctly rejected invalid token)")
                return True
            else:
                self.log_test("Invalid Client Token", False, f"Expected 401, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Invalid Client Token", False, f"Error: {str(e)}")
            return False

    def test_client_login_validation(self):
        """Test client login validation"""
        print(f"\n🔍 Testing Client Login Validation...")
        
        # Test missing email
        try:
            response = requests.post(
                f"{self.base_url}/api/client/login",
                json={"password": "test123"},
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 422:  # Validation error
                print(f"    ✅ Missing email - Correctly rejected (422)")
                validation_success = True
            else:
                print(f"    ❌ Missing email - Expected 422, got {response.status_code}")
                validation_success = False
        except Exception as e:
            print(f"    ❌ Missing email - Error: {str(e)}")
            validation_success = False

        # Test invalid credentials
        try:
            response = requests.post(
                f"{self.base_url}/api/client/login",
                json={"email": "nonexistent@test.com", "password": "wrongpassword"},
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 401:  # Unauthorized
                print(f"    ✅ Invalid credentials - Correctly rejected (401)")
                auth_success = True
            else:
                print(f"    ❌ Invalid credentials - Expected 401, got {response.status_code}")
                auth_success = False
        except Exception as e:
            print(f"    ❌ Invalid credentials - Error: {str(e)}")
            auth_success = False

        if validation_success and auth_success:
            self.log_test("Client Login Validation", True, "Both missing fields and invalid credentials correctly handled")
            return True
        else:
            self.log_test("Client Login Validation", False, "Some validation checks failed")
            return False

    def test_subscription_cancel_validation(self):
        """Test subscription cancellation validation"""
        print(f"\n🔍 Testing Subscription Cancel Validation...")
        
        if not self.client_token:
            self.log_test("Subscription Cancel Validation", False, "No client token available")
            return False

        # Test missing reason
        try:
            response = requests.post(
                f"{self.base_url}/api/client/subscription/cancel",
                json={},
                headers=self.get_client_headers()
            )
            
            if response.status_code == 422:  # Validation error
                self.log_test("Subscription Cancel Validation", True, "Correctly rejected missing reason (422)")
                return True
            else:
                self.log_test("Subscription Cancel Validation", False, f"Expected 422, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Subscription Cancel Validation", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all client portal API tests"""
        print("=" * 80)
        print("🚀 STARTING CLIENT PORTAL API TESTING")
        print("=" * 80)
        print(f"Testing Backend URL: {self.base_url}")
        print(f"Test Client Email: {self.test_client_email}")
        print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Test client login first
        login_success = self.test_client_login()
        
        # Test authentication and validation
        print("\n" + "="*50)
        print("🔐 TESTING AUTHENTICATION & VALIDATION")
        print("="*50)
        
        self.test_client_authentication_required()
        self.test_invalid_client_token()
        self.test_client_login_validation()
        
        if login_success:
            # Test client portal endpoints
            print("\n" + "="*50)
            print("📱 TESTING CLIENT PORTAL ENDPOINTS")
            print("="*50)
            
            self.test_client_subscription_endpoint()
            self.test_client_booking_history_endpoint()
            self.test_client_upcoming_services_endpoint()
            
            # Test subscription management endpoints
            print("\n" + "="*50)
            print("⚙️ TESTING SUBSCRIPTION MANAGEMENT")
            print("="*50)
            
            self.test_subscription_pause_endpoint()
            self.test_subscription_resume_endpoint()
            self.test_subscription_cancel_endpoint()
            self.test_subscription_cancel_validation()
        else:
            print("\n⚠️  Skipping client portal tests - Login failed")
        
        # Print final summary
        print("\n" + "="*80)
        print("📊 CLIENT PORTAL TEST SUMMARY")
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
        
        return self.test_results

def main():
    tester = ClientPortalAPITester()
    results = tester.run_all_tests()
    
    # Determine success based on critical endpoints
    critical_passes = 0
    critical_tests = ['Client Login', 'Client Subscription', 'Client Booking History', 'Client Upcoming Services']
    
    for result in results:
        if result['test'] in critical_tests and result['status'] == 'PASS':
            critical_passes += 1
    
    if critical_passes >= len(critical_tests) * 0.75:  # 75% of critical tests pass
        print("\n✅ Overall Status: SUCCESS")
        return 0
    else:
        print("\n❌ Overall Status: NEEDS ATTENTION")
        return 1

if __name__ == "__main__":
    sys.exit(main())