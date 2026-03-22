"""
Test Suite for Deal Automator API
Tests: Auth, Categories, Deals, Platforms, Subcategories, Suggestions, Scraper Settings
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPublicEndpoints:
    """Test public endpoints (no auth required)"""
    
    def test_get_categories(self):
        """Test GET /api/categories returns list of active categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify category structure
        for cat in data:
            assert "id" in cat
            assert "name" in cat
            assert "slug" in cat
            assert "is_active" in cat
        print(f"SUCCESS: GET /api/categories - {len(data)} categories found")
    
    def test_get_platforms(self):
        """Test GET /api/platforms returns list of platforms"""
        response = requests.get(f"{BASE_URL}/api/platforms")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have Amazon and Flipkart at minimum
        platform_names = [p['name'] for p in data]
        assert 'Amazon' in platform_names or 'Flipkart' in platform_names
        print(f"SUCCESS: GET /api/platforms - {len(data)} platforms found: {platform_names}")
    
    def test_get_deals(self):
        """Test GET /api/deals returns list of deals"""
        response = requests.get(f"{BASE_URL}/api/deals")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Verify deal structure if deals exist
        if len(data) > 0:
            deal = data[0]
            assert "id" in deal
            assert "title" in deal
            assert "original_price" in deal
            assert "discounted_price" in deal
            assert "discount_percentage" in deal
        print(f"SUCCESS: GET /api/deals - {len(data)} deals found")
    
    def test_get_deals_with_category_filter(self):
        """Test GET /api/deals with category filter"""
        # First get a category
        cat_response = requests.get(f"{BASE_URL}/api/categories")
        categories = cat_response.json()
        if len(categories) > 0:
            cat_id = categories[0]['id']
            response = requests.get(f"{BASE_URL}/api/deals?category_id={cat_id}")
            assert response.status_code == 200
            print(f"SUCCESS: GET /api/deals?category_id={cat_id} - {len(response.json())} deals")
    
    def test_get_deals_with_discount_filter(self):
        """Test GET /api/deals with min_discount filter"""
        response = requests.get(f"{BASE_URL}/api/deals?min_discount=50")
        assert response.status_code == 200
        data = response.json()
        # Verify all deals have >= 50% discount
        for deal in data:
            assert deal['discount_percentage'] >= 50
        print(f"SUCCESS: GET /api/deals?min_discount=50 - {len(data)} deals found")
    
    def test_get_subcategories(self):
        """Test GET /api/subcategories"""
        response = requests.get(f"{BASE_URL}/api/subcategories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: GET /api/subcategories - {len(data)} subcategories found")
    
    def test_deal_highlights_best_today(self):
        """Test GET /api/deals/highlights/best-today"""
        response = requests.get(f"{BASE_URL}/api/deals/highlights/best-today")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: GET /api/deals/highlights/best-today - {len(data)} deals")
    
    def test_deal_highlights_lightning(self):
        """Test GET /api/deals/highlights/lightning"""
        response = requests.get(f"{BASE_URL}/api/deals/highlights/lightning")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: GET /api/deals/highlights/lightning - {len(data)} deals")


class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_login_success(self):
        """Test POST /api/auth/login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "fuckalldeals"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        print("SUCCESS: Admin login with valid credentials")
    
    def test_login_invalid_credentials(self):
        """Test POST /api/auth/login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("SUCCESS: Login rejected with invalid credentials")
    
    def test_auth_verify(self):
        """Test GET /api/auth/verify with valid token"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "fuckalldeals"
        })
        token = login_response.json()["access_token"]
        
        # Verify
        response = requests.get(
            f"{BASE_URL}/api/auth/verify",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] == True
        print("SUCCESS: Token verification works")


class TestSuggestionsEndpoints:
    """Test suggestions (contact form) endpoints"""
    
    def test_create_suggestion(self):
        """Test POST /api/suggestions - contact form submission"""
        response = requests.post(f"{BASE_URL}/api/suggestions", json={
            "name": "TEST_User",
            "email": "test@test.com",
            "message": "This is a TEST suggestion from automated tests",
            "suggestion_type": "Product suggestion"
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("SUCCESS: POST /api/suggestions - Contact form submission works")
    
    def test_get_admin_suggestions(self):
        """Test GET /api/admin/suggestions - requires auth"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "fuckalldeals"
        })
        token = login_response.json()["access_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/admin/suggestions",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: GET /api/admin/suggestions - {len(data)} suggestions found")


class TestAdminPlatformsEndpoints:
    """Test admin platform management endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "fuckalldeals"
        })
        return response.json()["access_token"]
    
    def test_get_admin_platforms(self, auth_token):
        """Test GET /api/admin/platforms"""
        response = requests.get(
            f"{BASE_URL}/api/admin/platforms",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: GET /api/admin/platforms - {len(data)} platforms")
    
    def test_create_and_delete_platform(self, auth_token):
        """Test POST and DELETE /api/admin/platforms"""
        # Create platform
        create_response = requests.post(
            f"{BASE_URL}/api/admin/platforms",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "name": "TEST_Platform",
                "image_url": "https://example.com/test.png",
                "affiliate_link": "https://test-platform.com",
                "offer_percentage": 50
            }
        )
        assert create_response.status_code == 200
        platform = create_response.json()
        assert platform["name"] == "TEST_Platform"
        platform_id = platform["id"]
        print(f"SUCCESS: Created platform {platform_id}")
        
        # Delete platform
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/platforms/{platform_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert delete_response.status_code == 200
        print(f"SUCCESS: Deleted platform {platform_id}")


class TestAdminScraperSettings:
    """Test scraper settings endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "fuckalldeals"
        })
        return response.json()["access_token"]
    
    def test_get_scraper_settings(self, auth_token):
        """Test GET /api/admin/scraper-settings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/scraper-settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "scraper_enabled" in data
        assert "scraper_interval" in data
        print(f"SUCCESS: GET /api/admin/scraper-settings - enabled={data['scraper_enabled']}, interval={data['scraper_interval']}")
    
    def test_update_scraper_settings(self, auth_token):
        """Test PUT /api/admin/scraper-settings"""
        # Get current settings
        get_response = requests.get(
            f"{BASE_URL}/api/admin/scraper-settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        original = get_response.json()
        
        # Update settings
        response = requests.put(
            f"{BASE_URL}/api/admin/scraper-settings",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "scraper_enabled": True,
                "scraper_interval": "daily"
            }
        )
        assert response.status_code == 200
        
        # Restore original settings
        requests.put(
            f"{BASE_URL}/api/admin/scraper-settings",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=original
        )
        print("SUCCESS: PUT /api/admin/scraper-settings - Settings can be updated")


class TestAdminDealsEndpoints:
    """Test admin deal management endpoints including bulk operations"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "fuckalldeals"
        })
        return response.json()["access_token"]
    
    def test_get_admin_deals(self, auth_token):
        """Test GET /api/admin/deals"""
        response = requests.get(
            f"{BASE_URL}/api/admin/deals",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: GET /api/admin/deals - {len(data)} deals found")
    
    def test_create_update_delete_deal(self, auth_token):
        """Test full CRUD cycle for deals"""
        # Get a category first
        cat_response = requests.get(f"{BASE_URL}/api/categories")
        category_id = cat_response.json()[0]['id']
        
        # Create deal
        create_response = requests.post(
            f"{BASE_URL}/api/admin/deals",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "title": "TEST_Deal_For_Testing",
                "description": "This is a test deal",
                "category_id": category_id,
                "image_url": "https://example.com/test.jpg",
                "original_price": 1000,
                "discounted_price": 500,
                "affiliate_link": "https://test.com/deal",
                "platform": "Amazon"
            }
        )
        assert create_response.status_code == 200
        deal = create_response.json()
        deal_id = deal["id"]
        assert deal["discount_percentage"] == 50
        print(f"SUCCESS: Created deal {deal_id}")
        
        # Update deal
        update_response = requests.put(
            f"{BASE_URL}/api/admin/deals/{deal_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"title": "TEST_Deal_Updated"}
        )
        assert update_response.status_code == 200
        assert update_response.json()["title"] == "TEST_Deal_Updated"
        print(f"SUCCESS: Updated deal {deal_id}")
        
        # Delete deal
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/deals/{deal_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert delete_response.status_code == 200
        print(f"SUCCESS: Deleted deal {deal_id}")
    
    def test_bulk_delete_endpoint(self, auth_token):
        """Test POST /api/admin/deals/bulk-delete endpoint exists and works"""
        # Create two test deals
        cat_response = requests.get(f"{BASE_URL}/api/categories")
        category_id = cat_response.json()[0]['id']
        
        deal_ids = []
        for i in range(2):
            create_response = requests.post(
                f"{BASE_URL}/api/admin/deals",
                headers={"Authorization": f"Bearer {auth_token}"},
                json={
                    "title": f"TEST_Bulk_Delete_Deal_{i}",
                    "category_id": category_id,
                    "original_price": 1000,
                    "discounted_price": 500,
                    "affiliate_link": f"https://test.com/bulk-{i}",
                    "platform": "Amazon"
                }
            )
            if create_response.status_code == 200:
                deal_ids.append(create_response.json()["id"])
        
        # Bulk delete
        response = requests.post(
            f"{BASE_URL}/api/admin/deals/bulk-delete",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"deal_ids": deal_ids}
        )
        assert response.status_code == 200
        data = response.json()
        assert "deleted" in data
        print(f"SUCCESS: Bulk delete - deleted {data['deleted']} deals")


class TestAnalyticsEndpoints:
    """Test analytics endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "fuckalldeals"
        })
        return response.json()["access_token"]
    
    def test_dashboard_analytics(self, auth_token):
        """Test GET /api/admin/analytics/dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics/dashboard",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_deals" in data
        assert "deals_today" in data
        print(f"SUCCESS: GET /api/admin/analytics/dashboard - total_deals={data['total_deals']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
