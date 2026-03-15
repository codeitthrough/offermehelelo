import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/App';
import AdminLayout from '@/components/AdminLayout';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
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

const AdminPlatforms = () => {
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentPlatform, setCurrentPlatform] = useState({
    name: '',
    image_url: '',
    affiliate_link: '',
    offer_percentage: 0,
  });
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const fetchPlatforms = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/admin/platforms');
      setPlatforms(response.data);
    } catch (error) {
      toast.error('Failed to fetch platforms');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (platform = null) => {
    if (platform) {
      setEditMode(true);
      setCurrentPlatform({
        name: platform.name,
        image_url: platform.image_url || '',
        affiliate_link: platform.affiliate_link,
        offer_percentage: platform.offer_percentage || 0,
      });
      setSelectedId(platform.id);
    } else {
      setEditMode(false);
      setCurrentPlatform({
        name: '',
        image_url: '',
        affiliate_link: '',
        offer_percentage: 0,
      });
      setSelectedId(null);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editMode) {
        await axiosInstance.put(`/admin/platforms/${selectedId}`, currentPlatform);
        toast.success('Platform updated successfully');
      } else {
        await axiosInstance.post('/admin/platforms', currentPlatform);
        toast.success('Platform created successfully');
      }
      setDialogOpen(false);
      fetchPlatforms();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save platform');
    }
  };

  const handleToggleActive = async (id, isActive) => {
    try {
      await axiosInstance.put(`/admin/platforms/${id}`, { is_active: !isActive });
      toast.success(`Platform ${!isActive ? 'activated' : 'deactivated'}`);
      fetchPlatforms();
    } catch (error) {
      toast.error('Failed to update platform');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this platform?')) return;

    try {
      await axiosInstance.delete(`/admin/platforms/${id}`);
      toast.success('Platform deleted successfully');
      fetchPlatforms();
    } catch (error) {
      toast.error('Failed to delete platform');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6" data-testid="admin-platforms">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black">Platforms</h1>
            <p className="text-muted-foreground mt-1">Manage affiliate platforms</p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="rounded-sm uppercase tracking-wide font-bold"
            data-testid="add-platform-btn"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Platform
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          </div>
        ) : (
          <div className="border rounded-none bg-card overflow-hidden">
            <table className="w-full admin-table">
              <thead>
                <tr className="border-b bg-secondary/50">
                  <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold">Name</th>
                  <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold">Image</th>
                  <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold">Offer %</th>
                  <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold">Status</th>
                  <th className="text-right p-3 text-xs uppercase tracking-wider font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {platforms.map((platform) => (
                  <tr key={platform.id} className="border-b" data-testid={`platform-row-${platform.id}`}>
                    <td className="p-3 font-medium">{platform.name}</td>
                    <td className="p-3">
                      {platform.image_url && (
                        <img src={platform.image_url} alt={platform.name} className="h-8 w-8 object-contain" />
                      )}
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-accent">{platform.offer_percentage}%</span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold uppercase ${
                          platform.is_active
                            ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                            : 'bg-red-500/20 text-red-700 dark:text-red-400'
                        }`}
                      >
                        {platform.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(platform.id, platform.is_active)}
                          data-testid={`toggle-platform-${platform.id}`}
                        >
                          {platform.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(platform)}
                          data-testid={`edit-platform-${platform.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(platform.id)}
                          data-testid={`delete-platform-${platform.id}`}
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
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle className="font-black text-2xl">
              {editMode ? 'Edit Platform' : 'Add Platform'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs uppercase tracking-wider font-semibold">Platform Name</Label>
              <Input
                value={currentPlatform.name}
                onChange={(e) => setCurrentPlatform({ ...currentPlatform, name: e.target.value })}
                className="mt-2 rounded-sm"
                placeholder="e.g., Amazon"
                data-testid="platform-name-input"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider font-semibold">Image URL</Label>
              <Input
                value={currentPlatform.image_url}
                onChange={(e) => setCurrentPlatform({ ...currentPlatform, image_url: e.target.value })}
                className="mt-2 rounded-sm"
                placeholder="https://..."
                data-testid="platform-image-input"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider font-semibold">Affiliate Link</Label>
              <Input
                value={currentPlatform.affiliate_link}
                onChange={(e) => setCurrentPlatform({ ...currentPlatform, affiliate_link: e.target.value })}
                className="mt-2 rounded-sm"
                placeholder="https://..."
                data-testid="platform-link-input"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider font-semibold">Max Offer %</Label>
              <Input
                type="number"
                value={currentPlatform.offer_percentage}
                onChange={(e) => setCurrentPlatform({ ...currentPlatform, offer_percentage: parseInt(e.target.value) || 0 })}
                className="mt-2 rounded-sm"
                placeholder="50"
                data-testid="platform-offer-input"
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
              data-testid="save-platform-btn"
            >
              {editMode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminPlatforms;