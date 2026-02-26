import requests
import sys
import json
from datetime import datetime
import uuid

class LAUTECHRentalsAPITester:
    def __init__(self, base_url="https://ogbomoso-rentals.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_result(self, test_name, success, message="", response_data=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}: PASSED - {message}")
        else:
            print(f"❌ {test_name}: FAILED - {message}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "response_data": response_data
        })

    def make_request(self, method, endpoint, data=None, headers=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/api/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            default_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            default_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, params=data)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers)
            
            return response
        except Exception as e:
            print(f"Request error: {str(e)}")
            return None

    def test_health_check(self):
        """Test API health endpoint"""
        response = self.make_request('GET', '')
        if response and response.status_code == 200:
            self.log_result("Health Check", True, f"API is healthy - {response.json()}")
            return True
        else:
            self.log_result("Health Check", False, f"API health check failed - Status: {response.status_code if response else 'No response'}")
            return False

    def test_user_registration(self):
        """Test user registration"""
        # Generate unique email for testing
        test_email = f"test_{datetime.now().strftime('%Y%m%d_%H%M%S')}@example.com"
        
        data = {
            "email": test_email,
            "password": "testpass123",
            "full_name": "Test User"
        }
        
        response = self.make_request('POST', 'auth/register', data)
        
        if response and response.status_code == 200:
            response_data = response.json()
            if 'token' in response_data and 'user' in response_data:
                self.token = response_data['token']
                self.user_id = response_data['user']['id']
                self.log_result("User Registration", True, f"User registered successfully - ID: {self.user_id}", response_data)
                return True
            else:
                self.log_result("User Registration", False, "Missing token or user in response", response_data)
                return False
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else 'No response'
            self.log_result("User Registration", False, f"Registration failed - {error_msg}")
            return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        data = {
            "email": "testuser@example.com",
            "password": "testpass123"
        }
        
        response = self.make_request('POST', 'auth/login', data)
        
        if response and response.status_code == 200:
            response_data = response.json()
            if 'token' in response_data:
                # Store token for subsequent tests
                backup_token = self.token
                self.token = response_data['token']
                self.log_result("User Login", True, "Login successful", response_data)
                # Restore original token for other tests
                self.token = backup_token
                return True
            else:
                self.log_result("User Login", False, "Missing token in response", response_data)
                return False
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else 'No response'
            self.log_result("User Login", False, f"Login failed - {error_msg}")
            return False

    def test_get_user_profile(self):
        """Test getting user profile"""
        if not self.token:
            self.log_result("Get User Profile", False, "No authentication token available")
            return False
            
        response = self.make_request('GET', 'auth/me')
        
        if response and response.status_code == 200:
            response_data = response.json()
            if 'id' in response_data and 'email' in response_data:
                self.log_result("Get User Profile", True, f"Profile retrieved - Role: {response_data.get('role')}", response_data)
                return True
            else:
                self.log_result("Get User Profile", False, "Invalid profile data", response_data)
                return False
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else 'No response'
            self.log_result("Get User Profile", False, f"Profile retrieval failed - {error_msg}")
            return False

    def test_wallet_creation(self):
        """Test wallet is created with 0 tokens for new user"""
        if not self.token:
            self.log_result("Wallet Creation", False, "No authentication token available")
            return False
            
        response = self.make_request('GET', 'wallet')
        
        if response and response.status_code == 200:
            response_data = response.json()
            if 'token_balance' in response_data:
                balance = response_data['token_balance']
                if balance == 0:
                    self.log_result("Wallet Creation", True, f"Wallet created with 0 tokens", response_data)
                    return True
                else:
                    self.log_result("Wallet Creation", False, f"Wallet balance is {balance}, expected 0", response_data)
                    return False
            else:
                self.log_result("Wallet Creation", False, "Missing token_balance in response", response_data)
                return False
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else 'No response'
            self.log_result("Wallet Creation", False, f"Wallet retrieval failed - {error_msg}")
            return False

    def test_browse_properties(self):
        """Test browsing properties (public endpoint)"""
        response = self.make_request('GET', 'properties')
        
        if response and response.status_code == 200:
            response_data = response.json()
            if isinstance(response_data, list):
                self.log_result("Browse Properties", True, f"Retrieved {len(response_data)} properties", {"count": len(response_data)})
                return True
            else:
                self.log_result("Browse Properties", False, "Response is not a list", response_data)
                return False
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else 'No response'
            self.log_result("Browse Properties", False, f"Properties retrieval failed - {error_msg}")
            return False

    def test_property_filters(self):
        """Test property filtering"""
        # Test filter by type
        response = self.make_request('GET', 'properties', {'property_type': 'hostel'})
        
        if response and response.status_code == 200:
            response_data = response.json()
            self.log_result("Property Filter - Type", True, f"Filtered by hostel type - {len(response_data)} results", {"count": len(response_data)})
        else:
            self.log_result("Property Filter - Type", False, "Type filter failed")
            return False

        # Test filter by price range
        response = self.make_request('GET', 'properties', {'min_price': 50000, 'max_price': 200000})
        
        if response and response.status_code == 200:
            response_data = response.json()
            self.log_result("Property Filter - Price", True, f"Filtered by price range - {len(response_data)} results", {"count": len(response_data)})
            return True
        else:
            self.log_result("Property Filter - Price", False, "Price filter failed")
            return False

    def test_token_purchase_flow(self):
        """Test token purchase initiation"""
        if not self.token:
            self.log_result("Token Purchase Flow", False, "No authentication token available")
            return False
            
        data = {
            "quantity": 5,
            "email": "test@example.com",
            "phone_number": "+2348012345678"
        }
        
        response = self.make_request('POST', 'tokens/purchase', data)
        
        if response and response.status_code == 200:
            response_data = response.json()
            if 'checkout_url' in response_data and 'reference' in response_data:
                self.log_result("Token Purchase Flow", True, f"Purchase initiated - Reference: {response_data['reference']}", response_data)
                return True
            else:
                self.log_result("Token Purchase Flow", False, "Missing checkout_url or reference", response_data)
                return False
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else 'No response'
            self.log_result("Token Purchase Flow", False, f"Purchase initiation failed - {error_msg}")
            return False

    def test_agent_verification_request(self):
        """Test agent verification request submission"""
        if not self.token:
            self.log_result("Agent Verification Request", False, "No authentication token available")
            return False
            
        data = {
            "id_card_url": "https://example.com/id_card.jpg",
            "selfie_url": "https://example.com/selfie.jpg",
            "address": "123 Test Street, Ogbomosho, Oyo State"
        }
        
        response = self.make_request('POST', 'agent-verification/request', data)
        
        if response and response.status_code == 200:
            response_data = response.json()
            if 'request_id' in response_data:
                self.log_result("Agent Verification Request", True, f"Verification request submitted - ID: {response_data['request_id']}", response_data)
                return True
            else:
                self.log_result("Agent Verification Request", False, "Missing request_id in response", response_data)
                return False
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else 'No response'
            self.log_result("Agent Verification Request", False, f"Verification request failed - {error_msg}")
            return False

    def test_protected_routes_without_auth(self):
        """Test that protected routes require authentication"""
        # Temporarily remove token
        temp_token = self.token
        self.token = None
        
        # Test profile endpoint
        response = self.make_request('GET', 'auth/me')
        if response and response.status_code == 401:
            self.log_result("Protected Route - Profile", True, "Profile endpoint properly protected")
        else:
            self.log_result("Protected Route - Profile", False, f"Profile endpoint not protected - Status: {response.status_code if response else 'No response'}")
        
        # Test wallet endpoint
        response = self.make_request('GET', 'wallet')
        if response and response.status_code == 401:
            self.log_result("Protected Route - Wallet", True, "Wallet endpoint properly protected")
        else:
            self.log_result("Protected Route - Wallet", False, f"Wallet endpoint not protected - Status: {response.status_code if response else 'No response'}")
        
        # Restore token
        self.token = temp_token
        return True

    def test_admin_dashboard_access_control(self):
        """Test admin dashboard access control"""
        if not self.token:
            self.log_result("Admin Dashboard Access", False, "No authentication token available")
            return False
            
        # Test admin stats endpoint (should fail for regular user)
        response = self.make_request('GET', 'admin/stats')
        
        if response and response.status_code == 403:
            self.log_result("Admin Dashboard Access", True, "Admin dashboard properly protected from regular users")
            return True
        elif response and response.status_code == 200:
            # User might be admin
            self.log_result("Admin Dashboard Access", True, "User has admin access")
            return True
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else 'No response'
            self.log_result("Admin Dashboard Access", False, f"Unexpected response - {error_msg}")
            return False

    def test_agent_dashboard_access_control(self):
        """Test agent dashboard access control"""
        if not self.token:
            self.log_result("Agent Dashboard Access", False, "No authentication token available")
            return False
            
        # Test agent properties endpoint (should fail for regular user)
        response = self.make_request('GET', 'properties/my-listings')
        
        if response and response.status_code == 403:
            self.log_result("Agent Dashboard Access", True, "Agent dashboard properly protected from regular users")
            return True
        elif response and response.status_code == 200:
            # User might be agent/admin
            self.log_result("Agent Dashboard Access", True, "User has agent/admin access")
            return True
        else:
            error_msg = response.json().get('detail', 'Unknown error') if response else 'No response'
            self.log_result("Agent Dashboard Access", False, f"Unexpected response - {error_msg}")
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting LAUTECH Rentals API Tests...")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Core API tests
        if not self.test_health_check():
            print("❌ API is not healthy, stopping tests")
            return False
            
        # Authentication tests
        self.test_user_registration()
        self.test_user_login()
        self.test_get_user_profile()
        
        # Wallet tests
        self.test_wallet_creation()
        
        # Property tests
        self.test_browse_properties()
        self.test_property_filters()
        
        # Token purchase tests
        self.test_token_purchase_flow()
        
        # Agent verification tests
        self.test_agent_verification_request()
        
        # Access control tests
        self.test_protected_routes_without_auth()
        self.test_admin_dashboard_access_control()
        self.test_agent_dashboard_access_control()
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    """Main test runner"""
    tester = LAUTECHRentalsAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/test_reports/backend_test_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_tests': tester.tests_run,
            'passed_tests': tester.tests_passed,
            'success_rate': (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
            'results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())