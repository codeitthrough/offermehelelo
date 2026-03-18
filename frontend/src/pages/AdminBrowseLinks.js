import React, { useState, useEffect } from 'react';
import { axiosInstance, API } from '@/App';
import axios from 'axios';
import AdminLayout from '@/components/AdminLayout';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Eye, EyeOff, Link, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const AdminBrowseLinks = () => {
  const [links, setLinks] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [currentLink, setCurrentLink] = useState({
    title: '',
    platform: '',
    affiliate_link: '',
    category_id: '',
    subcategory: '',
    offer_text: '',
  });

  useEffect(() => {
    fetchLinks();
    fetchPlatforms();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (currentLink.category_id) {
      fetchSubcategories(currentLink.category_id);
    } else {
      setSubcategories([]);
    }
  }, [currentLink.category_id]);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/admin/browse-links');
      setLinks(response.data);
    } catch (error) {
      toast.error('Failed to fetch browse links');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlatforms = async () => {
    try {
      const response = await axios.get(`${API}/platforms`);
      setPlatforms(response.data);
    } catch (error) {
      console.error('Failed to fetch platforms');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const fetchSubcategories = async (categoryId) => {
    try {
      const response = await axios.get(`${API}/subcategories?category_id=${categoryId}`);
      setSubcategories(response.data);
    } catch (error) {
      console.error('Failed to fetch subcategories');
      setSubcategories([]);
    }
  };

  const handleOpenDialog = (link = null) => {
    if (link) {
      setEditMode(true);
      setCurrentLink({
        title: link.title,
        platform: link.platform,
        affiliate_link: link.affiliate_link,
        category_id: link.category_id || '',
        subcategory: link.subcategory || '',
        offer_text: link.offer_text || '',
      });
      setSelectedId(link.id);
    } else {
      setEditMode(false);
      setCurrentLink({
        title: '',
        platform: '',
        affiliate_link: '',
        category_id: '',
        subcategory: '',
        offer_text: '',
      });
      setSelectedId(null);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentLink.title || !currentLink.platform || !currentLink.affiliate_link) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const payload = {
        ...currentLink,
        category_id: currentLink.category_id || null,
        subcategory: currentLink.subcategory || null,
        offer_text: currentLink.offer_text || null,
      };

      if (editMode) {
        await axiosInstance.put(`/admin/browse-links/${selectedId}`, payload);
        toast.success('Browse link updated successfully');
      } else {
        await axiosInstance.post('/admin/browse-links', payload);
        toast.success('Browse link created successfully');
      }
      setDialogOpen(false);
      fetchLinks();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save browse link');
    }
  };

  const handleToggleActive = async (link) => {
    try {
      await axiosInstance.put(`/admin/browse-links/${link.id}`, { is_active: !link.is_active });
      toast.success(`Link ${!link.is_active ? 'activated' : 'deactivated'}`);
      fetchLinks();
    } catch (error) {
      toast.error('Failed to update link');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this browse link?')) return;

    try {
      await axiosInstance.delete(`/admin/browse-links/${id}`);
      toast.success('Browse link deleted successfully');
      fetchLinks();
    } catch (error) {
      toast.error('Failed to delete browse link');
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.name : '-';
  };

  return (
    <AdminLayout>
      <div className="space-y-6" data-testid="admin-browse-links">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black">Browse Links</h1>
            <p className="text-muted-foreground mt-1">Manage macro affiliate links</p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="rounded-sm uppercase tracking-wide font-bold"
            data-testid="add-browse-link-btn"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Link
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          </div>
        ) : links.length === 0 ? (
          <div className="border rounded-none bg-card p-12 text-center">
            <Link className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-bold mb-2">No Browse Links Yet</h3>
            <p className="text-muted-foreground mb-4">
              Add macro affiliate links to display on category pages and homepage
            </p>
            <Button onClick={() => handleOpenDialog()} className="rounded-sm">
              <Plus className="h-4 w-4 mr-2" />
              Add First Link
            </Button>
          </div>
        ) : (
          <div className="border rounded-none bg-card overflow-x-auto">
            <table className="w-full admin-table">
              <thead>
                <tr className="border-b bg-secondary/50">
                  <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold">Title</th>
                  <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold">Platform</th>
                  <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold">Category</th>
                  <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold">Subcategory</th>
                  <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold">Offer</th>
                  <th className="text-center p-3 text-xs uppercase tracking-wider font-semibold">Status</th>
                  <th className="text-right p-3 text-xs uppercase tracking-wider font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id} className="border-b" data-testid={`browse-link-row-${link.id}`}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {link.platform_logo && (
                          <img src={link.platform_logo} alt={link.platform} className="h-6 w-auto" />
                        )}
                        <span className="font-medium">{link.title}</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm">{link.platform}</td>
                    <td className="p-3 text-sm">{getCategoryName(link.category_id)}</td>
                    <td className="p-3 text-sm capitalize">{link.subcategory || '-'}</td>
                    <td className="p-3 text-sm text-accent font-medium">{link.offer_text || '-'}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold uppercase ${
                          link.is_active
                            ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                            : 'bg-red-500/20 text-red-700 dark:text-red-400'
                        }`}
                      >
                        {link.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(link.affiliate_link, '_blank')}
                          data-testid={`visit-link-${link.id}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(link)}
                          data-testid={`toggle-link-${link.id}`}
                        >
                          {link.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(link)}
                          data-testid={`edit-link-${link.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(link.id)}
                          data-testid={`delete-link-${link.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-none max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-black text-2xl">
              {editMode ? 'Edit Browse Link' : 'Add Browse Link'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs uppercase tracking-wider font-semibold">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                value={currentLink.title}
                onChange={(e) => setCurrentLink({ ...currentLink, title: e.target.value })}
                className="mt-2 rounded-sm"
                placeholder="e.g., Shop Electronics on Amazon"
                data-testid="link-title-input"
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider font-semibold">
                Platform <span className="text-destructive">*</span>
              </Label>
              <Select
                value={currentLink.platform}
                onValueChange={(val) => setCurrentLink({ ...currentLink, platform: val })}
              >
                <SelectTrigger className="mt-2 rounded-sm" data-testid="link-platform-select">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((platform) => (
                    <SelectItem key={platform.id} value={platform.name}>
                      {platform.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider font-semibold">
                Affiliate Link <span className="text-destructive">*</span>
              </Label>
              <Input
                value={currentLink.affiliate_link}
                onChange={(e) => setCurrentLink({ ...currentLink, affiliate_link: e.target.value })}
                className="mt-2 rounded-sm"
                placeholder="https://..."
                data-testid="link-url-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider font-semibold">Category</Label>
                <Select
                  value={currentLink.category_id || "__all__"}
                  onValueChange={(val) => setCurrentLink({ ...currentLink, category_id: val === "__all__" ? '' : val, subcategory: '' })}
                >
                  <SelectTrigger className="mt-2 rounded-sm" data-testid="link-category-select">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider font-semibold">Subcategory</Label>
                <Select
                  value={currentLink.subcategory || "__all__"}
                  onValueChange={(val) => setCurrentLink({ ...currentLink, subcategory: val === "__all__" ? '' : val })}
                  disabled={!currentLink.category_id || subcategories.length === 0}
                >
                  <SelectTrigger className="mt-2 rounded-sm" data-testid="link-subcategory-select">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All</SelectItem>
                    {subcategories.map((subcat) => (
                      <SelectItem key={subcat.id} value={subcat.slug}>
                        {subcat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider font-semibold">Offer Text</Label>
              <Input
                value={currentLink.offer_text}
                onChange={(e) => setCurrentLink({ ...currentLink, offer_text: e.target.value })}
                className="mt-2 rounded-sm"
                placeholder="e.g., Up to 60% Off"
                data-testid="link-offer-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-sm">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="rounded-sm uppercase tracking-wide font-bold"
              data-testid="save-link-btn"
            >
              {editMode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminBrowseLinks;
