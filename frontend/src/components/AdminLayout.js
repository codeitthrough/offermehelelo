import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Package, Tag, Settings, LogOut, Moon, Sun, Home, Upload, Store, Cog, MessageSquare, Link2 } from 'lucide-react';
import { toast } from 'sonner';

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    toast.success('Logged out successfully');
    navigate('/admin/login');
  };

  const menuItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/categories', icon: Package, label: 'Categories' },
    { path: '/admin/deals', icon: Tag, label: 'Deals' },
    { path: '/admin/browse-links', icon: Link2, label: 'Browse Links' },
    { path: '/admin/bulk-upload', icon: Upload, label: 'Bulk Upload' },
    { path: '/admin/platforms', icon: Store, label: 'Platforms' },
    { path: '/admin/scraper-settings', icon: Cog, label: 'Scraper' },
    { path: '/admin/suggestions', icon: MessageSquare, label: 'Suggestions' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col" data-testid="admin-sidebar">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-black tracking-tight">OFFER ME HE LELO!</h1>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Admin Panel</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-semibold uppercase tracking-wider transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-secondary text-foreground'
                }`}
                data-testid={`menu-${item.label.toLowerCase()}`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start rounded-sm"
            onClick={() => navigate('/')}
            data-testid="view-site-btn"
          >
            <Home className="h-4 w-4 mr-2" />
            View Site
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start rounded-sm"
            onClick={toggleTheme}
            data-testid="admin-theme-toggle"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </Button>
          <Button
            variant="destructive"
            className="w-full justify-start rounded-sm uppercase tracking-wider font-bold"
            onClick={handleLogout}
            data-testid="logout-btn"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto p-8">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;
