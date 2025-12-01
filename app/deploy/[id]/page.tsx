'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Rocket, ExternalLink, ArrowLeft, CheckCircle2, XCircle, Globe, GitBranch, Clock, Terminal, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
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

const Input = ({ className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
};

const Label = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props} />
);

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

const Switch = ({ checked, onCheckedChange, id, ...props }: { checked: boolean; onCheckedChange: (c: boolean) => void; id?: string } & React.HTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    role="switch"
    id={id}
    aria-checked={checked}
    onClick={() => onCheckedChange(!checked)}
    className={cn("peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50", checked ? "bg-slate-900" : "bg-slate-200")}
    {...props}
  >
    <span className={cn("pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform", checked ? "translate-x-5" : "translate-x-0")} />
  </button>
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

const DEPLOYMENT_STEPS = [
  { id: 1, label: 'Initiating deployment...', duration: 1000 },
  { id: 2, label: 'Building project files...', duration: 2000 },
  { id: 3, label: 'Optimizing assets...', duration: 1500 },
  { id: 4, label: 'Uploading to Vercel...', duration: 2000 },
  { id: 5, label: 'Finalizing deployment...', duration: 1000 },
];

export default function DeployPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
  const [deploymentUrl, setDeploymentUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Advanced Configuration State
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [framework, setFramework] = useState('other');
  const [rootDirectory, setRootDirectory] = useState(''); // Default to empty string to avoid Vercel errors
  const [buildCommand, setBuildCommand] = useState('');
  const [outputDirectory, setOutputDirectory] = useState('');
  const [installCommand, setInstallCommand] = useState('');
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);

  // Loading state
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
        // Ensure unique project name by appending random string if needed, or just use timestamp
        const uniqueSuffix = Math.random().toString(36).substring(2, 7);
        setProjectName(`${data.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${uniqueSuffix}`);
      }
    } catch (error) {
      console.error('Error loading project:', error);
    }
  };

  const pollDeploymentStatus = async (deploymentId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/deploy/status?id=${deploymentId}`);
        const data = await response.json();

        if (data.success) {
          // Update steps based on Vercel status
          // Vercel states: QUEUED, INITIALIZING, ANALYZING, BUILDING, DEPLOYING, READY, ERROR, CANCELED

          if (data.status === 'QUEUED' || data.status === 'INITIALIZING') {
            setCurrentStep(1);
            setProgress(10);
          } else if (data.status === 'BUILDING' || data.status === 'ANALYZING') {
            setCurrentStep(2);
            // We can't know exact build progress, so we'll just keep it at a "busy" state or slowly increment
            setProgress(prev => Math.min(prev + 1, 60));
          } else if (data.status === 'DEPLOYING') {
            // Map DEPLOYING to our "Uploading" step
            setCurrentStep(4);
            setProgress(80);
          } else if (data.status === 'READY') {
            clearInterval(pollInterval);

            // Visual completion first
            setCurrentStep(6); // Ensure all steps look complete
            setProgress(100);

            // Wait a bit to show the completion state before switching UI
            setTimeout(async () => {
              setDeploymentStatus('success');
              setDeploymentUrl(data.url);
              setIsDeploying(false);

              // Update Project with final status
              await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  vercel_url: data.url,
                  status: 'deployed',
                }),
              });

              // Update Deployment with final status
              await fetch('/api/deployments', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  vercel_deployment_id: deploymentId,
                  url: data.url,
                  status: 'success',
                }),
              });
            }, 2000); // 2 second delay to let user see the checkmarks

          } else if (data.status === 'ERROR' || data.status === 'CANCELED') {
            clearInterval(pollInterval);
            setDeploymentStatus('error');
            setErrorMessage('Deployment failed or was canceled by Vercel.');
            setIsDeploying(false);
            // throw new Error('Deployment failed or was canceled'); // Don't throw here, just handle it
          }
        } else {
          console.error('Failed to fetch deployment status:', data.error);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000); // Poll every 3 seconds
  };

  const handleDeploy = async () => {
    if (!project || !projectName) return;

    setIsDeploying(true);
    setDeploymentStatus('deploying');
    setErrorMessage('');
    setCurrentStep(0);
    setProgress(0);

    // We don't need simulated progress anymore, the polling will handle it

    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project._id,
          projectName,
          htmlContent: project.html_content,
          cssContent: project.css_content,
          jsContent: project.js_content,
          // Only send advanced config if enabled
          framework: showAdvanced && framework !== 'other' ? framework : null,
          rootDirectory: showAdvanced ? rootDirectory : null,
          buildCommand: showAdvanced ? buildCommand : null,
          outputDirectory: showAdvanced ? outputDirectory : null,
          installCommand: showAdvanced ? installCommand : null,
          envVars: showAdvanced ? envVars : [],
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Update project with initial Vercel deployment ID
        await fetch(`/api/projects/${project._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vercel_deployment_id: result.deploymentId,
            status: 'deploying',
          }),
        });

        // Insert initial deployment record
        await fetch('/api/deployments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: project._id,
            vercel_deployment_id: result.deploymentId,
            url: result.url, // Initial URL
            status: 'deploying', // Initial status
          }),
        });

        // Start polling for completion
        await pollDeploymentStatus(result.deploymentId);

        // We don't set success here immediately anymore.
        // The polling function will handle the success state.

      } else {
        throw new Error(result.error || 'Deployment failed');
      }
    } catch (error: any) {
      console.error('Deployment error:', error);
      setDeploymentStatus('error');
      setErrorMessage(error.message || 'An error occurred during deployment');

      await fetch('/api/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project._id,
          vercel_deployment_id: 'error-' + Date.now(), // Placeholder ID for failed deployment
          url: '',
          status: 'error',
          error_message: error.message,
        }),
      });
      setIsDeploying(false);
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-gray-800 bg-black">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center">
                <svg height="16" viewBox="0 0 116 100" fill="#000" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M57.5 0L115 100H0L57.5 0Z" />
                </svg>
              </div>
              <span className="font-semibold text-lg">{project.name}</span>
            </div>
            <Link href={`/builder?project=${projectId}`}>
              <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-gray-800">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Editor
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-12">

        {deploymentStatus === 'idle' && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">Deploy to Vercel</h1>
              <p className="text-gray-400 text-lg">
                Deploy your website to a global edge network with a single click.
              </p>
            </div>
            <Card className="bg-gray-900 border-gray-800 text-white">
              <CardHeader>
                <CardTitle>Deployment Configuration</CardTitle>
                <CardDescription className="text-gray-400">
                  Configure your project settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="projectName" className="text-gray-200">Project Name</Label>
                  <div className="flex gap-2">
                    <Input
                      id="projectName"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="my-awesome-website"
                      className="bg-black border-gray-700 text-white placeholder:text-gray-600"
                    />
                    <div className="flex items-center px-3 bg-gray-800 border border-gray-700 rounded-md text-gray-400 text-sm">
                      .vercel.app
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-200">Project Stats</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-black border border-gray-800 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-500">{project.html_content.length}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">HTML Chars</div>
                    </div>
                    <div className="p-4 bg-black border border-gray-800 rounded-lg text-center">
                      <div className="text-2xl font-bold text-pink-500">{project.css_content.length}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">CSS Chars</div>
                    </div>
                    <div className="p-4 bg-black border border-gray-800 rounded-lg text-center">
                      <div className="text-2xl font-bold text-yellow-500">{project.js_content?.length || 0}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">JS Chars</div>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-800 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-4 bg-gray-900">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={showAdvanced}
                        onCheckedChange={setShowAdvanced}
                        id="advanced-mode"
                      />
                      <Label htmlFor="advanced-mode" className="font-medium text-gray-200 cursor-pointer">
                        Enable Advanced Configuration
                      </Label>
                    </div>
                  </div>

                  {showAdvanced && (
                    <div className="p-4 space-y-6 bg-black border-t border-gray-800">
                      <div className="space-y-2">
                        <Label className="text-gray-200">Framework Preset</Label>
                        <div className="relative">
                          <select
                            value={framework}
                            onChange={(e) => {
                              const value = e.target.value;
                              setFramework(value);
                              // Auto-fill defaults based on framework
                              switch (value) {
                                case 'astro':
                                  setBuildCommand('npm run build');
                                  setOutputDirectory('dist');
                                  setInstallCommand('npm install');
                                  break;
                                case 'nextjs':
                                  setBuildCommand('next build');
                                  setOutputDirectory('.next');
                                  setInstallCommand('npm install');
                                  break;
                                case 'create-react-app':
                                  setBuildCommand('react-scripts build');
                                  setOutputDirectory('build');
                                  setInstallCommand('npm install');
                                  break;
                                case 'vite':
                                  setBuildCommand('vite build');
                                  setOutputDirectory('dist');
                                  setInstallCommand('npm install');
                                  break;
                                case 'html':
                                case 'other':
                                default:
                                  setBuildCommand('');
                                  setOutputDirectory('');
                                  setInstallCommand('');
                                  break;
                              }
                            }}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white ring-offset-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                          >
                            <option value="html">HTML (Static)</option>
                            <option value="nextjs">Next.js</option>
                            <option value="vite">Vite</option>
                            <option value="create-react-app">React App</option>
                            <option value="astro">Astro</option>
                            <option value="other">Other</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-200">Root Directory</Label>
                        <Input
                          value={rootDirectory}
                          onChange={(e) => setRootDirectory(e.target.value)}
                          placeholder="./"
                          className="bg-gray-900 border-gray-700 text-white"
                        />
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Build & Output Settings</h4>

                        <div className="space-y-2">
                          <Label className="text-gray-200">Build Command</Label>
                          <Input
                            value={buildCommand}
                            onChange={(e) => setBuildCommand(e.target.value)}
                            placeholder="npm run build"
                            className="bg-gray-900 border-gray-700 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-gray-200">Output Directory</Label>
                          <Input
                            value={outputDirectory}
                            onChange={(e) => setOutputDirectory(e.target.value)}
                            placeholder="dist"
                            className="bg-gray-900 border-gray-700 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-gray-200">Install Command</Label>
                          <Input
                            value={installCommand}
                            onChange={(e) => setInstallCommand(e.target.value)}
                            placeholder="npm install"
                            className="bg-gray-900 border-gray-700 text-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Environment Variables</h4>
                          <Button
                            onClick={() => setEnvVars([...envVars, { key: '', value: '' }])}
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {envVars.map((env, index) => (
                            <div key={index} className="flex gap-2">
                              <Input
                                value={env.key}
                                onChange={(e) => {
                                  const newEnvVars = [...envVars];
                                  newEnvVars[index].key = e.target.value;
                                  setEnvVars(newEnvVars);
                                }}
                                placeholder="EXAMPLE_KEY"
                                className="flex-1 bg-gray-900 border-gray-700 text-white placeholder:text-gray-600"
                              />
                              <Input
                                value={env.value}
                                onChange={(e) => {
                                  const newEnvVars = [...envVars];
                                  newEnvVars[index].value = e.target.value;
                                  setEnvVars(newEnvVars);
                                }}
                                placeholder="Value"
                                className="flex-1 bg-gray-900 border-gray-700 text-white placeholder:text-gray-600"
                              />
                              <Button
                                onClick={() => {
                                  const newEnvVars = envVars.filter((_, i) => i !== index);
                                  setEnvVars(newEnvVars);
                                }}
                                size="icon"
                                variant="ghost"
                                className="text-gray-500 hover:text-red-400 hover:bg-gray-900"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          {envVars.length === 0 && (
                            <p className="text-xs text-gray-600 italic">No environment variables added.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleDeploy}
                  disabled={!projectName || isDeploying}
                  className="w-full bg-white text-black hover:bg-gray-200 font-medium"
                  size="lg"
                >
                  {isDeploying ? 'Deploying...' : 'Deploy'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {deploymentStatus === 'deploying' && (
          <div className="max-w-2xl mx-auto text-center pt-12">
            <div className="mb-8 relative">
              <div className="h-32 w-32 mx-auto bg-gray-900 rounded-full flex items-center justify-center relative z-10 border-4 border-gray-800">
                <Loader2 className="h-12 w-12 animate-spin text-white" />
              </div>
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-800 -z-0"></div>
            </div>

            <h2 className="text-2xl font-bold mb-2">Deploying to Vercel</h2>
            <p className="text-gray-400 mb-8">Please wait while we build and deploy your application.</p>

            <div className="max-w-md mx-auto bg-gray-900 rounded-lg border border-gray-800 p-6 text-left">
              <div className="space-y-4">
                {DEPLOYMENT_STEPS.map((step) => (
                  <div key={step.id} className="flex items-center gap-3">
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center border ${currentStep > step.id ? 'bg-blue-500 border-blue-500' :
                      currentStep === step.id ? 'border-blue-500' : 'border-gray-700'
                      }`}>
                      {currentStep > step.id && <CheckCircle2 className="h-3 w-3 text-black" />}
                      {currentStep === step.id && <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />}
                    </div>
                    <span className={`${currentStep >= step.id ? 'text-gray-200' : 'text-gray-600'
                      }`}>{step.label}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {deploymentStatus === 'success' && (
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Production Deployment</h1>
              <p className="text-gray-400">The deployment has been successfully created.</p>
            </div>

            <div className="bg-black border border-gray-800 rounded-lg overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-3">
                {/* Preview Section */}
                <div className="lg:col-span-2 p-8 border-b lg:border-b-0 lg:border-r border-gray-800 bg-gray-900/30 flex flex-col items-center justify-center min-h-[400px]">
                  <div className="w-full max-w-md bg-white rounded-lg shadow-2xl overflow-hidden transform transition-all hover:scale-[1.02] duration-500">
                    <div className="h-6 bg-gray-100 border-b flex items-center px-2 gap-1">
                      <div className="h-2 w-2 rounded-full bg-red-400"></div>
                      <div className="h-2 w-2 rounded-full bg-yellow-400"></div>
                      <div className="h-2 w-2 rounded-full bg-green-400"></div>
                    </div>
                    <div className="aspect-video bg-white flex items-center justify-center text-gray-400">
                      <div className="text-center p-8">
                        <Globe className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">Preview not available</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details Section */}
                <div className="p-6 space-y-8">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">Deployment Details</h3>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-gray-500 text-xs">Deployment</Label>
                        <a href={deploymentUrl} target="_blank" rel="noopener noreferrer" className="block text-blue-400 hover:underline truncate font-mono text-sm mt-1">
                          {deploymentUrl.replace('https://', '')}
                        </a>
                      </div>

                      <div>
                        <Label className="text-gray-500 text-xs">Domains</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <a href={deploymentUrl} target="_blank" rel="noopener noreferrer" className="text-white hover:underline text-sm font-medium">
                            {deploymentUrl.replace('https://', '')}
                          </a>
                          <ExternalLink className="h-3 w-3 text-gray-500" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-gray-500 text-xs">Status</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                            <span className="text-white text-sm">Ready</span>
                          </div>
                        </div>
                        <div>
                          <Label className="text-gray-500 text-xs">Created</Label>
                          <div className="text-white text-sm mt-1">Just now</div>
                        </div>
                      </div>

                      <div>
                        <Label className="text-gray-500 text-xs">Source</Label>
                        <div className="flex items-center gap-2 mt-1 text-white text-sm">
                          <GitBranch className="h-4 w-4 text-gray-500" />
                          <span>main</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-800 space-y-3">
                    <a href={deploymentUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <Button className="w-full bg-white text-black hover:bg-gray-200">
                        Visit
                      </Button>
                    </a>
                    <Link href="/dashboard" className="block">
                      <Button variant="outline" className="w-full border-gray-700 text-white hover:bg-gray-800 hover:text-white">
                        Go to Dashboard
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-3 text-sm text-gray-400 font-mono">
                <Terminal className="h-4 w-4" />
                <span>To deploy to Production, run </span>
                <span className="text-white">vercel --prod</span>
                <span> via the CLI.</span>
              </div>
            </div>
          </div>
        )}

        {deploymentStatus === 'error' && (
          <Card className="border-red-900 bg-red-950/20 max-w-2xl mx-auto">
            <CardContent className="py-12">
              <div className="text-center">
                <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2 text-red-500">
                  Deployment Failed
                </h2>
                <p className="text-red-400 mb-4">
                  We encountered an error while deploying your website
                </p>
                {errorMessage && (
                  <div className="bg-black/50 rounded-lg p-4 mb-6 border border-red-900/50">
                    <p className="text-sm text-red-400 font-mono">{errorMessage}</p>
                  </div>
                )}
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={() => {
                      setDeploymentStatus('idle');
                      setErrorMessage('');
                    }}
                    size="lg"
                    variant="destructive"
                  >
                    Try Again
                  </Button>
                  <Link href={`/builder?project=${projectId}`}>
                    <Button size="lg" variant="outline" className="border-red-900 text-red-400 hover:bg-red-950">
                      Back to Editor
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
