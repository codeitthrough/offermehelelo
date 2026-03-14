import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/App';
import AdminLayout from '@/components/AdminLayout';
import { toast } from 'sonner';
import { Save, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

const AdminSettings = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSecrets, setShowSecrets] = useState({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/admin/settings');
      setSettings(response.data);
    } catch (error) {
      toast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id, data) => {
    try {
      await axiosInstance.put(`/admin/settings/${id}`, data);
      toast.success('Settings updated successfully');
      fetchSettings();
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const handleToggleSecret = (id) => {
    setShowSecrets({ ...showSecrets, [id]: !showSecrets[id] });
  };

  return (
    <AdminLayout>
      <div className="space-y-6" data-testid="admin-settings">
        <div>
          <h1 className="text-3xl font-black">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure affiliate platform API credentials</p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {settings.map((setting) => (
              <div key={setting.id} className="border rounded-none bg-card p-6" data-testid={`setting-${setting.platform.toLowerCase()}`}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold">{setting.platform}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configure API credentials for {setting.platform}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 text-xs font-semibold uppercase rounded-sm ${
                        setting.is_active
                          ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                          : 'bg-red-500/20 text-red-700 dark:text-red-400'
                      }`}
                    >
                      {setting.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-xs uppercase tracking-wider font-semibold">API Key</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        type={showSecrets[setting.id] ? 'text' : 'password'}
                        defaultValue={setting.api_key || ''}
                        placeholder="Enter API Key"
                        className="rounded-sm"
                        id={`api-key-${setting.id}`}
                        data-testid={`api-key-input-${setting.platform.toLowerCase()}`}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleToggleSecret(setting.id)}
                        className="rounded-sm"
                      >
                        {showSecrets[setting.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs uppercase tracking-wider font-semibold">API Secret</Label>
                    <Input
                      type={showSecrets[setting.id] ? 'text' : 'password'}
                      defaultValue={setting.api_secret || ''}
                      placeholder="Enter API Secret"
                      className="mt-2 rounded-sm"
                      id={`api-secret-${setting.id}`}
                      data-testid={`api-secret-input-${setting.platform.toLowerCase()}`}
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={setting.is_active}
                        onChange={(e) => handleUpdate(setting.id, { is_active: e.target.checked })}
                        className="w-4 h-4"
                        data-testid={`is-active-checkbox-${setting.platform.toLowerCase()}`}
                      />
                      <span className="text-sm font-medium">Enable automatic deal fetching</span>
                    </label>
                  </div>

                  {setting.last_fetched_at && (
                    <p className="text-xs text-muted-foreground">
                      Last fetched: {format(new Date(setting.last_fetched_at), 'PPpp')}
                    </p>
                  )}

                  <Button
                    onClick={() => {
                      const apiKey = document.getElementById(`api-key-${setting.id}`).value;
                      const apiSecret = document.getElementById(`api-secret-${setting.id}`).value;
                      handleUpdate(setting.id, {
                        api_key: apiKey || null,
                        api_secret: apiSecret || null,
                      });
                    }}
                    className="rounded-sm uppercase tracking-wide font-bold"
                    data-testid={`save-settings-${setting.platform.toLowerCase()}`}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Credentials
                  </Button>
                </div>
              </div>
            ))}

            <div className="border rounded-none bg-secondary/20 p-6">
              <h3 className="font-bold mb-3">Integration Guide</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="font-semibold">Amazon Associates:</h4>
                  <p className="text-muted-foreground">Sign up at affiliate-program.amazon.com and get your API credentials from the Product Advertising API section.</p>
                </div>
                <div>
                  <h4 className="font-semibold">Flipkart Affiliate:</h4>
                  <p className="text-muted-foreground">Register at affiliate.flipkart.com and access API keys from your dashboard.</p>
                </div>
                <div>
                  <h4 className="font-semibold">EarnKaro:</h4>
                  <p className="text-muted-foreground">Create account at earnkaro.com and obtain API credentials from the developer section.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
