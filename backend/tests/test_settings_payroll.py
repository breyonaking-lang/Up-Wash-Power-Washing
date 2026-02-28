"""
Test Admin Settings and Payroll Features for Up-Wash Power Washing
Tests:
- Admin settings endpoints (sales tax, service prices, pay rate, truck rentals)
- Payroll pay stub generation
- SMS notification for reschedule stored in customer_messages
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_USERNAME = "Hughes0108"
ADMIN_PASSWORD = "Godfirst7!"

class TestAdminSettings:
    """Test Admin Settings API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, "Admin login failed"
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_get_admin_settings(self):
        """Test GET /api/admin/settings returns all settings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to get settings: {response.text}"
        data = response.json()
        
        # Verify all required settings fields
        assert "pay_per_stop" in data, "pay_per_stop missing from settings"
        assert "sales_tax" in data, "sales_tax missing from settings"
        assert "services" in data, "services missing from settings"
        assert "truck_rental_prices" in data, "truck_rental_prices missing from settings"
        
        # Verify default values structure
        assert "default_pay_per_stop" in data, "default_pay_per_stop missing"
        assert "default_sales_tax" in data, "default_sales_tax missing"
        
        print(f"Settings retrieved successfully: pay_per_stop=${data['pay_per_stop']}, sales_tax={data['sales_tax']*100:.2f}%")
    
    def test_update_sales_tax(self):
        """Test PATCH /api/admin/settings/sales-tax endpoint"""
        # Save original value
        original = requests.get(f"{BASE_URL}/api/admin/settings", headers=self.headers).json()
        original_tax = original.get("sales_tax", 0.0825)
        
        # Update sales tax to new value
        new_tax = 0.09  # 9%
        response = requests.patch(
            f"{BASE_URL}/api/admin/settings/sales-tax",
            headers=self.headers,
            json={"sales_tax": new_tax}
        )
        
        assert response.status_code == 200, f"Failed to update sales tax: {response.text}"
        result = response.json()
        assert "message" in result, "Response should contain message"
        assert result.get("new_rate") == new_tax, f"Sales tax not updated to {new_tax}"
        
        # Verify by fetching settings again
        verify = requests.get(f"{BASE_URL}/api/admin/settings", headers=self.headers).json()
        assert verify["sales_tax"] == new_tax, "Sales tax not persisted"
        
        # Restore original value
        requests.patch(
            f"{BASE_URL}/api/admin/settings/sales-tax",
            headers=self.headers,
            json={"sales_tax": original_tax}
        )
        
        print(f"Sales tax update test passed: updated to {new_tax*100}% and restored to {original_tax*100}%")
    
    def test_sales_tax_validation(self):
        """Test sales tax validation (must be between 0 and 1)"""
        # Test invalid values
        response = requests.patch(
            f"{BASE_URL}/api/admin/settings/sales-tax",
            headers=self.headers,
            json={"sales_tax": 1.5}  # 150% is invalid
        )
        
        assert response.status_code == 400, "Should reject sales tax > 1"
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/settings/sales-tax",
            headers=self.headers,
            json={"sales_tax": -0.1}  # Negative is invalid
        )
        
        assert response.status_code == 400, "Should reject negative sales tax"
        
        print("Sales tax validation test passed")
    
    def test_update_service_price(self):
        """Test PATCH /api/admin/settings/service/{service_id} endpoint"""
        service_id = "recycling_bin"
        
        # Get current service info
        current = requests.get(f"{BASE_URL}/api/admin/settings", headers=self.headers).json()
        current_service = current.get("services", {}).get(service_id, {})
        original_price = current_service.get("price", 15.00)
        
        # Update service
        new_price = 20.00
        response = requests.patch(
            f"{BASE_URL}/api/admin/settings/service/{service_id}",
            headers=self.headers,
            json={
                "service_id": service_id,
                "name": "Recycling Bin Cleaning",
                "price": new_price,
                "is_routable": True,
                "is_quote": False
            }
        )
        
        assert response.status_code == 200, f"Failed to update service: {response.text}"
        
        # Verify update
        verify = requests.get(f"{BASE_URL}/api/admin/settings", headers=self.headers).json()
        updated_service = verify.get("services", {}).get(service_id, {})
        assert updated_service.get("price") == new_price, "Service price not updated"
        
        # Restore original
        requests.patch(
            f"{BASE_URL}/api/admin/settings/service/{service_id}",
            headers=self.headers,
            json={
                "service_id": service_id,
                "name": "Recycling Bin Cleaning",
                "price": original_price,
                "is_routable": True,
                "is_quote": False
            }
        )
        
        print(f"Service price update test passed: updated {service_id} to ${new_price}")
    
    def test_update_pay_per_stop(self):
        """Test PATCH /api/admin/settings/pay-per-stop endpoint"""
        # Get current value
        current = requests.get(f"{BASE_URL}/api/admin/settings", headers=self.headers).json()
        original_rate = current.get("pay_per_stop", 11.0)
        
        # Update pay rate
        new_rate = 12.50
        response = requests.patch(
            f"{BASE_URL}/api/admin/settings/pay-per-stop",
            headers=self.headers,
            json={"pay_per_stop": new_rate}
        )
        
        assert response.status_code == 200, f"Failed to update pay rate: {response.text}"
        result = response.json()
        assert result.get("new_rate") == new_rate, "Pay rate not updated correctly"
        
        # Verify persistence
        verify = requests.get(f"{BASE_URL}/api/admin/settings", headers=self.headers).json()
        assert verify["pay_per_stop"] == new_rate, "Pay rate not persisted"
        
        # Restore original
        requests.patch(
            f"{BASE_URL}/api/admin/settings/pay-per-stop",
            headers=self.headers,
            json={"pay_per_stop": original_rate}
        )
        
        print(f"Pay per stop update test passed: updated to ${new_rate}")
    
    def test_update_truck_rental_prices(self):
        """Test PATCH /api/admin/settings/truck-rentals endpoint"""
        # Get current values
        current = requests.get(f"{BASE_URL}/api/admin/settings", headers=self.headers).json()
        original_prices = current.get("truck_rental_prices", {"small": 75, "large": 125})
        
        # Update prices
        new_prices = {"small": 80.0, "large": 130.0}
        response = requests.patch(
            f"{BASE_URL}/api/admin/settings/truck-rentals",
            headers=self.headers,
            json=new_prices
        )
        
        assert response.status_code == 200, f"Failed to update truck prices: {response.text}"
        
        # Verify
        verify = requests.get(f"{BASE_URL}/api/admin/settings", headers=self.headers).json()
        assert verify["truck_rental_prices"]["small"] == new_prices["small"], "Small truck price not updated"
        assert verify["truck_rental_prices"]["large"] == new_prices["large"], "Large truck price not updated"
        
        # Restore
        requests.patch(
            f"{BASE_URL}/api/admin/settings/truck-rentals",
            headers=self.headers,
            json=original_prices
        )
        
        print(f"Truck rental prices update test passed")


class TestPayStub:
    """Test Payroll Pay Stub endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, "Admin login failed"
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_get_payroll_history(self):
        """Test GET /api/admin/payroll/history returns payment history"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payroll/history",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to get payroll history: {response.text}"
        data = response.json()
        assert "history" in data, "Response should contain history"
        
        print(f"Payroll history retrieved: {len(data['history'])} records")
    
    def test_get_pending_payroll(self):
        """Test GET /api/admin/payroll/pending returns pending payments"""
        response = requests.get(
            f"{BASE_URL}/api/admin/payroll/pending",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to get pending payroll: {response.text}"
        data = response.json()
        assert "payroll_summary" in data, "Response should contain payroll_summary"
        assert "total_pending" in data, "Response should contain total_pending"
        
        print(f"Pending payroll: ${data['total_pending']:.2f} total")
    
    def test_get_paystub_for_invalid_id(self):
        """Test GET /api/admin/payroll/{id}/paystub returns 404 for invalid ID"""
        fake_id = str(uuid.uuid4())
        response = requests.get(
            f"{BASE_URL}/api/admin/payroll/{fake_id}/paystub",
            headers=self.headers
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid payroll ID, got {response.status_code}"
        print("Paystub 404 test passed")
    
    def test_payroll_reflects_settings_pay_rate(self):
        """Test that payroll uses the pay rate from settings"""
        # Get current settings
        settings = requests.get(f"{BASE_URL}/api/admin/settings", headers=self.headers).json()
        current_rate = settings.get("pay_per_stop", 11.0)
        
        # Get pending payroll
        pending = requests.get(f"{BASE_URL}/api/admin/payroll/pending", headers=self.headers).json()
        
        # If there are pending payments, verify they use the correct rate
        if pending.get("payroll_summary"):
            for contractor in pending["payroll_summary"]:
                expected_amount = contractor.get("completed_stops", 0) * current_rate
                # Allow for small floating point differences
                actual_amount = contractor.get("unpaid_amount", 0)
                assert abs(actual_amount - expected_amount) < 0.01, \
                    f"Pay calculation mismatch: expected ${expected_amount:.2f}, got ${actual_amount:.2f}"
        
        print(f"Payroll uses correct rate: ${current_rate}/stop")


class TestRescheduleSMSStorage:
    """Test that reschedule SMS notifications are stored in customer_messages"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, "Admin login failed"
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_reschedule_stores_sms_in_customer_messages(self):
        """Test that reschedule with SMS creates a record in customer_messages"""
        # First create a test booking
        unique_name = f"TEST_SMS_{uuid.uuid4().hex[:8]}"
        booking_response = requests.post(
            f"{BASE_URL}/api/bookings",
            json={
                "customer_name": unique_name,
                "customer_phone": "8175551234",
                "customer_address": "123 Test St, Burleson, TX 76028",
                "services": [{"service_id": "recycling_bin", "quantity": 1}],
                "booking_dates": ["2026-01-15"],  # Wednesday
                "is_monthly": False,
                "distance_miles": 5
            }
        )
        
        assert booking_response.status_code == 200, f"Failed to create booking: {booking_response.text}"
        booking = booking_response.json()
        booking_id = booking["id"]
        
        # Reschedule with SMS notification
        reschedule_response = requests.patch(
            f"{BASE_URL}/api/admin/bookings/{booking_id}/reschedule",
            headers=self.headers,
            json={
                "new_date": "2026-01-20",  # Monday
                "send_sms": True,
                "custom_message": "Your appointment has been rescheduled for testing."
            }
        )
        
        assert reschedule_response.status_code == 200, f"Reschedule failed: {reschedule_response.text}"
        result = reschedule_response.json()
        assert result.get("sms_sent") == True, "SMS should be marked as sent"
        
        # Verify SMS was stored in customer_messages
        messages_response = requests.get(
            f"{BASE_URL}/api/admin/messages/customer",
            headers=self.headers
        )
        
        assert messages_response.status_code == 200, f"Failed to get customer messages: {messages_response.text}"
        messages = messages_response.json().get("messages", [])
        
        # Find the message for our test booking
        found_message = None
        for msg in messages:
            if msg.get("booking_id") == booking_id and msg.get("message_type") == "reschedule":
                found_message = msg
                break
        
        assert found_message is not None, "Reschedule SMS message not found in customer_messages"
        assert found_message.get("to_customer_phone") == "8175551234", "Phone number mismatch"
        
        print(f"SMS stored in customer_messages: {found_message.get('id')}")
        
        # Cleanup - delete the test booking
        # Note: No direct delete API, but the test data is prefixed with TEST_


class TestAuthRequired:
    """Test that admin endpoints require authentication"""
    
    def test_settings_requires_auth(self):
        """Test that /api/admin/settings requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/settings")
        assert response.status_code in [401, 403], f"Settings should require auth, got {response.status_code}"
        print("Settings auth test passed")
    
    def test_payroll_requires_auth(self):
        """Test that payroll endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/payroll/pending")
        assert response.status_code in [401, 403], f"Payroll should require auth, got {response.status_code}"
        print("Payroll auth test passed")
    
    def test_paystub_requires_auth(self):
        """Test that paystub endpoint requires authentication"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/admin/payroll/{fake_id}/paystub")
        assert response.status_code in [401, 403], f"Paystub should require auth, got {response.status_code}"
        print("Paystub auth test passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
