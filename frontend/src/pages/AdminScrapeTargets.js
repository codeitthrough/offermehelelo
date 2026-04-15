import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/App';
import AdminLayout from '@/components/AdminLayout';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AdminScrapeTargets = () => {
  const [targets, setTargets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  
  const defaultTarget = { name: '', url: '', platform: 'Myntra', category_id: 'unselected', is_active: true };
  const [currentTarget, setCurrentTarget] = useState(defaultTarget);

  useEffect(() => {
    fetchTargets();
    fetchCategories();
  }, []);

  const fetchTargets = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/admin/scrape-targets');
      setTargets(response.data);
    } catch (error) { 
      toast.error('Failed to fetch targets'); 
    } finally { 
      setLoading(false); 
    }
  };

  const fetchCategories = async () => {
    try {
      // Use the public route to guarantee it bypasses any stale admin tokens
      const response = await axiosInstance.get('/categories');
      setCategories(response.data);
    } catch (error) { 
      toast.error('Failed to load categories dropdown');
      console.error(error);
    }
  };

  const handleOpenDialog = (target = null) => {
    if (target) {
      setEditMode(true);
      setCurrentTarget({
        name: target.name,
        url: target.url,
        platform: target.platform,
        category_id: target.category_id || 'unselected',
        is_active: target.is_active !== false
      });
      setSelectedId(target.id);
    } else {
      setEditMode(false);
      setCurrentTarget(defaultTarget);
      setSelectedId(null);
    }
    setDialogOpen(true);
  };

  const handleToggleActive = async (target) => {
    try {
      const newStatus = target.is_active === false ? true : false;
      await axiosInstance.put(`/admin/scrape-targets/${target.id}`, { ...target, is_active: newStatus });
      toast.success(`Target ${newStatus ? 'activated' : 'deactivated'}`);
      fetchTargets();
    } catch (error) { 
      toast.error(error.response?.data?.detail || 'Backend error'); 
    }
  };

  const handleSave = async () => {
    if (currentTarget.category_id === 'unselected') {
      toast.error('Please map a category to this target.');
      return;
    }

    try {
      if (editMode) {
        await axiosInstance.put(`/admin/scrape-targets/${selectedId}`, currentTarget);
        toast.success('Target updated successfully');
      } else {
        await axiosInstance.post('/admin/scrape-targets', currentTarget);
        toast.success('Target created successfully');
      }
      setDialogOpen(false);
      fetchTargets();
    } catch (error) {
      // Exposes network/CORS errors directly on screen
      toast.error(error.message + " - " + (error.response?.data?.detail || 'Unknown Error'));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this target?')) return;
    try {
      await axiosInstance.delete(`/admin/scrape-targets/${id}`);
      toast.success('Target deleted successfully');
      fetchTargets();
    } catch (error) { 
      toast.error('Failed to delete target'); 
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black">Scraper Targets</h1>
            <p className="text-muted-foreground mt-1">Manage masterlist of automated links</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="rounded-sm uppercase tracking-wide font-bold">
            <Plus className="h-4 w-4 mr-2" /> Add Target
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-20"><div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div></div>
        ) : (
          <div className="border rounded-none bg-card overflow-x-auto">
            <table className="w-full admin-table">
              <thead>
                <tr className="border-b bg-secondary/50">
                  <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold">Name</th>
                  <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold">URL</th>
                  <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold">Platform</th>
                  <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold">Category</th>
                  <th className="text-center p-3 text-xs uppercase tracking-wider font-semibold">Status</th>
                  <th className="text-right p-3 text-xs uppercase tracking-wider font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {targets.map((target) => (
                  <tr key={target.id} className="border-b">
                    <td className="p-3 font-medium">{target.name}</td>
                    <td className="p-3 text-sm text-muted-foreground max-w-xs truncate" title={target.url}>{target.url}</td>
                    <td className="p-3 text-sm">{target.platform}</td>
                    <td className="p-3 text-sm text-muted-foreground">
                        {categories.find(c => c.id === target.category_id)?.name || `ID: ${target.category_id}`}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2 py-1 text-xs font-semibold uppercase ${
                          target.is_active !== false
                            ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                            : 'bg-red-500/20 text-red-700 dark:text-red-400'
                        }`}>
                        {target.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleToggleActive(target)} title="Toggle Status">
                          {target.is_active !== false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(target)} title="Edit Target">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(target.id)} title="Delete Target">
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
              {editMode ? 'Edit Scrape Target' : 'Add Scrape Target'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs uppercase tracking-wider font-semibold">Friendly Name</Label>
              <Input value={currentTarget.name} onChange={(e) => setCurrentTarget({ ...currentTarget, name: e.target.value })} className="mt-2 rounded-sm" placeholder="e.g. Mens Smartwatches" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider font-semibold">URL (Link)</Label>
              <Input value={currentTarget.url} onChange={(e) => setCurrentTarget({ ...currentTarget, url: e.target.value })} className="mt-2 rounded-sm" placeholder="https://www.myntra.com/..." />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider font-semibold">Platform</Label>
              <Select value={currentTarget.platform} onValueChange={(val) => setCurrentTarget({ ...currentTarget, platform: val })}>
                <SelectTrigger className="mt-2 rounded-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Myntra">Myntra</SelectItem>
                  <SelectItem value="Amazon">Amazon</SelectItem>
                  <SelectItem value="Flipkart">Flipkart</SelectItem>
                  <SelectItem value="Ajio">Ajio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider font-semibold">Map to Category</Label>
              <Select 
                value={currentTarget.category_id || undefined} 
                onValueChange={(val) => setCurrentTarget({ ...currentTarget, category_id: val })}
              >
                <SelectTrigger className="mt-2 rounded-sm">
                  <SelectValue placeholder={categories.length === 0 ? "Loading..." : "Select category"} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-sm">Cancel</Button>
            <Button onClick={handleSave} className="rounded-sm uppercase tracking-wide font-bold">
              {editMode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminScrapeTargets;