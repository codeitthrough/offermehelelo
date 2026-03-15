import React, { useState } from 'react';
import { axiosInstance } from '@/App';
import AdminLayout from '@/components/AdminLayout';
import { toast } from 'sonner';
import { Upload, Download, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const AdminBulkUpload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
        setFile(selectedFile);
        setResults(null);
      } else {
        toast.error('Please upload a CSV or XLSX file');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await axiosInstance.post('/admin/deals/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResults(response.data);
      
      if (response.data.inserted > 0) {
        toast.success(`Successfully uploaded ${response.data.inserted} deals!`);
      }
      
      if (response.data.skipped > 0) {
        toast.warning(`${response.data.skipped} deals were skipped`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = `title,affiliate_link,platform,category,original_price,discounted_price,image_url,description
"Samsung Galaxy S24 Ultra","https://amazon.in/samsung-s24","Amazon","Mobile Accessories",129999,89999,"https://images.unsplash.com/photo-1610945415295-d9bbf067e59c","Latest flagship smartphone"
"Sony WH-1000XM5","https://flipkart.com/sony-headphones","Flipkart","Audio (Headphones, Earbuds, Speakers)",29990,14990,"https://images.unsplash.com/photo-1546435770-a3e426bf472b","Noise cancelling headphones"`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deals_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded!');
  };

  return (
    <AdminLayout>
      <div className="space-y-6" data-testid="admin-bulk-upload">
        <div>
          <h1 className="text-3xl font-black">Bulk Upload Deals</h1>
          <p className="text-muted-foreground mt-1">Upload multiple deals via CSV or XLSX file</p>
        </div>

        {/* Template Download */}
        <Card className="p-6 bg-secondary/20 border rounded-none">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold mb-2">Download Template</h3>
              <p className="text-sm text-muted-foreground">
                Download a sample CSV template with the correct format
              </p>
            </div>
            <Button onClick={downloadTemplate} variant="outline" className="rounded-sm">
              <Download className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>
          </div>
        </Card>

        {/* Upload Section */}
        <Card className="p-6 border rounded-none">
          <h3 className="font-bold mb-4">Upload File</h3>
          
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-none p-8 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                data-testid="file-input"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer inline-block px-6 py-3 bg-primary text-primary-foreground rounded-sm font-semibold uppercase tracking-wide"
              >
                Choose File
              </label>
              {file && (
                <p className="mt-4 text-sm font-medium">
                  Selected: {file.name}
                </p>
              )}
            </div>

            <div className="bg-secondary/50 p-4 rounded-none text-sm">
              <h4 className="font-semibold mb-2">Required Fields:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• title - Product name</li>
                <li>• affiliate_link - Product URL</li>
                <li>• platform - Amazon, Flipkart, etc.</li>
                <li>• category - Must match existing category</li>
                <li>• original_price - Original price (number)</li>
                <li>• discounted_price - Sale price (number)</li>
                <li>• image_url - Product image URL (optional)</li>
                <li>• description - Product description (optional)</li>
              </ul>
              <p className="mt-3 font-semibold text-foreground">Note: Discount must be ≥ 30%</p>
            </div>

            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full rounded-sm uppercase tracking-wide font-bold"
              data-testid="upload-btn"
            >
              {uploading ? 'Uploading...' : 'Upload Deals'}
            </Button>
          </div>
        </Card>

        {/* Results */}
        {results && (
          <Card className="p-6 border rounded-none">
            <h3 className="font-bold mb-4">Upload Results</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-secondary/50 p-4 rounded-none">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-blue-500" />
                  <span className="font-semibold">Total Rows</span>
                </div>
                <p className="text-3xl font-black">{results.total}</p>
              </div>
              
              <div className="bg-green-500/10 p-4 rounded-none">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-semibold text-green-700 dark:text-green-400">Inserted</span>
                </div>
                <p className="text-3xl font-black text-green-700 dark:text-green-400">{results.inserted}</p>
              </div>
              
              <div className="bg-red-500/10 p-4 rounded-none">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="font-semibold text-red-700 dark:text-red-400">Skipped</span>
                </div>
                <p className="text-3xl font-black text-red-700 dark:text-red-400">{results.skipped}</p>
              </div>
            </div>

            {results.errors && results.errors.length > 0 && (
              <div>
                <h4 className="font-bold mb-2 text-red-600 dark:text-red-400">Errors:</h4>
                <div className="bg-red-500/10 p-4 rounded-none max-h-60 overflow-y-auto">
                  <ul className="space-y-1 text-sm">
                    {results.errors.map((error, index) => (
                      <li key={index} className="text-red-700 dark:text-red-300">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminBulkUpload;