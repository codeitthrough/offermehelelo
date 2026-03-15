import React, { useState } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { toast } from 'sonner';
import { Send, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SEO from '@/components/SEO';

const Contact = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    message: '',
    suggestion_type: 'Product suggestion',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(`${API}/suggestions`, form);
      toast.success("Thank you! We'll review your suggestion.");
      setForm({ name: '', email: '', message: '', suggestion_type: 'Product suggestion' });
    } catch (error) {
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen noise-bg">
      <SEO
        title="Contact Us | Deal Striker"
        description="Get in touch with Deal Striker. Share product suggestions, request features, or report issues."
        url="/contact"
      />

      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-[800px] mx-auto px-4 md:px-8 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (window.location.href = '/')}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">DEAL STRIKER</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[800px] mx-auto px-4 md:px-8 py-12">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-black mb-4">Talk To Us</h2>
          <p className="text-lg text-muted-foreground">
            We'd love to hear from you! Share your thoughts, suggestions, or report issues.
          </p>
        </div>

        <div className="border rounded-none bg-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name" className="text-xs uppercase tracking-wider font-semibold">
                Name *
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-2 rounded-sm"
                placeholder="Your name"
                required
                data-testid="contact-name"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-xs uppercase tracking-wider font-semibold">
                Email (Optional)
              </Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-2 rounded-sm"
                placeholder="your@email.com"
                data-testid="contact-email"
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider font-semibold">Type</Label>
              <Select
                value={form.suggestion_type}
                onValueChange={(val) => setForm({ ...form, suggestion_type: val })}
              >
                <SelectTrigger className="mt-2 rounded-sm" data-testid="contact-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Product suggestion">Product Suggestion</SelectItem>
                  <SelectItem value="Feature improvement">Feature Improvement</SelectItem>
                  <SelectItem value="Report issue">Report Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="message" className="text-xs uppercase tracking-wider font-semibold">
                Message *
              </Label>
              <Textarea
                id="message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="mt-2 rounded-sm"
                placeholder="Tell us what's on your mind..."
                rows={6}
                required
                data-testid="contact-message"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full rounded-sm uppercase tracking-wide font-bold"
              data-testid="contact-submit"
            >
              {submitting ? (
                'Sending...'
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </form>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="border rounded-none bg-card p-6">
            <div className="text-3xl mb-2">📦</div>
            <h3 className="font-bold mb-1">Product Suggestions</h3>
            <p className="text-sm text-muted-foreground">Tell us what products you'd like to see</p>
          </div>
          <div className="border rounded-none bg-card p-6">
            <div className="text-3xl mb-2">✨</div>
            <h3 className="font-bold mb-1">Feature Ideas</h3>
            <p className="text-sm text-muted-foreground">Help us improve Deal Striker</p>
          </div>
          <div className="border rounded-none bg-card p-6">
            <div className="text-3xl mb-2">⚠️</div>
            <h3 className="font-bold mb-1">Report Issues</h3>
            <p className="text-sm text-muted-foreground">Found a bug? Let us know</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-20">
        <div className="max-w-[800px] mx-auto px-4 md:px-8 py-8 text-center text-sm text-muted-foreground">
          <p>Deal Striker - We value your feedback!</p>
        </div>
      </footer>
    </div>
  );
};

export default Contact;