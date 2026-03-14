import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/App';
import AdminLayout from '@/components/AdminLayout';
import { toast } from 'sonner';
import { Package, Tag, TrendingUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalCategories: 0,
    totalDeals: 0,
    activeDeals: 0,
    platforms: 0,
  });
  const [scraperStats, setScraperStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchScraperStats();
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

  const fetchScraperStats = async () => {
    try {
      const response = await axiosInstance.get('/admin/scraper/stats');
      setScraperStats(response.data);
    } catch (error) {
      console.error('Error fetching scraper stats:', error);
    }
  };

  const handleManualScrape = async () => {
    try {
      setLoading(true);
      await axiosInstance.post('/admin/scraper/run');
      toast.success('Scraper started! Check back in a few minutes for new deals.');
      setTimeout(() => {
        fetchStats();
        fetchScraperStats();
      }, 3000);
    } catch (error) {
      toast.error('Failed to start scraper');
    } finally {
      setLoading(false);
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Scraper Status</h2>
            <Button
              onClick={handleManualScrape}
              disabled={loading}
              className="rounded-sm uppercase tracking-wide font-bold"
              data-testid="manual-scrape-btn"
            >
              {loading ? 'Running...' : 'Run Now'}
            </Button>
          </div>
          <div className="space-y-3">
            {scraperStats?.last_run ? (
              <>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm uppercase tracking-wider">Last Run</span>
                  <span className="text-sm font-semibold">
                    {new Date(scraperStats.last_run).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm uppercase tracking-wider">Deals Scraped</span>
                  <span className="text-sm font-semibold text-blue-500">
                    {(scraperStats.stats?.amazon?.scraped || 0) + (scraperStats.stats?.flipkart?.scraped || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm uppercase tracking-wider">Deals Inserted</span>
                  <span className="text-sm font-semibold text-green-500">
                    {scraperStats.stats?.processing?.inserted || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm uppercase tracking-wider">Duplicates Skipped</span>
                  <span className="text-sm font-semibold text-yellow-500">
                    {scraperStats.stats?.processing?.duplicates || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm uppercase tracking-wider">Duration</span>
                  <span className="text-sm font-semibold">
                    {scraperStats.stats?.duration_seconds?.toFixed(1) || 0}s
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No scraper runs yet. Click &quot;Run Now&quot; to start.
              </div>
            )}
          </div>
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
