import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/App';
import AdminLayout from '@/components/AdminLayout';
import { toast } from 'sonner';
import { Plus, Trash2, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AdminBanners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const defaultBanner = { name: '', platform: '', image_url: '', affiliate_link: '' };
  const [currentBanner, setCurrentBanner] = useState(defaultBanner);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/admin/banners');
      setBanners(response.data);
    } catch (error) { 
      toast.error('Failed to fetch banners'); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleOpenDialog = () => {
    setCurrentBanner(defaultBanner);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentBanner.name || !currentBanner.platform || !currentBanner.image_url || !currentBanner.affiliate_link) {
      toast.error('All fields are required.');
      return;
    }

    try {
      await axiosInstance.post('/admin/banners', currentBanner);
      toast.success('Banner created successfully!');
      setDialogOpen(false);
      fetchBanners();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Backend error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
    try {
      await axiosInstance.delete(`/admin/banners/${id}`);
      toast.success('Banner deleted successfully');
      fetchBanners();
    } catch (error) { 
      toast.error('Failed to delete banner'); 
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black">Promotional Banners</h1>
            <p className="text-muted-foreground mt-1">Manage the moving affiliate banners on the homepage</p>
          </div>
          <Button onClick={handleOpenDialog} className="rounded-sm uppercase tracking-wide font-bold">
            <Plus className="h-4 w-4 mr-2" /> Add Banner
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-20"><div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div></div>
        ) : (
          <div className="border rounded-none bg-card overflow-x-auto">
            <table className="w-full admin-table">
              <thead>
                <tr className="border-b bg-secondary/50">
                  <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold w-32">Preview</th>
                  <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold">Name & Platform</th>
                  <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold">Affiliate Link</th>
                  <th className="text-right p-3 text-xs uppercase tracking-wider font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {banners.length === 0 && (
                  <tr><td colSpan="4" className="p-8 text-center text-muted-foreground">No banners found. Add one above!</td></tr>
                )}
                {banners.map((banner) => (
                  <tr key={banner.id} className="border-b">
                    <td className="p-3">
                      <div className="w-24 h-10 bg-secondary rounded overflow-hidden border">
                        <img src={banner.image_url} alt="preview" className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold">{banner.name}</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">{banner.platform}</div>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground max-w-[200px] truncate" title={banner.affiliate_link}>
                      <a href={banner.affiliate_link} target="_blank" rel="noreferrer" className="flex items-center hover:text-accent">
                        {banner.affiliate_link} <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(banner.id)} title="Delete Banner">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
            <DialogTitle className="font-black text-2xl">Add Promo Banner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs uppercase tracking-wider font-semibold">Internal Name</Label>
              <Input value={currentBanner.name} onChange={(e) => setCurrentBanner({ ...currentBanner, name: e.target.value })} className="mt-2 rounded-sm" placeholder="e.g. Amazon Great Indian Festival" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider font-semibold">Platform Display Name</Label>
              <Input value={currentBanner.platform} onChange={(e) => setCurrentBanner({ ...currentBanner, platform: e.target.value })} className="mt-2 rounded-sm" placeholder="e.g. Amazon" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider font-semibold flex items-center gap-2">
                <ImageIcon className="h-3 w-3" /> Image URL
              </Label>
              <Input value={currentBanner.image_url} onChange={(e) => setCurrentBanner({ ...currentBanner, image_url: e.target.value })} className="mt-2 rounded-sm" placeholder="https://..." />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider font-semibold flex items-center gap-2">
                <ExternalLink className="h-3 w-3" /> Affiliate Link
              </Label>
              <Input value={currentBanner.affiliate_link} onChange={(e) => setCurrentBanner({ ...currentBanner, affiliate_link: e.target.value })} className="mt-2 rounded-sm" placeholder="https://..." />
            </div>
            
            {currentBanner.image_url && (
              <div className="mt-4 p-2 border rounded-sm bg-secondary/30">
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Live Preview</p>
                <img src={currentBanner.image_url} alt="Preview" className="w-full h-auto rounded shadow-sm" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-sm">Cancel</Button>
            <Button onClick={handleSave} className="rounded-sm uppercase tracking-wide font-bold">Create Banner</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminBanners;