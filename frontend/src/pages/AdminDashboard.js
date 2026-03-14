import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/App';
import AdminLayout from '@/components/AdminLayout';
import { Package, Tag, TrendingUp, Clock } from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalCategories: 0,
    totalDeals: 0,
    activeDeals: 0,
    platforms: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [categoriesRes, dealsRes, settingsRes] = await Promise.all([
        axiosInstance.get('/admin/categories'),
        axiosInstance.get('/admin/deals'),
        axiosInstance.get('/admin/settings'),
      ]);

      setStats({
        totalCategories: categoriesRes.data.length,
        totalDeals: dealsRes.data.length,
        activeDeals: dealsRes.data.filter((d) => d.is_active).length,
        platforms: settingsRes.data.filter((s) => s.is_active).length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const statCards = [
    { label: 'Total Categories', value: stats.totalCategories, icon: Package, color: 'text-blue-500' },
    { label: 'Total Deals', value: stats.totalDeals, icon: Tag, color: 'text-green-500' },
    { label: 'Active Deals', value: stats.activeDeals, icon: TrendingUp, color: 'text-accent' },
    { label: 'Active Platforms', value: stats.platforms, icon: Clock, color: 'text-purple-500' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6" data-testid="admin-dashboard">
        <div>
          <h1 className="text-3xl font-black">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your affiliate deals platform</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="border rounded-none bg-card p-6"
                data-testid={`stat-card-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <Icon className={`h-8 w-8 ${stat.color}`} />
                </div>
                <div className="text-3xl font-black mb-1">{stat.value}</div>
                <div className="text-sm uppercase tracking-wider text-muted-foreground">{stat.label}</div>
              </div>
            );
          })}
        </div>

        <div className="border rounded-none bg-card p-6">
          <h2 className="text-xl font-bold mb-4">System Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm uppercase tracking-wider">Scheduler Status</span>
              <span className="text-sm font-semibold text-green-500">Active (Hourly)</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm uppercase tracking-wider">Database Connection</span>
              <span className="text-sm font-semibold text-green-500">Connected</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm uppercase tracking-wider">API Status</span>
              <span className="text-sm font-semibold text-green-500">Operational</span>
            </div>
          </div>
        </div>

        <div className="border rounded-none bg-secondary/20 p-6">
          <h3 className="font-bold mb-2">Getting Started</h3>
          <ul className="space-y-2 text-sm">
            <li>• Configure affiliate API credentials in Settings</li>
            <li>• Add or manage product categories</li>
            <li>• The system will automatically fetch deals every hour</li>
            <li>• Monitor and manage deals from the Deals page</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
