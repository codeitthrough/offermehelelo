import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/App';
import AdminLayout from '@/components/AdminLayout';
import { toast } from 'sonner';
import { Power, PowerOff, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const AdminScraperSettings = () => {
  const [settings, setSettings] = useState({ scraper_enabled: true, scraper_interval: 'hourly' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/admin/scraper-settings');
      setSettings(response.data);
    } catch (error) {
      toast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await axiosInstance.put('/admin/scraper-settings', settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleManualRun = async () => {
    try {
      await axiosInstance.post('/admin/scraper/run');
      toast.success('Scraper started! Check stats in a few minutes.');
    } catch (error) {
      toast.error('Failed to start scraper');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-20">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6" data-testid="admin-scraper-settings">
        <div>
          <h1 className="text-3xl font-black">Scraper Settings</h1>
          <p className="text-muted-foreground mt-1">Configure automated deal scraping</p>
        </div>

        <Card className="p-6 border rounded-none">
          <h3 className="font-bold mb-6">Scheduler Configuration</h3>

          <div className="space-y-6">
            {/* Enable/Disable Scraper */}
            <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-none">
              <div>
                <h4 className="font-semibold mb-1">Enable Scheduler</h4>
                <p className="text-sm text-muted-foreground">
                  Automatically run scraper based on interval
                </p>
              </div>
              <Button
                onClick={() => setSettings({ ...settings, scraper_enabled: !settings.scraper_enabled })}
                variant={settings.scraper_enabled ? 'default' : 'outline'}
                className="rounded-sm"
                data-testid="toggle-scraper"
              >
                {settings.scraper_enabled ? (
                  <>
                    <Power className="h-4 w-4 mr-2" />
                    Enabled
                  </>
                ) : (
                  <>
                    <PowerOff className="h-4 w-4 mr-2" />
                    Disabled
                  </>
                )}
              </Button>
            </div>

            {/* Interval Selection */}
            <div>
              <label className="font-semibold mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Scraper Interval
              </label>
              <Select
                value={settings.scraper_interval}
                onValueChange={(val) => setSettings({ ...settings, scraper_interval: val })}
                disabled={!settings.scraper_enabled}
              >
                <SelectTrigger className="rounded-sm" data-testid="interval-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Every Hour</SelectItem>
                  <SelectItem value="daily">Once Daily</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                {settings.scraper_interval === 'hourly'
                  ? 'Scraper will run automatically every hour'
                  : 'Scraper will run once per day at midnight'}
              </p>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-sm uppercase tracking-wide font-bold"
              data-testid="save-settings-btn"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </Card>

        <Card className="p-6 border rounded-none">
          <h3 className="font-bold mb-4">Manual Controls</h3>
          <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-none">
            <div>
              <h4 className="font-semibold mb-1">Run Scraper Now</h4>
              <p className="text-sm text-muted-foreground">
                Trigger scraper immediately regardless of schedule
              </p>
            </div>
            <Button
              onClick={handleManualRun}
              variant="outline"
              className="rounded-sm uppercase tracking-wide font-bold"
              data-testid="manual-run-btn"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Run Now
            </Button>
          </div>
        </Card>

        <Card className="p-6 border rounded-none bg-secondary/20">
          <h3 className="font-bold mb-2">How it Works</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• When enabled, scraper automatically fetches deals from Amazon and Flipkart</li>
            <li>• Deals are validated (minimum 30% discount required)</li>
            <li>• Duplicate deals are automatically skipped</li>
            <li>• Product URLs are converted to EarnKaro affiliate links</li>
            <li>• Deal scoring and price history tracking are applied automatically</li>
            <li>• Check Dashboard for latest scraper statistics</li>
          </ul>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminScraperSettings;