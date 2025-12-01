'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Plus, ExternalLink, Edit, Trash2, Globe } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import '@/app/styles/dashboard.scss';

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

type Project = {
  _id: string;
  user_id: string;
  name: string;
  description: string;
  template_id?: string;
  html_content: string;
  css_content: string;
  js_content: string;
  status: string;
  vercel_deployment_id?: string;
  vercel_url?: string;
  created_at: string;
  updated_at: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadProjects();
      } else {
        alert('Failed to delete project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('An error occurred while deleting the project');
    }
  };


  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="dashboard-nav__content">
          <Link href="/">
            <div className="dashboard-nav__brand">
              <Sparkles className="h-6 w-6 text-blue-600" />
              <span>WebForge AI</span>
            </div>
          </Link>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>My Projects</h1>
            <p>
              Manage and deploy your AI-generated websites
            </p>
          </div>
          <Link href="/builder">
            <Button size="lg">
              <Plus className="mr-2 h-5 w-5" />
              New Project
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading projects...</div>
        ) : projects.length === 0 ? (
          <Card className="empty-state">
            <CardContent>
              <Sparkles className="empty-state__icon" />
              <h2>No projects yet</h2>
              <p>
                Start building your first website with AI
              </p>
              <Link href="/builder">
                <Button size="lg">
                  <Plus className="mr-2 h-5 w-5" />
                  Create Your First Project
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="projects-grid">
            {projects.map((project) => (
              <Card key={project._id} className="project-card">
                <CardHeader>
                  <div className="project-card__header-content">
                    <div className="project-card__info">
                      <CardTitle className="project-card__title">{project.name}</CardTitle>
                      <CardDescription className="project-card__description">
                        {project.description || 'No description'}
                      </CardDescription>
                    </div>
                    <div
                      className={`project-card__status ${project.status === 'deployed'
                        ? 'project-card__status--deployed'
                        : 'project-card__status--draft'
                        }`}
                    >
                      {project.status}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {project.vercel_url && (
                      <a
                        href={project.vercel_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="project-card__link"
                      >
                        <Globe className="h-4 w-4" />
                        View Live Site
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <div className="project-card__actions">
                      <Link href={`/builder?project=${project._id}`} className="flex-1">
                        <Button variant="outline" className="w-full">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(project._id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
