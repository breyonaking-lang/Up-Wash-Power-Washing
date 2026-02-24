#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta

class PowerWashingAPITester:
    def __init__(self, base_url="https://clean-pro-dispatch.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

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

    def test_get_services(self):
        """Test services endpoint"""
        try:
            response = requests.get(f"{self.base_url}/services", timeout=10)
            success = response.status_code == 200
            data = response.json() if success else {}
            
            if success:
                services = data.get("services", [])
                expected_services = ["recycling_bin", "patio", "driveway", "dumpster", "scent_bomb", "home_powerwash", "construction_cleanup"]
                service_ids = [s.get("service_id") for s in services]
                
                # Check for quote-based services specifically
                quote_services = [s for s in services if s.get("pricing_type") == "quote"]
                expected_quote_services = ["home_powerwash", "construction_cleanup"]
                quote_service_ids = [s.get("service_id") for s in quote_services]
                
                if all(svc in service_ids for svc in expected_services):
                    if all(qsvc in quote_service_ids for qsvc in expected_quote_services):
                        self.log_test("Get Services", True, f"Found {len(services)} services including {len(quote_services)} quote services")
                        return True, data
                    else:
                        self.log_test("Get Services", False, data, f"Missing quote services. Found: {quote_service_ids}")
                        return False, data
                else:
                    missing = [svc for svc in expected_services if svc not in service_ids]
                    self.log_test("Get Services", False, data, f"Missing services: {missing}")
                    return False, data
            else:
                self.log_test("Get Services", False, data, f"Status: {response.status_code}")
                return False, {}
        except Exception as e:
            self.log_test("Get Services", False, None, str(e))
            return False, {}

    def test_price_calculation(self):
        """Test price calculation endpoint"""
        try:
            # Test bin pricing - 1 bin should be $15
            test_cases = [
                {
                    "name": "1 Recycling Bin",
                    "data": {
                        "services": [{"service_id": "recycling_bin", "quantity": 1}],
                        "distance_miles": 0,
                        "is_monthly": False
                    },
                    "expected_subtotal": 15.0
                },
                {
                    "name": "2 Recycling Bins", 
                    "data": {
                        "services": [{"service_id": "recycling_bin", "quantity": 2}],
                        "distance_miles": 0,
                        "is_monthly": False
                    },
                    "expected_subtotal": 25.0
                },
                {
                    "name": "3 Recycling Bins",
                    "data": {
                        "services": [{"service_id": "recycling_bin", "quantity": 3}],
                        "distance_miles": 0,
                        "is_monthly": False
                    },
                    "expected_subtotal": 33.0  # 25 + 8
                },
                {
                    "name": "Patio Cleaning",
                    "data": {
                        "services": [{"service_id": "patio", "quantity": 1}],
                        "distance_miles": 0,
                        "is_monthly": False
                    },
                    "expected_subtotal": 30.0
                },
                {
                    "name": "1 Dumpster",
                    "data": {
                        "services": [{"service_id": "dumpster", "quantity": 1}],
                        "distance_miles": 0,
                        "is_monthly": False
                    },
                    "expected_subtotal": 70.0  # First dumpster $70
                },
                {
                    "name": "2 Dumpsters", 
                    "data": {
                        "services": [{"service_id": "dumpster", "quantity": 2}],
                        "distance_miles": 0,
                        "is_monthly": False
                    },
                    "expected_subtotal": 115.0  # $70 + $45
                },
                {
                    "name": "Scent Bombs Standalone",
                    "data": {
                        "services": [{"service_id": "scent_bomb", "quantity": 2}],
                        "distance_miles": 0,
                        "is_monthly": False
                    },
                    "expected_subtotal": 7.0  # 2 * 3.50
                },
                {
                    "name": "Monthly Discount Test",
                    "data": {
                        "services": [{"service_id": "recycling_bin", "quantity": 1}],
                        "distance_miles": 0,
                        "is_monthly": True
                    },
                    "expected_subtotal": 15.0,
                    "expected_discount": 0.75  # 5% of 15
                },
                {
                    "name": "Travel Fee Test",
                    "data": {
                        "services": [{"service_id": "patio", "quantity": 1}],
                        "distance_miles": 20,  # 5 miles beyond free radius
                        "is_monthly": False
                    },
                    "expected_subtotal": 30.0,
                    "expected_travel_fee": 5.0
                }
            ]

            for test_case in test_cases:
                response = requests.post(f"{self.base_url}/calculate-price", json=test_case["data"], timeout=10)
                
                if response.status_code == 200:
                    result = response.json()
                    
                    # Check subtotal
                    if abs(result.get("subtotal", 0) - test_case["expected_subtotal"]) < 0.01:
                        
                        # Check discount if expected
                        if "expected_discount" in test_case:
                            if abs(result.get("discount", 0) - test_case["expected_discount"]) < 0.01:
                                self.log_test(f"Price Calc - {test_case['name']}", True, result)
                            else:
                                self.log_test(f"Price Calc - {test_case['name']}", False, result, f"Wrong discount: {result.get('discount')} vs {test_case['expected_discount']}")
                        
                        # Check travel fee if expected
                        elif "expected_travel_fee" in test_case:
                            if abs(result.get("travel_fee", 0) - test_case["expected_travel_fee"]) < 0.01:
                                self.log_test(f"Price Calc - {test_case['name']}", True, result)
                            else:
                                self.log_test(f"Price Calc - {test_case['name']}", False, result, f"Wrong travel fee: {result.get('travel_fee')} vs {test_case['expected_travel_fee']}")
                        else:
                            self.log_test(f"Price Calc - {test_case['name']}", True, result)
                    else:
                        self.log_test(f"Price Calc - {test_case['name']}", False, result, f"Wrong subtotal: {result.get('subtotal')} vs {test_case['expected_subtotal']}")
                else:
                    self.log_test(f"Price Calc - {test_case['name']}", False, {}, f"Status: {response.status_code}")

        except Exception as e:
            self.log_test("Price Calculation", False, None, str(e))

    def test_check_date(self):
        """Test date availability endpoint"""
        try:
            # Test weekday availability - no time slots needed
            today = datetime.now()
            weekday_date = today + timedelta(days=1)
            while weekday_date.weekday() > 4:  # Find next weekday
                weekday_date += timedelta(days=1)
            
            weekday_str = weekday_date.strftime("%Y-%m-%d")
            
            response = requests.post(f"{self.base_url}/check-date", 
                                   json={"date": weekday_str}, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                available = result.get("available", False)
                
                # Should be available for weekdays
                if available:
                    self.log_test("Date Check - Weekday", True, f"Date {weekday_str} available")
                else:
                    self.log_test("Date Check - Weekday", False, result, "Weekday not available")
            else:
                self.log_test("Date Check - Weekday", False, {}, f"Status: {response.status_code}")

            # Test weekend (should not be available)
            weekend_date = today + timedelta(days=1)
            while weekend_date.weekday() < 5:  # Find next weekend
                weekend_date += timedelta(days=1)
            
            weekend_str = weekend_date.strftime("%Y-%m-%d")
            
            response = requests.post(f"{self.base_url}/check-date", 
                                   json={"date": weekend_str}, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                available = result.get("available", False)
                
                if not available:
                    self.log_test("Date Check - Weekend", True, "Correctly unavailable on weekend")
                else:
                    self.log_test("Date Check - Weekend", False, result, "Weekend should not be available")
            else:
                self.log_test("Date Check - Weekend", False, {}, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Date Check", False, None, str(e))

    def test_booking_creation(self):
        """Test booking creation endpoint"""
        try:
            # Get a valid future weekday
            today = datetime.now()
            booking_date = today + timedelta(days=1)
            while booking_date.weekday() > 4:  # Find next weekday
                booking_date += timedelta(days=1)
            
            booking_data = {
                "customer_name": "Test Customer",
                "customer_email": "test@example.com",
                "customer_phone": "(817) 555-1234",
                "customer_address": "123 Test St, Burleson, TX",
                "distance_miles": 5.0,
                "services": [{"service_id": "recycling_bin", "quantity": 1}],
                "booking_dates": [booking_date.strftime("%Y-%m-%d")],  # Array of dates
                "is_monthly": False,
                "sms_opt_in": True,  # Test SMS opt-in
                "notes": "Test booking"
            }

            response = requests.post(f"{self.base_url}/bookings", 
                                   json=booking_data, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                booking_id = result.get("id")
                
                if booking_id:
                    self.log_test("Create Booking", True, f"Booking ID: {booking_id}")
                    return booking_id
                else:
                    self.log_test("Create Booking", False, result, "No booking ID returned")
                    return None
            else:
                self.log_test("Create Booking", False, {}, f"Status: {response.status_code}")
                return None
                
        except Exception as e:
            self.log_test("Create Booking", False, None, str(e))
            return None

    def test_get_booking(self, booking_id):
        """Test get booking by ID"""
        if not booking_id:
            return
            
        try:
            response = requests.get(f"{self.base_url}/bookings/{booking_id}", timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                self.log_test("Get Booking", True, f"Retrieved booking for {result.get('customer_name')}")
            else:
                self.log_test("Get Booking", False, {}, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Get Booking", False, None, str(e))

    def test_admin_endpoints(self):
        """Test admin endpoints"""
        try:
            # Test stats
            response = requests.get(f"{self.base_url}/admin/stats", timeout=10)
            if response.status_code == 200:
                stats = response.json()
                required_fields = ["total_bookings", "pending", "confirmed", "completed", "today_bookings", "total_revenue"]
                
                if all(field in stats for field in required_fields):
                    self.log_test("Admin Stats", True, stats)
                else:
                    self.log_test("Admin Stats", False, stats, "Missing required fields")
            else:
                self.log_test("Admin Stats", False, {}, f"Status: {response.status_code}")

            # Test calendar
            response = requests.get(f"{self.base_url}/admin/calendar", timeout=10)
            if response.status_code == 200:
                calendar_data = response.json()
                self.log_test("Admin Calendar", True, f"Calendar data retrieved")
            else:
                self.log_test("Admin Calendar", False, {}, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Admin Endpoints", False, None, str(e))

    def test_sms_status(self):
        """Test SMS configuration status"""
        try:
            response = requests.get(f"{self.base_url}/sms/status", timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                configured = result.get("configured", False)
                phone_number = result.get("phone_number", "")
                
                if configured and phone_number:
                    self.log_test("SMS Status - Configured", True, f"SMS configured with phone: {phone_number}")
                    return True
                else:
                    self.log_test("SMS Status - Configured", False, result, "SMS not properly configured")
                    return False
            else:
                self.log_test("SMS Status", False, {}, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("SMS Status", False, None, str(e))
            return False

    def test_booking_with_sms_optin(self):
        """Test booking creation with SMS opt-in"""
        try:
            # Get a valid future weekday
            today = datetime.now()
            booking_date = today + timedelta(days=1)
            while booking_date.weekday() > 4:  # Find next weekday
                booking_date += timedelta(days=1)
            
            booking_data = {
                "customer_name": "SMS Test Customer",
                "customer_email": "smstest@example.com",
                "customer_phone": "+15005550006",  # Twilio test number (valid format)
                "customer_address": "456 SMS Test St, Burleson, TX",
                "distance_miles": 3.0,
                "services": [{"service_id": "patio", "quantity": 1}],
                "booking_dates": [booking_date.strftime("%Y-%m-%d")],
                "is_monthly": False,
                "sms_opt_in": True,  # SMS opt-in enabled
                "notes": "SMS test booking"
            }

            response = requests.post(f"{self.base_url}/bookings", 
                                   json=booking_data, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                booking_id = result.get("id")
                sms_opt_in = result.get("sms_opt_in", False)
                
                if booking_id and sms_opt_in:
                    self.log_test("SMS Booking Creation", True, f"Booking {booking_id} with SMS opt-in")
                    return booking_id
                else:
                    self.log_test("SMS Booking Creation", False, result, "SMS opt-in not saved correctly")
                    return None
            else:
                self.log_test("SMS Booking Creation", False, {}, f"Status: {response.status_code}")
                return None
                
        except Exception as e:
            self.log_test("SMS Booking Creation", False, None, str(e))
            return None

    def test_manual_sms_send(self, booking_id):
        """Test manual SMS sending via API"""
        if not booking_id:
            self.log_test("Manual SMS Send", False, None, "No booking ID provided")
            return
            
        try:
            sms_data = {
                "booking_id": booking_id,
                "message_type": "reminder"
            }

            response = requests.post(f"{self.base_url}/sms/send", 
                                   json=sms_data, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                message = result.get("message", "")
                to_phone = result.get("to", "")
                
                if "SMS sent successfully" in message:
                    self.log_test("Manual SMS Send", True, f"SMS sent to {to_phone}")
                else:
                    self.log_test("Manual SMS Send", False, result, "Unexpected response message")
            else:
                error_detail = "Unknown error"
                try:
                    error_data = response.json()
                    error_detail = error_data.get("detail", "Unknown error")
                except:
                    pass
                self.log_test("Manual SMS Send", False, {}, f"Status: {response.status_code}, Error: {error_detail}")
                
        except Exception as e:
            self.log_test("Manual SMS Send", False, None, str(e))

    def test_sms_send_without_optin(self):
        """Test SMS send attempt for booking without SMS opt-in (should fail)"""
        try:
            # Create booking without SMS opt-in
            today = datetime.now()
            booking_date = today + timedelta(days=1)
            while booking_date.weekday() > 4:  # Find next weekday
                booking_date += timedelta(days=1)
            
            booking_data = {
                "customer_name": "No SMS Customer",
                "customer_email": "nosms@example.com",
                "customer_phone": "+15559876543",
                "customer_address": "789 No SMS St, Burleson, TX",
                "distance_miles": 2.0,
                "services": [{"service_id": "recycling_bin", "quantity": 1}],
                "booking_dates": [booking_date.strftime("%Y-%m-%d")],
                "is_monthly": False,
                "sms_opt_in": False,  # SMS opt-in disabled
                "notes": "No SMS test booking"
            }

            # Create the booking
            booking_response = requests.post(f"{self.base_url}/bookings", 
                                           json=booking_data, timeout=10)
            
            if booking_response.status_code == 200:
                booking_result = booking_response.json()
                booking_id = booking_result.get("id")
                
                # Try to send SMS (should fail)
                sms_data = {
                    "booking_id": booking_id,
                    "message_type": "reminder"
                }

                sms_response = requests.post(f"{self.base_url}/sms/send", 
                                           json=sms_data, timeout=10)
                
                if sms_response.status_code == 400:
                    try:
                        error_data = sms_response.json()
                        if "has not opted in for SMS" in error_data.get("detail", ""):
                            self.log_test("SMS Send Without Opt-in", True, "Correctly blocked SMS for non-opted customer")
                        else:
                            self.log_test("SMS Send Without Opt-in", False, error_data, "Wrong error message")
                    except:
                        self.log_test("SMS Send Without Opt-in", False, {}, "Could not parse error response")
                else:
                    self.log_test("SMS Send Without Opt-in", False, {}, f"Expected 400, got {sms_response.status_code}")
            else:
                self.log_test("SMS Send Without Opt-in", False, {}, "Could not create test booking")
                
        except Exception as e:
            self.log_test("SMS Send Without Opt-in", False, None, str(e))

    def run_all_tests(self):
        """Run all API tests"""
        print("🧪 Starting Upwash Power Washing API Tests")
        print("=" * 60)

        # Test basic connectivity
        self.test_api_root()
        
        # Test services
        self.test_get_services()
        
        # Test pricing
        self.test_price_calculation()
        
        # Test date checking (no time slots)
        self.test_check_date()
        
        # Test SMS configuration status
        sms_configured = self.test_sms_status()
        
        # Test booking flow
        booking_id = self.test_booking_creation()
        if booking_id:
            self.test_get_booking(booking_id)
        
        # Test SMS-specific functionality if configured
        if sms_configured:
            print("\n🔔 Testing SMS functionality...")
            
            # Test booking with SMS opt-in 
            sms_booking_id = self.test_booking_with_sms_optin()
            
            # Test manual SMS sending
            if sms_booking_id:
                self.test_manual_sms_send(sms_booking_id)
            
            # Test SMS rejection for non-opted customers
            self.test_sms_send_without_optin()
        else:
            print("\n⚠️  SMS not configured - skipping SMS tests")
        
        # Test admin endpoints
        self.test_admin_endpoints()

        print("\n" + "=" * 60)
        print(f"📊 Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for failure in self.failed_tests:
                print(f"  - {failure['test']}: {failure['error']}")
        
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    tester = PowerWashingAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)