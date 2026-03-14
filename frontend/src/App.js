import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from '@/components/ui/sonner';
import { HelmetProvider } from 'react-helmet-async';
import HomeEnhanced from '@/pages/HomeEnhanced';
import DiscoveryPage from '@/pages/DiscoveryPage';
import AdminLogin from '@/pages/AdminLogin';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminCategories from '@/pages/AdminCategories';
import AdminDeals from '@/pages/AdminDeals';
import AdminSettings from '@/pages/AdminSettings';
import { ThemeProvider } from '@/contexts/ThemeContext';
import '@/App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const axiosInstance = axios.create({
  baseURL: API,
});

// Add token to requests
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        await axiosInstance.get('/auth/verify');
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('admin_token');
        setIsAuthenticated(false);
      }
    };

    verifyAuth();
  }, []);

  if (isAuthenticated === null) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/admin/login" />;
};

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <div className="App">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomeEnhanced />} />
              <Route path="/deals/:slug" element={<DiscoveryPage />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/categories"
                element={
                  <ProtectedRoute>
                    <AdminCategories />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/deals"
                element={
                  <ProtectedRoute>
                    <AdminDeals />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute>
                    <AdminSettings />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
          <Toaster position="top-right" />
        </div>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
