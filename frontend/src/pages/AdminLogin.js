import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '@/App';
import { toast } from 'sonner';
import { Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, credentials);
      localStorage.setItem('admin_token', response.data.access_token);
      toast.success('Login successful!');
      navigate('/admin/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="border rounded-none bg-card p-8">
          <h1 className="text-3xl font-black text-center mb-2" data-testid="admin-login-title">
            ADMIN LOGIN
          </h1>
          <p className="text-center text-muted-foreground text-sm mb-8">Offer Me He Lelo! Dashboard</p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Label htmlFor="username" className="text-xs uppercase tracking-wider font-semibold">
                Username
              </Label>
              <div className="relative mt-2">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  className="pl-10 rounded-sm"
                  placeholder="Enter username"
                  required
                  data-testid="username-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-xs uppercase tracking-wider font-semibold">
                Password
              </Label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="pl-10 rounded-sm"
                  placeholder="Enter password"
                  required
                  data-testid="password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full rounded-sm uppercase tracking-wide font-bold"
              disabled={loading}
              data-testid="login-submit-btn"
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          

          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="w-full mt-4"
            data-testid="back-to-home-btn"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
