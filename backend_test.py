#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Affiliate Deals Website
Tests all endpoints including public, auth, and admin functionality
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, List, Optional

class AffiliateDealsAPITester:
    def __init__(self, base_url="https://offermehelelo.onrender.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test_result(self, name: str, success: bool, details: str = ""):
        """Log test result for reporting"""
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None,
                 description: str = "") -> tuple:
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if not endpoint.startswith('http') else endpoint
        
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)
        
        if self.admin_token:
            default_headers['Authorization'] = f'Bearer {self.admin_token}'

        self.tests_run += 1
        print(f"\n🔍 [{self.tests_run}] Testing {name}")
        if description:
            print(f"   Description: {description}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"   ✅ Passed - Status: {response.status_code}")
                self.log_test_result(name, True, f"Status: {response.status_code}")
                
                try:
                    return success, response.json() if response.content else {}
                except ValueError:
                    return success, {"raw_response": response.text}
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                if response.content:
                    try:
                        error_detail = response.json().get('detail', response.text)
                        error_msg += f" - {error_detail}"
                    except ValueError:
                        error_msg += f" - {response.text[:200]}"
                
                print(f"   ❌ Failed - {error_msg}")
                self.log_test_result(name, False, error_msg)
                return False, {}

        except requests.exceptions.RequestException as e:
            error_msg = f"Request failed: {str(e)}"
            print(f"   ❌ Failed - {error_msg}")
            self.log_test_result(name, False, error_msg)
            return False, {}

    def test_public_endpoints(self):
        """Test public endpoints that don't require authentication"""
        print("\n" + "="*60)
        print("🌐 TESTING PUBLIC ENDPOINTS")
        print("="*60)
        
        # Test get categories
        success, categories = self.run_test(
            "Get Categories", "GET", "categories", 200,
            description="Fetch all active product categories"
        )
        
        if success and isinstance(categories, list):
            print(f"   📊 Found {len(categories)} categories")
            if len(categories) > 0:
                print(f"   📋 Sample category: {categories[0].get('name', 'N/A')}")
        
        # Test get all deals
        success, deals = self.run_test(
            "Get All Deals", "GET", "deals", 200,
            description="Fetch all active deals"
        )
        
        if success and isinstance(deals, list):
            print(f"   📊 Found {len(deals)} deals")
            if len(deals) > 0:
                sample_deal = deals[0]
                print(f"   📋 Sample deal: {sample_deal.get('title', 'N/A')[:50]}...")
                print(f"   💰 Price: ₹{sample_deal.get('discounted_price', 0)} (was ₹{sample_deal.get('original_price', 0)})")
                print(f"   🏷️ Discount: {sample_deal.get('discount_percentage', 0)}%")
        
        # Test deals with category filter
        if success and isinstance(categories, list) and len(categories) > 0:
            cat_id = categories[0]['id']
            success, filtered_deals = self.run_test(
                "Get Deals by Category", "GET", f"deals?category_id={cat_id}", 200,
                description=f"Filter deals by category: {categories[0]['name']}"
            )
            
            if success:
                print(f"   📊 Found {len(filtered_deals)} deals in category")
        
        # Test deals with discount filter
        self.run_test(
            "Get Deals with Min Discount", "GET", "deals?min_discount=20", 200,
            description="Filter deals with minimum 20% discount"
        )
        
        # Test deals with platform filter
        self.run_test(
            "Get Deals by Platform", "GET", "deals?platform=Amazon", 200,
            description="Filter deals by Amazon platform"
        )

    def test_authentication(self):
        """Test authentication endpoints"""
        print("\n" + "="*60)
        print("🔐 TESTING AUTHENTICATION")
        print("="*60)
        
        # Test login with valid credentials
        credentials = {"username": "admin", "password": "fuckalldeals"}
        success, response = self.run_test(
            "Admin Login", "POST", "auth/login", 200, 
            data=credentials,
            description="Login with admin credentials"
        )
        
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   🎫 Token acquired: {self.admin_token[:20]}...")
        else:
            print("   ⚠️ Failed to get admin token - admin tests will fail")
            return False
        
        # Test token verification
        self.run_test(
            "Verify Token", "GET", "auth/verify", 200,
            description="Verify JWT token validity"
        )
        
        # Test login with invalid credentials
        invalid_creds = {"username": "admin", "password": "wrongpassword"}
        self.run_test(
            "Invalid Login", "POST", "auth/login", 401,
            data=invalid_creds,
            description="Test login failure with wrong password"
        )
        
        return True

    def test_admin_categories(self):
        """Test admin category management endpoints"""
        print("\n" + "="*60)
        print("📁 TESTING ADMIN CATEGORIES")
        print("="*60)
        
        if not self.admin_token:
            print("⚠️ No admin token - skipping admin category tests")
            return
        
        # Get all categories (admin view)
        success, categories = self.run_test(
            "Get Admin Categories", "GET", "admin/categories", 200,
            description="Fetch all categories with admin access"
        )
        
        # Create new category
        new_category = {
            "name": "Test Category",
            "icon": "TestIcon"
        }
        success, created_cat = self.run_test(
            "Create Category", "POST", "admin/categories", 200,
            data=new_category,
            description="Create a new test category"
        )
        
        created_id = None
        if success and 'id' in created_cat:
            created_id = created_cat['id']
            print(f"   📝 Created category with ID: {created_id}")
        
        # Update category
        if created_id:
            update_data = {"name": "Updated Test Category"}
            self.run_test(
                "Update Category", "PUT", f"admin/categories/{created_id}", 200,
                data=update_data,
                description="Update category name"
            )
            
            # Delete category
            self.run_test(
                "Delete Category", "DELETE", f"admin/categories/{created_id}", 200,
                description="Delete test category"
            )
        
        # Test category not found
        self.run_test(
            "Update Non-existent Category", "PUT", "admin/categories/nonexistent", 404,
            data={"name": "Won't work"},
            description="Test error handling for non-existent category"
        )

    def test_admin_deals(self):
        """Test admin deal management endpoints"""
        print("\n" + "="*60)
        print("🏷️ TESTING ADMIN DEALS")
        print("="*60)
        
        if not self.admin_token:
            print("⚠️ No admin token - skipping admin deals tests")
            return
        
        # Get all deals (admin view)
        success, deals = self.run_test(
            "Get Admin Deals", "GET", "admin/deals", 200,
            description="Fetch all deals with admin access"
        )
        
        # Get categories for deal creation
        success, categories = self.run_test(
            "Get Categories for Deal", "GET", "admin/categories", 200,
            description="Get categories for deal creation"
        )
        
        if not success or not categories:
            print("   ⚠️ No categories found - cannot create deal")
            return
        
        # Create new deal
        new_deal = {
            "title": "Test Deal - Sample Product",
            "description": "This is a test deal created by automated testing",
            "category_id": categories[0]['id'],
            "image_url": "https://images.unsplash.com/photo-1621534222671-05b508d16bb8",
            "original_price": 2999.0,
            "discounted_price": 1999.0,
            "affiliate_link": "https://example.com/test-deal",
            "platform": "Amazon"
        }
        
        success, created_deal = self.run_test(
            "Create Deal", "POST", "admin/deals", 200,
            data=new_deal,
            description="Create a new test deal"
        )
        
        created_deal_id = None
        if success and 'id' in created_deal:
            created_deal_id = created_deal['id']
            print(f"   📝 Created deal with ID: {created_deal_id}")
            print(f"   💰 Price: ₹{created_deal.get('discounted_price')} (was ₹{created_deal.get('original_price')})")
            print(f"   🏷️ Discount: {created_deal.get('discount_percentage')}%")
        
        # Update deal
        if created_deal_id:
            update_data = {
                "title": "Updated Test Deal",
                "original_price": 3999.0,
                "discounted_price": 2499.0
            }
            self.run_test(
                "Update Deal", "PUT", f"admin/deals/{created_deal_id}", 200,
                data=update_data,
                description="Update deal title and prices"
            )
            
            # Toggle deal active status
            self.run_test(
                "Deactivate Deal", "PUT", f"admin/deals/{created_deal_id}", 200,
                data={"is_active": False},
                description="Deactivate test deal"
            )
            
            # Delete deal
            self.run_test(
                "Delete Deal", "DELETE", f"admin/deals/{created_deal_id}", 200,
                description="Delete test deal"
            )
        
        # Test invalid category
        invalid_deal = {**new_deal, "category_id": "nonexistent"}
        self.run_test(
            "Create Deal Invalid Category", "POST", "admin/deals", 404,
            data=invalid_deal,
            description="Test error handling for invalid category"
        )

    def test_admin_settings(self):
        """Test admin affiliate settings endpoints"""
        print("\n" + "="*60)
        print("⚙️ TESTING ADMIN SETTINGS")
        print("="*60)
        
        if not self.admin_token:
            print("⚠️ No admin token - skipping admin settings tests")
            return
        
        # Get affiliate settings
        success, settings = self.run_test(
            "Get Affiliate Settings", "GET", "admin/settings", 200,
            description="Fetch affiliate platform settings"
        )
        
        if success and isinstance(settings, list) and len(settings) > 0:
            setting = settings[0]
            setting_id = setting['id']
            platform = setting['platform']
            
            print(f"   📊 Found {len(settings)} affiliate platforms")
            print(f"   🔧 Testing with {platform} platform")
            
            # Update setting
            update_data = {
                "api_key": "test_api_key_12345",
                "api_secret": "test_api_secret_67890",
                "is_active": True
            }
            
            self.run_test(
                f"Update {platform} Settings", "PUT", f"admin/settings/{setting_id}", 200,
                data=update_data,
                description=f"Update {platform} API credentials"
            )
            
            # Deactivate setting
            self.run_test(
                f"Deactivate {platform}", "PUT", f"admin/settings/{setting_id}", 200,
                data={"is_active": False},
                description=f"Deactivate {platform} integration"
            )
        
        # Test non-existent setting
        self.run_test(
            "Update Non-existent Setting", "PUT", "admin/settings/nonexistent", 404,
            data={"is_active": True},
            description="Test error handling for non-existent setting"
        )

    def test_edge_cases_and_errors(self):
        """Test edge cases and error handling"""
        print("\n" + "="*60)
        print("⚡ TESTING EDGE CASES & ERROR HANDLING")
        print("="*60)
        
        # Test non-existent endpoints
        self.run_test(
            "Non-existent Endpoint", "GET", "nonexistent", 404,
            description="Test 404 for non-existent endpoint"
        )
        
        # Test invalid JSON in requests
        if self.admin_token:
            # Test empty category creation
            self.run_test(
                "Empty Category Data", "POST", "admin/categories", 422,
                data={},
                description="Test validation error for empty category"
            )
            
            # Test invalid deal prices
            invalid_deal = {
                "title": "Invalid Deal",
                "category_id": "cat-1",
                "original_price": "invalid_price",
                "discounted_price": 100,
                "affiliate_link": "https://example.com",
                "platform": "Amazon"
            }
            self.run_test(
                "Invalid Deal Prices", "POST", "admin/deals", 422,
                data=invalid_deal,
                description="Test validation error for invalid prices"
            )

    def generate_report(self):
        """Generate test execution report"""
        print("\n" + "="*60)
        print("📊 TEST EXECUTION REPORT")
        print("="*60)
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if self.tests_run - self.tests_passed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   • {result['name']}: {result['details']}")
        
        print(f"\n🎯 Backend API Status: {'HEALTHY' if success_rate >= 90 else 'ISSUES DETECTED'}")
        
        # Save detailed results
        report_data = {
            "timestamp": datetime.now().isoformat(),
            "base_url": self.base_url,
            "summary": {
                "total_tests": self.tests_run,
                "passed": self.tests_passed,
                "failed": self.tests_run - self.tests_passed,
                "success_rate": success_rate
            },
            "detailed_results": self.test_results
        }
        
        try:
            with open('/app/backend_test_results.json', 'w') as f:
                json.dump(report_data, f, indent=2)
            print(f"📄 Detailed results saved to: /app/backend_test_results.json")
        except Exception as e:
            print(f"⚠️ Could not save results: {e}")
        
        return success_rate >= 80

def main():
    """Main test execution function"""
    print("🚀 Starting Affiliate Deals Website Backend API Tests")
    print(f"⏰ Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    tester = AffiliateDealsAPITester()
    
    try:
        # Run all test suites
        tester.test_public_endpoints()
        
        auth_success = tester.test_authentication()
        if auth_success:
            tester.test_admin_categories()
            tester.test_admin_deals()
            tester.test_admin_settings()
        
        tester.test_edge_cases_and_errors()
        
        # Generate final report
        overall_success = tester.generate_report()
        
        return 0 if overall_success else 1
        
    except KeyboardInterrupt:
        print("\n⚠️ Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error during testing: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())