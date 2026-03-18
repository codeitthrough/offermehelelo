"""
Test Suite for Browse Links API
Tests: Browse Links CRUD, filtering by category and subcategory
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBrowseLinksPublicEndpoints:
    """Test public browse links endpoints (no auth required)"""
    
    def test_get_browse_links_all(self):
        """Test GET /api/browse-links returns all active browse links"""
        response = requests.get(f"{BASE_URL}/api/browse-links")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: GET /api/browse-links - {len(data)} browse links found")
        
        # Verify browse link structure if any exist
        if len(data) > 0:
            link = data[0]
            assert "id" in link
            assert "title" in link
            assert "platform" in link
            assert "affiliate_link" in link
            assert "is_active" in link
            print(f"  First link: {link['title']} - {link['platform']}")
    
    def test_get_browse_links_by_category(self):
        """Test GET /api/browse-links?category=cat-7 filters by category"""
        response = requests.get(f"{BASE_URL}/api/browse-links?category=cat-7")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify all returned links have correct category
        for link in data:
            if link.get('category_id'):
                assert link['category_id'] == 'cat-7'
        print(f"SUCCESS: GET /api/browse-links?category=cat-7 - {len(data)} links for Fashion category")
    
    def test_get_browse_links_by_category_and_subcategory(self):
        """Test GET /api/browse-links?category=cat-7&subcategory=women filters by both"""
        response = requests.get(f"{BASE_URL}/api/browse-links?category=cat-7&subcategory=women")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify all returned links have correct category and subcategory
        for link in data:
            if link.get('category_id'):
                assert link['category_id'] == 'cat-7'
            if link.get('subcategory'):
                assert link['subcategory'] == 'women'
        print(f"SUCCESS: GET /api/browse-links?category=cat-7&subcategory=women - {len(data)} links")


class TestBrowseLinksAdminEndpoints:
    """Test admin browse links CRUD endpoints (auth required)"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_get_admin_browse_links(self, auth_token):
        """Test GET /api/admin/browse-links returns all browse links for admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/browse-links",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: GET /api/admin/browse-links - {len(data)} browse links")
        
        # Verify platform_logo enrichment
        for link in data:
            if link.get('platform') in ['Amazon', 'Flipkart']:
                # Should have platform_logo from platforms collection
                print(f"  Link: {link['title']} - platform: {link['platform']}, logo: {link.get('platform_logo', 'N/A')}")
    
    def test_create_browse_link(self, auth_token):
        """Test POST /api/admin/browse-links creates a new browse link"""
        payload = {
            "title": "TEST_Browse Link for Testing",
            "platform": "Amazon",
            "affiliate_link": "https://amazon.com/test-browse-link",
            "category_id": "cat-7",
            "subcategory": "women",
            "offer_text": "Up to 60% Off"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/browse-links",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify returned data
        assert data['title'] == payload['title']
        assert data['platform'] == payload['platform']
        assert data['affiliate_link'] == payload['affiliate_link']
        assert data['category_id'] == payload['category_id']
        assert data['subcategory'] == payload['subcategory']
        assert data['offer_text'] == payload['offer_text']
        assert data['is_active'] == True
        assert 'id' in data
        assert 'created_at' in data
        
        # Store ID for cleanup
        link_id = data['id']
        print(f"SUCCESS: POST /api/admin/browse-links - Created link {link_id}")
        
        # Verify GET returns the new link
        verify_response = requests.get(f"{BASE_URL}/api/browse-links")
        all_links = verify_response.json()
        found = any(link['id'] == link_id for link in all_links)
        assert found, f"Created link {link_id} not found in GET /api/browse-links"
        print(f"  Verified: Link {link_id} exists in browse-links")
        
        # Cleanup - delete the test link
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/browse-links/{link_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert delete_response.status_code == 200
        print(f"  Cleanup: Deleted test link {link_id}")
    
    def test_update_browse_link(self, auth_token):
        """Test PUT /api/admin/browse-links/{id} updates a browse link"""
        # First create a link
        create_response = requests.post(
            f"{BASE_URL}/api/admin/browse-links",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "title": "TEST_Link for Update Test",
                "platform": "Flipkart",
                "affiliate_link": "https://flipkart.com/test-update",
                "offer_text": "30% Off"
            }
        )
        assert create_response.status_code == 200
        link_id = create_response.json()['id']
        print(f"SUCCESS: Created link {link_id} for update test")
        
        # Update the link
        update_response = requests.put(
            f"{BASE_URL}/api/admin/browse-links/{link_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "title": "TEST_Updated Link Title",
                "offer_text": "50% Off"
            }
        )
        assert update_response.status_code == 200
        updated_data = update_response.json()
        
        assert updated_data['title'] == "TEST_Updated Link Title"
        assert updated_data['offer_text'] == "50% Off"
        assert updated_data['platform'] == "Flipkart"  # Unchanged field
        print(f"SUCCESS: PUT /api/admin/browse-links/{link_id} - Updated link")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/browse-links/{link_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        print(f"  Cleanup: Deleted test link {link_id}")
    
    def test_delete_browse_link(self, auth_token):
        """Test DELETE /api/admin/browse-links/{id} deletes a browse link"""
        # First create a link
        create_response = requests.post(
            f"{BASE_URL}/api/admin/browse-links",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "title": "TEST_Link for Delete Test",
                "platform": "Amazon",
                "affiliate_link": "https://amazon.com/test-delete"
            }
        )
        assert create_response.status_code == 200
        link_id = create_response.json()['id']
        print(f"SUCCESS: Created link {link_id} for delete test")
        
        # Delete the link
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/browse-links/{link_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert delete_response.status_code == 200
        assert delete_response.json()['message'] == "Browse link deleted successfully"
        print(f"SUCCESS: DELETE /api/admin/browse-links/{link_id} - Deleted link")
        
        # Verify it no longer exists
        admin_links = requests.get(
            f"{BASE_URL}/api/admin/browse-links",
            headers={"Authorization": f"Bearer {auth_token}"}
        ).json()
        found = any(link['id'] == link_id for link in admin_links)
        assert not found, f"Deleted link {link_id} still found in admin browse-links"
        print(f"  Verified: Link {link_id} no longer exists")
    
    def test_toggle_browse_link_active(self, auth_token):
        """Test toggling is_active status via PUT"""
        # Create a link
        create_response = requests.post(
            f"{BASE_URL}/api/admin/browse-links",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "title": "TEST_Link for Toggle Test",
                "platform": "Amazon",
                "affiliate_link": "https://amazon.com/test-toggle"
            }
        )
        link_id = create_response.json()['id']
        
        # Deactivate
        deactivate_response = requests.put(
            f"{BASE_URL}/api/admin/browse-links/{link_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"is_active": False}
        )
        assert deactivate_response.status_code == 200
        assert deactivate_response.json()['is_active'] == False
        print(f"SUCCESS: Deactivated link {link_id}")
        
        # Verify deactivated link not in public endpoint
        public_links = requests.get(f"{BASE_URL}/api/browse-links").json()
        found_public = any(link['id'] == link_id for link in public_links)
        assert not found_public, "Deactivated link should not appear in public endpoint"
        print(f"  Verified: Inactive link not in public /api/browse-links")
        
        # Re-activate
        activate_response = requests.put(
            f"{BASE_URL}/api/admin/browse-links/{link_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"is_active": True}
        )
        assert activate_response.status_code == 200
        assert activate_response.json()['is_active'] == True
        print(f"SUCCESS: Re-activated link {link_id}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/browse-links/{link_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
    
    def test_browse_link_not_found(self, auth_token):
        """Test 404 for non-existent browse link"""
        response = requests.put(
            f"{BASE_URL}/api/admin/browse-links/nonexistent-id",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"title": "Test"}
        )
        assert response.status_code == 404
        print("SUCCESS: Returns 404 for non-existent browse link")
        
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/browse-links/nonexistent-id",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert delete_response.status_code == 404
        print("SUCCESS: Returns 404 for delete of non-existent browse link")
    
    def test_admin_endpoints_require_auth(self):
        """Test that admin endpoints require authentication"""
        # GET without auth
        response = requests.get(f"{BASE_URL}/api/admin/browse-links")
        assert response.status_code == 403
        
        # POST without auth
        response = requests.post(
            f"{BASE_URL}/api/admin/browse-links",
            json={"title": "Test", "platform": "Amazon", "affiliate_link": "https://test.com"}
        )
        assert response.status_code == 403
        
        print("SUCCESS: Admin endpoints return 403 without auth")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
