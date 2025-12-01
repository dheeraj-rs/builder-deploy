'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Plus, ExternalLink, Edit, Trash2, Globe } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// --- UI Components ---

const Button = ({ className, variant = "default", size = "default", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link", size?: "default" | "sm" | "lg" | "icon" }) => {
  const variants = {
    default: "bg-slate-900 text-slate-50 hover:bg-slate-900/90",
    destructive: "bg-red-500 text-slate-50 hover:bg-red-500/90",
    outline: "border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-100/80",
    ghost: "hover:bg-slate-100 hover:text-slate-900",
    link: "text-slate-900 underline-offset-4 hover:underline",
  };
  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
};

const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("rounded-lg border border-slate-200 bg-white text-slate-950 shadow-sm", className)} {...props} />
);

const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
);

const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
);

const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-slate-500", className)} {...props} />
);

const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6 pt-0", className)} {...props} />
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <nav className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/">
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-blue-600" />
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  WebForge AI
                </span>
              </div>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">My Projects</h1>
            <p className="text-slate-600">
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
          <Card className="py-12">
            <CardContent className="text-center">
              <Sparkles className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">No projects yet</h2>
              <p className="text-slate-600 mb-6">
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card key={project._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="line-clamp-1">{project.name}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-1">
                        {project.description || 'No description'}
                      </CardDescription>
                    </div>
                    <div
                      className={`px-2 py-1 text-xs rounded-full ${project.status === 'deployed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-700'
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
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      >
                        <Globe className="h-4 w-4" />
                        View Live Site
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <div className="flex gap-2 pt-2">
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
