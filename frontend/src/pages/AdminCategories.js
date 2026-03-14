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

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentCategory, setCurrentCategory] = useState({ name: '', icon: '' });
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/admin/categories');
      setCategories(response.data);
    } catch (error) {
      toast.error('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (category = null) => {
    if (category) {
      setEditMode(true);
      setCurrentCategory({ name: category.name, icon: category.icon || '' });
      setSelectedId(category.id);
    } else {
      setEditMode(false);
      setCurrentCategory({ name: '', icon: '' });
      setSelectedId(null);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editMode) {
        await axiosInstance.put(`/admin/categories/${selectedId}`, currentCategory);
        toast.success('Category updated successfully');
      } else {
        await axiosInstance.post('/admin/categories', currentCategory);
        toast.success('Category created successfully');
      }
      setDialogOpen(false);
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save category');
    }
  };

  const handleToggleActive = async (id, isActive) => {
    try {
      await axiosInstance.put(`/admin/categories/${id}`, { is_active: !isActive });
      toast.success(`Category ${!isActive ? 'activated' : 'deactivated'}`);
      fetchCategories();
    } catch (error) {
      toast.error('Failed to update category');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      await axiosInstance.delete(`/admin/categories/${id}`);
      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete category');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6" data-testid="admin-categories">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black">Categories</h1>
            <p className="text-muted-foreground mt-1">Manage product categories</p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="rounded-sm uppercase tracking-wide font-bold"
            data-testid="add-category-btn"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Category
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
                  <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold">Slug</th>
                  <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold">Icon</th>
                  <th className="text-left p-3 text-xs uppercase tracking-wider font-semibold">Status</th>
                  <th className="text-right p-3 text-xs uppercase tracking-wider font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="border-b" data-testid={`category-row-${category.id}`}>
                    <td className="p-3 font-medium">{category.name}</td>
                    <td className="p-3 text-sm text-muted-foreground">{category.slug}</td>
                    <td className="p-3 text-sm">{category.icon}</td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold uppercase ${
                          category.is_active
                            ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                            : 'bg-red-500/20 text-red-700 dark:text-red-400'
                        }`}
                      >
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(category.id, category.is_active)}
                          data-testid={`toggle-category-${category.id}`}
                        >
                          {category.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(category)}
                          data-testid={`edit-category-${category.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(category.id)}
                          data-testid={`delete-category-${category.id}`}
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
              {editMode ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="category-name" className="text-xs uppercase tracking-wider font-semibold">
                Category Name
              </Label>
              <Input
                id="category-name"
                value={currentCategory.name}
                onChange={(e) => setCurrentCategory({ ...currentCategory, name: e.target.value })}
                className="mt-2 rounded-sm"
                placeholder="e.g., Electronics"
                data-testid="category-name-input"
              />
            </div>
            <div>
              <Label htmlFor="category-icon" className="text-xs uppercase tracking-wider font-semibold">
                Icon Name (Lucide React)
              </Label>
              <Input
                id="category-icon"
                value={currentCategory.icon}
                onChange={(e) => setCurrentCategory({ ...currentCategory, icon: e.target.value })}
                className="mt-2 rounded-sm"
                placeholder="e.g., Cpu, Smartphone"
                data-testid="category-icon-input"
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
              data-testid="save-category-btn"
            >
              {editMode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCategories;
