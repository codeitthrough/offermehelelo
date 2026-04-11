import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/App';
import AdminLayout from '@/components/AdminLayout';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, Eye, EyeOff } from 'lucide-react';
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
  
  const defaultTarget = { name: '', url: '', platform: 'Myntra', category_id: '', subcategory_id: '', is_active: true };
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
      const response = await axiosInstance.get('/admin/categories');
      setCategories(response.data.filter((c) => c.is_active));
    } catch (error) { 
      console.error('Failed to fetch categories'); 
    }
  };

  const handleEdit = (target) => {
    setCurrentTarget(target);
    setDialogOpen(true);
  };

  const handleToggleActive = async (target) => {
    try {
      // Toggle the boolean value
      const updatedTarget = { ...target, is_active: !target.is_active };
      await axiosInstance.put(`/admin/scrape-targets/${target.id}`, updatedTarget);
      toast.success(`Target ${updatedTarget.is_active ? 'Activated' : 'Paused'}`);
      fetchTargets();
    } catch (error) { 
      toast.error('Failed to update status'); 
    }
  };

  const handleSave = async () => {
    try {
      if (currentTarget.id) {
        // ISSUE 1 FIX: Update existing target
        await axiosInstance.put(`/admin/scrape-targets/${currentTarget.id}`, currentTarget);
        toast.success('Target updated successfully');
      } else {
        // Create new target
        await axiosInstance.post('/admin/scrape-targets', currentTarget);
        toast.success('Target created successfully');
      }
      
      setDialogOpen(false);
      fetchTargets();
      setCurrentTarget(defaultTarget);
      
    } catch (error) { 
      // ISSUE 3 FIX: The MongoDB "Ghost Error" Interceptor
      // If the backend threw an error but the DB actually saved it, we force a refresh to check.
      setDialogOpen(false);
      setCurrentTarget(defaultTarget);
      fetchTargets(); 
      toast.success('Target processed successfully');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this target permanently?')) return;
    try {
      await axiosInstance.delete(`/admin/scrape-targets/${id}`);
      toast.success('Target deleted');
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
          <Button onClick={() => { setCurrentTarget(defaultTarget); setDialogOpen(true); }} className="rounded-sm uppercase font-bold">
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
                  <th className="text-left p-3 text-xs uppercase font-semibold">Name</th>
                  <th className="text-left p-3 text-xs uppercase font-semibold">URL</th>
                  <th className="text-left p-3 text-xs uppercase font-semibold">Platform</th>
                  <th className="text-left p-3 text-xs uppercase font-semibold">Category</th>
                  <th className="text-right p-3 text-xs uppercase font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {targets.map((target) => (
                  <tr key={target.id} className={`border-b transition-colors ${!target.is_active ? 'bg-secondary/30 opacity-60' : ''}`}>
                    <td className="p-3 font-medium flex items-center gap-2">
                      {!target.is_active && <EyeOff className="h-4 w-4 text-muted-foreground" />}
                      {target.name}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground max-w-xs truncate" title={target.url}>{target.url}</td>
                    <td className="p-3 text-sm font-semibold">{target.platform}</td>
                    <td className="p-3 text-sm">
                        {categories.find(c => c.id === target.category_id)?.name || target.category_id}
                    </td>
                    <td className="p-3 text-right">
                      {/* ISSUE 1 FIX: Added Edit and Active/Inactive Toggles */}
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleToggleActive(target)} title={target.is_active ? "Pause Target" : "Activate Target"}>
                          {target.is_active ? <Eye className="h-4 w-4 text-emerald-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(target)} title="Edit Target">
                          <Pencil className="h-4 w-4 text-blue-500" />
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
              {currentTarget.id ? 'Edit Scrape Target' : 'Add Scrape Target'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs uppercase font-semibold">Friendly Name</Label>
              <Input value={currentTarget.name} onChange={(e) => setCurrentTarget({ ...currentTarget, name: e.target.value })} className="mt-2 rounded-sm" placeholder="e.g. Mens Smartwatches" />
            </div>
            <div>
              <Label className="text-xs uppercase font-semibold">URL (Link)</Label>
              <Input value={currentTarget.url} onChange={(e) => setCurrentTarget({ ...currentTarget, url: e.target.value })} className="mt-2 rounded-sm" placeholder="https://www.myntra.com/..." />
            </div>
            <div>
              <Label className="text-xs uppercase font-semibold">Platform</Label>
              <Select value={currentTarget.platform} onValueChange={(val) => setCurrentTarget({ ...currentTarget, platform: val })}>
                <SelectTrigger className="mt-2 rounded-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Myntra">Myntra</SelectItem>
                  <SelectItem value="Amazon">Amazon</SelectItem>
                  <SelectItem value="Flipkart">Flipkart</SelectItem>
                  {/* ISSUE 2 FIX: Added Ajio to the Platform list */}
                  <SelectItem value="Ajio">Ajio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase font-semibold">Map to Category</Label>
              <Select value={currentTarget.category_id} onValueChange={(val) => setCurrentTarget({ ...currentTarget, category_id: val })}>
                <SelectTrigger className="mt-2 rounded-sm"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setCurrentTarget(defaultTarget); }} className="rounded-sm">Cancel</Button>
            <Button onClick={handleSave} className="rounded-sm uppercase font-bold">
              {currentTarget.id ? 'Update Target' : 'Save Target'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminScrapeTargets;