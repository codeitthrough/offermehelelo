import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/App';
import AdminLayout from '@/components/AdminLayout';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const AdminDeals = () => {
  const [deals, setDeals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedDeals, setSelectedDeals] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [currentDeal, setCurrentDeal] = useState({
    title: '',
    description: '',
    category_id: '',
    image_url: '',
    original_price: '',
    discounted_price: '',
    affiliate_link: '',
    platform: 'Amazon',
  });
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    fetchDeals();
    fetchCategories();
  }, []);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/admin/deals');
      setDeals(response.data);
    } catch (error) {
      toast.error('Failed to fetch deals');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axiosInstance.get('/admin/categories');
      setCategories(response.data.filter((c) => c.is_active));
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const handleOpenDialog = (deal = null) => {
    if (deal) {
      setEditMode(true);
      setCurrentDeal({
        title: deal.title,
        description: deal.description || '',
        category_id: deal.category_id,
        image_url: deal.image_url || '',
        original_price: deal.original_price.toString(),
        discounted_price: deal.discounted_price.toString(),
        affiliate_link: deal.affiliate_link,
        platform: deal.platform,
      });
      setSelectedId(deal.id);
    } else {
      setEditMode(false);
      setCurrentDeal({
        title: '',
        description: '',
        category_id: '',
        image_url: '',
        original_price: '',
        discounted_price: '',
        affiliate_link: '',
        platform: 'Amazon',
      });
      setSelectedId(null);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const dealData = {
        ...currentDeal,
        original_price: parseFloat(currentDeal.original_price),
        discounted_price: parseFloat(currentDeal.discounted_price),
      };

      if (editMode) {
        await axiosInstance.put(`/admin/deals/${selectedId}`, dealData);
        toast.success('Deal updated successfully');
      } else {
        await axiosInstance.post('/admin/deals', dealData);
        toast.success('Deal created successfully');
      }
      setDialogOpen(false);
      fetchDeals();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save deal');
    }
  };

  const handleToggleActive = async (id, isActive) => {
    try {
      await axiosInstance.put(`/admin/deals/${id}`, { is_active: !isActive });
      toast.success(`Deal ${!isActive ? 'activated' : 'deactivated'}`);
      fetchDeals();
    } catch (error) {
      toast.error('Failed to update deal');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this deal?')) return;

    try {
      await axiosInstance.delete(`/admin/deals/${id}`);
      toast.success('Deal deleted successfully');
      fetchDeals();
    } catch (error) {
      toast.error('Failed to delete deal');
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedDeals(deals.map((deal) => deal.id));
    } else {
      setSelectedDeals([]);
    }
  };

  const handleSelectDeal = (dealId, checked) => {
    if (checked) {
      setSelectedDeals([...selectedDeals, dealId]);
    } else {
      setSelectedDeals(selectedDeals.filter((id) => id !== dealId));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDeals.length === 0) {
      toast.error('No deals selected');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedDeals.length} deals?`)) return;

    try {
      setBulkDeleting(true);
      const response = await axiosInstance.post('/admin/deals/bulk-delete', {
        deal_ids: selectedDeals,
      });
      toast.success(`Successfully deleted ${response.data.deleted} deals`);
      setSelectedDeals([]);
      fetchDeals();
    } catch (error) {
      toast.error('Failed to delete deals');
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6" data-testid="admin-deals">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black">Deals</h1>
            <p className="text-muted-foreground mt-1">Manage affiliate deals</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedDeals.length > 0 && (
              <Button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                variant="destructive"
                className="rounded-sm uppercase tracking-wide font-bold"
                data-testid="bulk-delete-btn"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selectedDeals.length})
              </Button>
            )}
            <Button
              onClick={() => handleOpenDialog()}
              className="rounded-sm uppercase tracking-wide font-bold"
              data-testid="add-deal-btn"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Deal
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          </div>
        ) : (
          <div className="border rounded-none bg-card overflow-x-auto">
            <table className="w-full admin-table">
              <thead>
                <tr className="border-b bg-secondary/50">
                  <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold w-10">
                    <Checkbox
                      checked={selectedDeals.length === deals.length && deals.length > 0}
                      onCheckedChange={handleSelectAll}
                      data-testid="select-all-checkbox"
                    />
                  </th>
                  <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold">Title</th>
                  <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold">Category</th>
                  <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold">Platform</th>
                  <th className="text-right p-3 text-xs uppercase tracking-wider font-semibold">Price</th>
                  <th className="text-center p-3 text-xs uppercase tracking-wider font-semibold">Discount</th>
                  <th className="text-center p-3 text-xs uppercase tracking-wider font-semibold">Status</th>
                  <th className="text-right p-3 text-xs uppercase tracking-wider font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => (
                  <tr key={deal.id} className="border-b" data-testid={`deal-row-${deal.id}`}>
                    <td className="p-3">
                      <Checkbox
                        checked={selectedDeals.includes(deal.id)}
                        onCheckedChange={(checked) => handleSelectDeal(deal.id, checked)}
                        data-testid={`select-deal-${deal.id}`}
                      />
                    </td>
                    <td className="p-3 font-medium max-w-xs truncate">{deal.title}</td>
                    <td className="p-3 text-sm text-muted-foreground">{deal.category_name}</td>
                    <td className="p-3 text-sm">{deal.platform}</td>
                    <td className="p-3 text-right">
                      <div className="text-sm">
                        <div className="font-bold">₹{deal.discounted_price.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground line-through">
                          ₹{deal.original_price.toLocaleString()}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-block px-2 py-1 text-xs font-black bg-accent/20 text-accent">
                        {deal.discount_percentage}%
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold uppercase ${
                          deal.is_active
                            ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                            : 'bg-red-500/20 text-red-700 dark:text-red-400'
                        }`}
                      >
                        {deal.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(deal.id, deal.is_active)}
                          data-testid={`toggle-deal-${deal.id}`}
                        >
                          {deal.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(deal)}
                          data-testid={`edit-deal-${deal.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(deal.id)}
                          data-testid={`delete-deal-${deal.id}`}
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
        <DialogContent className="rounded-none max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black text-2xl">{editMode ? 'Edit Deal' : 'Add Deal'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs uppercase tracking-wider font-semibold">Title</Label>
              <Input
                value={currentDeal.title}
                onChange={(e) => setCurrentDeal({ ...currentDeal, title: e.target.value })}
                className="mt-2 rounded-sm"
                data-testid="deal-title-input"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider font-semibold">Description</Label>
              <Textarea
                value={currentDeal.description}
                onChange={(e) => setCurrentDeal({ ...currentDeal, description: e.target.value })}
                className="mt-2 rounded-sm"
                rows={3}
                data-testid="deal-description-input"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider font-semibold">Category</Label>
              <Select
                value={currentDeal.category_id}
                onValueChange={(val) => setCurrentDeal({ ...currentDeal, category_id: val })}
              >
                <SelectTrigger className="mt-2 rounded-sm" data-testid="deal-category-select">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider font-semibold">Platform</Label>
              <Select
                value={currentDeal.platform}
                onValueChange={(val) => setCurrentDeal({ ...currentDeal, platform: val })}
              >
                <SelectTrigger className="mt-2 rounded-sm" data-testid="deal-platform-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Amazon">Amazon</SelectItem>
                  <SelectItem value="Flipkart">Flipkart</SelectItem>
                  <SelectItem value="EarnKaro">EarnKaro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wider font-semibold">Original Price</Label>
                <Input
                  type="number"
                  value={currentDeal.original_price}
                  onChange={(e) => setCurrentDeal({ ...currentDeal, original_price: e.target.value })}
                  className="mt-2 rounded-sm"
                  data-testid="deal-original-price-input"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider font-semibold">Discounted Price</Label>
                <Input
                  type="number"
                  value={currentDeal.discounted_price}
                  onChange={(e) => setCurrentDeal({ ...currentDeal, discounted_price: e.target.value })}
                  className="mt-2 rounded-sm"
                  data-testid="deal-discounted-price-input"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider font-semibold">Image URL</Label>
              <Input
                value={currentDeal.image_url}
                onChange={(e) => setCurrentDeal({ ...currentDeal, image_url: e.target.value })}
                className="mt-2 rounded-sm"
                placeholder="https://..."
                data-testid="deal-image-url-input"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider font-semibold">Affiliate Link</Label>
              <Input
                value={currentDeal.affiliate_link}
                onChange={(e) => setCurrentDeal({ ...currentDeal, affiliate_link: e.target.value })}
                className="mt-2 rounded-sm"
                placeholder="https://..."
                data-testid="deal-affiliate-link-input"
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
              data-testid="save-deal-btn"
            >
              {editMode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminDeals;
