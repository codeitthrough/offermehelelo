import React, { useState, useEffect } from 'react';
import { axiosInstance } from '@/App';
import AdminLayout from '@/components/AdminLayout';
import { toast } from 'sonner';
import { MessageSquare, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';

const AdminSuggestions = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/admin/suggestions');
      setSuggestions(response.data);
    } catch (error) {
      toast.error('Failed to fetch suggestions');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axiosInstance.put(`/admin/suggestions/${id}?status=${status}`);
      toast.success('Status updated');
      fetchSuggestions();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-700 dark:text-green-400';
      case 'in-progress':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
      case 'rejected':
        return 'bg-red-500/20 text-red-700 dark:text-red-400';
      default:
        return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Product suggestion':
        return '📦';
      case 'Feature improvement':
        return '✨';
      case 'Report issue':
        return '⚠️';
      default:
        return '💬';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6" data-testid="admin-suggestions">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black">Suggestions</h1>
            <p className="text-muted-foreground mt-1">User feedback and contact submissions</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Submissions</p>
            <p className="text-2xl font-black">{suggestions.length}</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          </div>
        ) : suggestions.length === 0 ? (
          <Card className="p-12 text-center border rounded-none">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-bold text-lg mb-2">No Suggestions Yet</h3>
            <p className="text-muted-foreground">User submissions will appear here</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <Card key={suggestion.id} className="p-6 border rounded-none" data-testid={`suggestion-${suggestion.id}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getTypeIcon(suggestion.suggestion_type)}</span>
                    <div>
                      <h3 className="font-bold text-lg">{suggestion.name}</h3>
                      {suggestion.email && (
                        <p className="text-sm text-muted-foreground">{suggestion.email}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                          {suggestion.suggestion_type}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(suggestion.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-semibold uppercase rounded-sm ${getStatusColor(
                      suggestion.status
                    )}`}
                  >
                    {suggestion.status}
                  </span>
                </div>

                <div className="bg-secondary/30 p-4 rounded-none mb-4">
                  <p className="text-sm whitespace-pre-wrap">{suggestion.message}</p>
                </div>

                <div className="flex gap-2">
                  {suggestion.status === 'pending' && (
                    <>
                      <Button
                        onClick={() => updateStatus(suggestion.id, 'in-progress')}
                        variant="outline"
                        size="sm"
                        className="rounded-sm"
                      >
                        Mark In Progress
                      </Button>
                      <Button
                        onClick={() => updateStatus(suggestion.id, 'completed')}
                        variant="outline"
                        size="sm"
                        className="rounded-sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                      <Button
                        onClick={() => updateStatus(suggestion.id, 'rejected')}
                        variant="outline"
                        size="sm"
                        className="rounded-sm"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                  {suggestion.status !== 'pending' && (
                    <Button
                      onClick={() => updateStatus(suggestion.id, 'pending')}
                      variant="ghost"
                      size="sm"
                      className="rounded-sm"
                    >
                      Reset to Pending
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminSuggestions;