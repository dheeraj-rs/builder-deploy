'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Zap, Globe, ArrowRight } from 'lucide-react';
import Link from 'next/link';

type Template = {
  _id: string;
  name: string;
  description: string;
  thumbnail_url: string;
  is_active: boolean;
};

export default function Home() {
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                WebForge AI
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button>Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
            <Zap className="h-4 w-4" />
            AI-Powered Website Builder
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-slate-900 via-blue-800 to-slate-900 bg-clip-text text-transparent">
            Build Websites with AI
            <br />
            Deploy in One Click
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Chat with AI to create production-ready websites. Choose from templates or describe your vision. Deploy to Vercel instantly.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/builder">
              <Button size="lg" className="text-lg px-8 py-6">
                <Sparkles className="mr-2 h-5 w-5" />
                Start Building with AI
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="#templates">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                Browse Templates
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-blue-300 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>AI-Powered Generation</CardTitle>
                <CardDescription>
                  Describe your website in plain English and watch AI build it in seconds
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-blue-300 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>
                  See changes in real-time as you chat with AI and refine your website
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-blue-300 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>One-Click Deploy</CardTitle>
                <CardDescription>
                  Deploy your website to Vercel with a single click and get a live URL instantly
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      <section id="templates" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Start with a Template</h2>
            <p className="text-xl text-slate-600">
              Choose a professionally designed template and customize it with AI
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {templates.map((template) => (
              <Card key={template._id} className="overflow-hidden hover:shadow-xl transition-shadow group">
                <div className="aspect-video relative overflow-hidden bg-slate-100">
                  <img
                    src={template.thumbnail_url}
                    alt={template.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <Link href={`/builder?template=${template._id}`} className="w-full">
                      <Button className="w-full" variant="secondary">
                        Use This Template
                      </Button>
                    </Link>
                  </div>
                </div>
                <CardHeader>
                  <CardTitle>{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          {templates.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <p>No templates available yet. Start building from scratch with AI!</p>
            </div>
          )}
        </div>
      </section>

      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Build Your Website?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of creators building beautiful websites with AI
          </p>
          <Link href="/builder">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
              <Sparkles className="mr-2 h-5 w-5" />
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t bg-white py-8 px-4">
        <div className="max-w-7xl mx-auto text-center text-slate-600">
          <p>&copy; 2025 WebForge AI. Build with AI, Deploy with Confidence.</p>
        </div>
      </footer>
    </div>
  );
}
