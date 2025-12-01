'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Zap, Globe, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import '@/app/styles/home.scss';

// --- UI Components ---

const Button = ({ className, variant = "default", size = "default", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link", size?: "default" | "sm" | "lg" | "icon" }) => {
  return (
    <button
      className={cn(
        "btn",
        `btn--${variant}`,
        `btn--size-${size}`,
        className
      )}
      {...props}
    />
  );
};

const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("card", className)} {...props} />
);

const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("card__header", className)} {...props} />
);

const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("card__title", className)} {...props} />
);

const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("card__description", className)} {...props} />
);

const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("card__content", className)} {...props} />
);

// --- Page Component ---

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
    <div className="home-container">
      <nav className="navbar">
        <div className="navbar__content">
          <div className="navbar__brand">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <span>WebForge AI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button>Dashboard</Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="hero-section">
        <div className="hero-section__content">
          <div className="hero-section__badge">
            <Zap className="h-4 w-4" />
            AI-Powered Website Builder
          </div>
          <h1 className="hero-section__title">
            Build Websites with AI
            <br />
            Deploy in One Click
          </h1>
          <p className="hero-section__description">
            Chat with AI to create production-ready websites. Choose from templates or describe your vision. Deploy to Vercel instantly.
          </p>
          <div className="hero-section__actions">
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

      <section className="features-section">
        <div className="features-section__grid">
          <Card className="feature-card">
            <CardHeader>
              <div className="feature-card__icon feature-card__icon--blue">
                <Sparkles className="h-6 w-6" />
              </div>
              <CardTitle>AI-Powered Generation</CardTitle>
              <CardDescription>
                Describe your website in plain English and watch AI build it in seconds
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="feature-card">
            <CardHeader>
              <div className="feature-card__icon feature-card__icon--green">
                <Zap className="h-6 w-6" />
              </div>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>
                See changes in real-time as you chat with AI and refine your website
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="feature-card">
            <CardHeader>
              <div className="feature-card__icon feature-card__icon--purple">
                <Globe className="h-6 w-6" />
              </div>
              <CardTitle>One-Click Deploy</CardTitle>
              <CardDescription>
                Deploy your website to Vercel with a single click and get a live URL instantly
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section id="templates" className="templates-section">
        <div className="templates-section__header">
          <h2>Start with a Template</h2>
          <p>
            Choose a professionally designed template and customize it with AI
          </p>
        </div>

        <div className="templates-section__grid">
          {templates.map((template) => (
            <Card key={template._id} className="template-card">
              <div className="template-card__image-wrapper">
                <img
                  src={template.thumbnail_url}
                  alt={template.name}
                  className="template-card__image"
                />
                <div className="template-card__overlay">
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
      </section>

      <section className="cta-section">
        <div className="cta-section__content">
          <h2>Ready to Build Your Website?</h2>
          <p>
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

      <footer className="footer">
        <div className="footer__content">
          <p>&copy; 2025 WebForge AI. Build with AI, Deploy with Confidence.</p>
        </div>
      </footer>
    </div>
  );
}
