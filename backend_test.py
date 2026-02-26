#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta

class UpwashAPITester:
    def __init__(self, base_url="https://admin-control-138.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.admin_token = None

    def log_test(self, name, success, response_data=None, error=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            self.failed_tests.append({
                "test": name,
                "error": error,
                "response": response_data
            })
            print(f"❌ {name} - FAILED: {error}")

    def test_api_root(self):
        """Test API root endpoint"""
        try:
            response = requests.get(f"{self.base_url}/", timeout=10)
            success = response.status_code == 200
            data = response.json() if success else {}
            
            if success and data.get("message") == "Upwash Power Washing API":
                self.log_test("API Root", True, data)
                return True
            else:
                self.log_test("API Root", False, data, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("API Root", False, None, str(e))
            return False

    def test_services_endpoint(self):
        """Test /api/services endpoint for tax rate and service data"""
        try:
            response = requests.get(f"{self.base_url}/services", timeout=10)
            success = response.status_code == 200
            data = response.json() if success else {}
            
            if success:
                # Check tax rate is 8.25%
                tax_rate = data.get("tax_rate", 0)
                if abs(tax_rate - 0.0825) < 0.0001:
                    self.log_test("Services - Tax Rate 8.25%", True, f"Tax rate: {tax_rate}")
                else:
                    self.log_test("Services - Tax Rate 8.25%", False, data, f"Wrong tax rate: {tax_rate}, expected 0.0825")
                
                # Check scent bomb service exists with correct price
                services = data.get("services", [])
                scent_bomb = next((s for s in services if s.get("service_id") == "scent_bomb"), None)
                
                if scent_bomb:
                    price = scent_bomb.get("base_price", 0)
                    if abs(price - 3.50) < 0.01:
                        self.log_test("Services - Scent Bomb $3.50", True, f"Scent bomb price: ${price}")
                    else:
                        self.log_test("Services - Scent Bomb $3.50", False, scent_bomb, f"Wrong price: ${price}, expected $3.50")
                    
                    # Check scent bomb has no travel fee
                    no_travel_fee = scent_bomb.get("no_travel_fee", False)
                    if no_travel_fee:
                        self.log_test("Services - Scent Bomb No Travel Fee", True, "Scent bomb has no travel fee")
                    else:
                        self.log_test("Services - Scent Bomb No Travel Fee", False, scent_bomb, "Scent bomb should have no travel fee")
                else:
                    self.log_test("Services - Scent Bomb Service", False, data, "Scent bomb service not found")
                    
                return True
            else:
                self.log_test("Services Endpoint", False, data, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Services Endpoint", False, None, str(e))
            return False

    def test_admin_login(self):
        """Test admin login with credentials admin/upwash2024"""
        try:
            login_data = {
                "username": "admin",
                "password": "upwash2024"
            }
            
            response = requests.post(f"{self.base_url}/auth/login", json=login_data, timeout=10)
            success = response.status_code == 200
            data = response.json() if success else {}
            
            if success:
                access_token = data.get("access_token")
                user = data.get("user", {})
                role = user.get("role")
                
                if access_token and role == "admin":
                    self.admin_token = access_token
                    self.log_test("Admin Login", True, f"Admin user: {user.get('username')}")
                    return True
                else:
                    self.log_test("Admin Login", False, data, f"Missing token or wrong role: {role}")
                    return False
            else:
                self.log_test("Admin Login", False, data, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Admin Login", False, None, str(e))
            return False

    def test_admin_stats_auth_required(self):
        """Test that /api/admin/stats requires authentication"""
        try:
            # Test without authentication - should fail
            response = requests.get(f"{self.base_url}/admin/stats", timeout=10)
            if response.status_code == 401:
                self.log_test("Admin Stats - Auth Required (Unauthenticated)", True, "Correctly requires auth")
            else:
                self.log_test("Admin Stats - Auth Required (Unauthenticated)", False, {}, f"Expected 401, got {response.status_code}")
            
            # Test with authentication - should succeed
            if self.admin_token:
                headers = {"Authorization": f"Bearer {self.admin_token}"}
                response = requests.get(f"{self.base_url}/admin/stats", headers=headers, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    self.log_test("Admin Stats - Auth Required (Authenticated)", True, f"Stats retrieved: {list(data.keys())}")
                    return True
                else:
                    self.log_test("Admin Stats - Auth Required (Authenticated)", False, {}, f"Status: {response.status_code}")
                    return False
            else:
                self.log_test("Admin Stats - Auth Required (Authenticated)", False, None, "No admin token available")
                return False
        except Exception as e:
            self.log_test("Admin Stats - Auth Required", False, None, str(e))
            return False

    def test_price_calculation_with_tax(self):
        """Test price calculation with 8.25% tax"""
        try:
            test_cases = [
                {
                    "name": "Scent Bomb Only (No Travel Fee)",
                    "data": {
                        "services": [{"service_id": "scent_bomb", "quantity": 2}],
                        "distance_miles": 0,
                        "is_monthly": False,
                        "is_scent_bomb_only": True
                    },
                    "expected_subtotal": 7.0,  # 2 * $3.50
                    "expected_tax": 0.58,      # 7.0 * 0.0825 = 0.5775 -> 0.58
                    "expected_travel_fee": 0.0,
                    "expected_total": 7.58     # 7.0 + 0.58
                },
                {
                    "name": "Regular Service with Tax",
                    "data": {
                        "services": [{"service_id": "patio", "quantity": 1}],
                        "distance_miles": 0,
                        "is_monthly": False
                    },
                    "expected_subtotal": 85.0,  # Patio base price
                    "expected_tax": 7.01,       # 85.0 * 0.0825 = 7.0125 -> 7.01
                    "expected_travel_fee": 0.0,
                    "expected_total": 92.01     # 85.0 + 7.01
                }
            ]

            for test_case in test_cases:
                response = requests.post(f"{self.base_url}/calculate-price", json=test_case["data"], timeout=10)
                
                if response.status_code == 200:
                    result = response.json()
                    
                    # Check subtotal
                    subtotal_ok = abs(result.get("subtotal", 0) - test_case["expected_subtotal"]) < 0.01
                    
                    # Check tax
                    tax_ok = abs(result.get("tax", 0) - test_case["expected_tax"]) < 0.01
                    
                    # Check travel fee
                    travel_fee_ok = abs(result.get("travel_fee", 0) - test_case["expected_travel_fee"]) < 0.01
                    
                    # Check total
                    total_ok = abs(result.get("total", 0) - test_case["expected_total"]) < 0.01
                    
                    if subtotal_ok and tax_ok and travel_fee_ok and total_ok:
                        self.log_test(f"Price Calc - {test_case['name']}", True, 
                                    f"Subtotal: ${result.get('subtotal')}, Tax: ${result.get('tax')}, Total: ${result.get('total')}")
                    else:
                        error_details = []
                        if not subtotal_ok:
                            error_details.append(f"subtotal: {result.get('subtotal')} vs {test_case['expected_subtotal']}")
                        if not tax_ok:
                            error_details.append(f"tax: {result.get('tax')} vs {test_case['expected_tax']}")
                        if not travel_fee_ok:
                            error_details.append(f"travel_fee: {result.get('travel_fee')} vs {test_case['expected_travel_fee']}")
                        if not total_ok:
                            error_details.append(f"total: {result.get('total')} vs {test_case['expected_total']}")
                        
                        self.log_test(f"Price Calc - {test_case['name']}", False, result, f"Wrong values: {', '.join(error_details)}")
                else:
                    self.log_test(f"Price Calc - {test_case['name']}", False, {}, f"Status: {response.status_code}")

        except Exception as e:
            self.log_test("Price Calculation", False, None, str(e))

    def test_scent_bomb_booking(self):
        """Test scent bomb only booking creation"""
        try:
            booking_data = {
                "customer_name": "Scent Bomb Test Customer",
                "customer_email": "scentbomb@test.com",
                "customer_phone": "(817) 555-0001",
                "customer_address": "123 Test Ave, Burleson, TX",
                "distance_miles": 0,
                "services": [{"service_id": "scent_bomb", "quantity": 3, "scent": "lavender"}],
                "booking_dates": [datetime.now().strftime("%Y-%m-%d")],
                "is_monthly": False,
                "is_scent_bomb_only": True,
                "notes": "Test scent bomb order - Lavender x3"
            }

            response = requests.post(f"{self.base_url}/bookings", json=booking_data, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                booking_id = result.get("id")
                
                # Check pricing
                subtotal = result.get("subtotal", 0)
                tax = result.get("tax", 0)
                travel_fee = result.get("travel_fee", 0)
                total = result.get("total", 0)
                
                expected_subtotal = 10.50  # 3 * $3.50
                expected_tax = 0.87        # 10.50 * 0.0825 = 0.86625 -> 0.87
                expected_total = 11.37     # 10.50 + 0.87
                
                if (abs(subtotal - expected_subtotal) < 0.01 and 
                    abs(tax - expected_tax) < 0.01 and 
                    travel_fee == 0.0 and 
                    abs(total - expected_total) < 0.01):
                    
                    self.log_test("Scent Bomb Booking", True, 
                                f"Booking ID: {booking_id}, Total: ${total} (no travel fee)")
                    return booking_id
                else:
                    self.log_test("Scent Bomb Booking", False, result, 
                                f"Wrong pricing - Subtotal: ${subtotal}, Tax: ${tax}, Travel: ${travel_fee}, Total: ${total}")
                    return None
            else:
                self.log_test("Scent Bomb Booking", False, {}, f"Status: {response.status_code}")
                return None
                
        except Exception as e:
            self.log_test("Scent Bomb Booking", False, None, str(e))
            return None

    def run_all_tests(self):
        """Run all API tests"""
        print("🧪 Starting Upwash Power Washing API Tests")
        print("=" * 60)

        # Test basic connectivity
        self.test_api_root()
        
        # Test services endpoint for tax rate and scent bomb pricing
        self.test_services_endpoint()
        
        # Test admin authentication
        self.test_admin_login()
        
        # Test admin stats authentication requirement
        self.test_admin_stats_auth_required()
        
        # Test price calculations with 8.25% tax
        self.test_price_calculation_with_tax()
        
        # Test scent bomb booking
        self.test_scent_bomb_booking()

        print("\n" + "=" * 60)
        print(f"📊 Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for failure in self.failed_tests:
                print(f"  - {failure['test']}: {failure['error']}")
        
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    tester = UpwashAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)