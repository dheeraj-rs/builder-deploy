'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Rocket, ExternalLink, ArrowLeft, CheckCircle2, XCircle, Globe, GitBranch, Clock, Terminal, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import '@/app/styles/deploy.scss';

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

const Input = ({ className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <input
      type={type}
      className={cn("input", className)}
      {...props}
    />
  );
};

const Label = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn("label", className)} {...props} />
);

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

const Switch = ({ checked, onCheckedChange, id, className, ...props }: { checked: boolean; onCheckedChange: (c: boolean) => void; id?: string; className?: string } & React.HTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    role="switch"
    id={id}
    aria-checked={checked}
    onClick={() => onCheckedChange(!checked)}
    className={cn(
      "switch",
      checked ? "switch--checked" : "switch--unchecked",
      className
    )}
    data-state={checked ? "checked" : "unchecked"}
    {...props}
  >
    <span
      className={cn(
        "switch__thumb",
        checked && "switch__thumb--checked"
      )}
    />
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

  const loadProject = useCallback(async () => {
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
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [projectId, loadProject]);

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
      <div className="deploy-loading">
        <Loader2 className="loader-icon" />
      </div>
    );
  }

  return (
    <div className="deploy-container">
      <nav className="deploy-nav">
        <div className="deploy-nav__content">
          <div className="deploy-nav__wrapper">
            <div className="deploy-nav__brand">
              <div className="deploy-nav__brand-logo">
                <svg height="16" viewBox="0 0 116 100" fill="#000" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M57.5 0L115 100H0L57.5 0Z" />
                </svg>
              </div>
              <span className="deploy-nav__brand-name">{project.name}</span>
            </div>
            <Link href={`/builder?project=${projectId}`}>
              <Button variant="ghost" className="deploy-nav__back-btn">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Editor
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="deploy-content">

        {deploymentStatus === 'idle' && (
          <div className="max-w-2xl mx-auto">
            <div className="deploy-header">
              <h1>Deploy to Vercel</h1>
              <p>
                Deploy your website to a global edge network with a single click.
              </p>
            </div>
            <Card className="config-card">
              <CardHeader>
                <CardTitle>Deployment Configuration</CardTitle>
                <CardDescription className="config-card__description">
                  Configure your project settings
                </CardDescription>
              </CardHeader>
              <CardContent className="config-card__content">
                <div className="space-y-2">
                  <Label htmlFor="projectName" className="deploy-label">Project Name</Label>
                  <div className="flex gap-2">
                    <Input
                      id="projectName"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="my-awesome-website"
                      className="deploy-input"
                    />
                    <div className="deploy-input-suffix">
                      .vercel.app
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="deploy-label">Project Stats</Label>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-card__value stat-card__value--blue">{project.html_content.length}</div>
                      <div className="stat-card__label">HTML Chars</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-card__value stat-card__value--pink">{project.css_content.length}</div>
                      <div className="stat-card__label">CSS Chars</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-card__value stat-card__value--yellow">{project.js_content?.length || 0}</div>
                      <div className="stat-card__label">JS Chars</div>
                    </div>
                  </div>
                </div>

                <div className="advanced-config">
                  <div className="advanced-config__header">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={showAdvanced}
                        onCheckedChange={setShowAdvanced}
                        id="advanced-mode"
                      />
                      <Label htmlFor="advanced-mode" className="deploy-label deploy-label--pointer">
                        Enable Advanced Configuration
                      </Label>
                    </div>
                  </div>

                  {showAdvanced && (
                    <div className="advanced-config__content">
                      <div className="space-y-2">
                        <Label className="deploy-label">Framework Preset</Label>
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
                            className="deploy-select"
                          >
                            <option value="html">HTML (Static)</option>
                            <option value="nextjs">Next.js</option>
                            <option value="vite">Vite</option>
                            <option value="create-react-app">React App</option>
                            <option value="astro">Astro</option>
                            <option value="other">Other</option>
                          </select>
                          <ChevronDown className="deploy-select-icon" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="deploy-label">Root Directory</Label>
                        <Input
                          value={rootDirectory}
                          onChange={(e) => setRootDirectory(e.target.value)}
                          placeholder="./"
                          className="deploy-input"
                        />
                      </div>

                      <div className="space-y-4">
                        <h4 className="deploy-section-title">Build & Output Settings</h4>

                        <div className="space-y-2">
                          <Label className="deploy-label">Build Command</Label>
                          <Input
                            value={buildCommand}
                            onChange={(e) => setBuildCommand(e.target.value)}
                            placeholder="npm run build"
                            className="deploy-input"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="deploy-label">Output Directory</Label>
                          <Input
                            value={outputDirectory}
                            onChange={(e) => setOutputDirectory(e.target.value)}
                            placeholder="dist"
                            className="deploy-input"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="deploy-label">Install Command</Label>
                          <Input
                            value={installCommand}
                            onChange={(e) => setInstallCommand(e.target.value)}
                            placeholder="npm install"
                            className="deploy-input"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="deploy-section-title">Environment Variables</h4>
                          <Button
                            onClick={() => setEnvVars([...envVars, { key: '', value: '' }])}
                            size="sm"
                            variant="outline"
                            className="deploy-add-btn"
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
                                className="deploy-input flex-1"
                              />
                              <Input
                                value={env.value}
                                onChange={(e) => {
                                  const newEnvVars = [...envVars];
                                  newEnvVars[index].value = e.target.value;
                                  setEnvVars(newEnvVars);
                                }}
                                placeholder="Value"
                                className="deploy-input flex-1"
                              />
                              <Button
                                onClick={() => {
                                  const newEnvVars = envVars.filter((_, i) => i !== index);
                                  setEnvVars(newEnvVars);
                                }}
                                size="icon"
                                variant="ghost"
                                className="deploy-remove-btn"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          {envVars.length === 0 && (
                            <p className="deploy-empty-text">No environment variables added.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleDeploy}
                  disabled={!projectName || isDeploying}
                  className="deploy-submit-btn"
                  size="lg"
                >
                  {isDeploying ? 'Deploying...' : 'Deploy'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {deploymentStatus === 'deploying' && (
          <div className="deployment-progress">
            <div className="deployment-progress__loader">
              <div className="deployment-progress__loader-circle">
                <Loader2 className="deployment-progress__loader-icon" />
              </div>
              <div className="deployment-progress__loader-line"></div>
            </div>

            <h2 className="text-2xl font-bold mb-2">Deploying to Vercel</h2>
            <p className="text-gray-400 mb-8">Please wait while we build and deploy your application.</p>

            <div className="deployment-progress__steps">
              <div className="space-y-4">
                {DEPLOYMENT_STEPS.map((step) => (
                  <div key={step.id} className="deployment-progress__step">
                    <div className={`deployment-progress__step-icon ${currentStep > step.id ? 'deployment-progress__step-icon--completed' :
                      currentStep === step.id ? 'deployment-progress__step-icon--active' : 'deployment-progress__step-icon--pending'
                      }`}>
                      {currentStep > step.id && <CheckCircle2 className="deployment-progress__step-check" />}
                      {currentStep === step.id && <div className="deployment-progress__step-dot" />}
                    </div>
                    <span className={`deployment-progress__step-label ${currentStep >= step.id ? 'deployment-progress__step-label--active' : 'deployment-progress__step-label--pending'
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
          <div className="success-view">
            <div className="success-view__header">
              <h1>Production Deployment</h1>
              <p>The deployment has been successfully created.</p>
            </div>

            <div className="success-view__grid">
              {/* Preview Section */}
              <div className="success-view__preview">
                <div className="success-view__preview-card">
                  <div className="success-view__preview-header">
                    <div className="success-view__preview-dot success-view__preview-dot--red"></div>
                    <div className="success-view__preview-dot success-view__preview-dot--yellow"></div>
                    <div className="success-view__preview-dot success-view__preview-dot--green"></div>
                  </div>
                  <div className="success-view__preview-content">
                    <div className="success-view__preview-empty">
                      <Globe className="success-view__preview-icon" />
                      <p>Preview not available</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Section */}
              <div className="success-view__details">
                <div>
                  <h3 className="success-view__subtitle">Deployment Details</h3>

                  <div className="success-view__info-grid">
                    <div className="success-view__info-item">
                      <Label className="success-view__label">Deployment</Label>
                      <a href={deploymentUrl} target="_blank" rel="noopener noreferrer" className="success-view__link">
                        {deploymentUrl.replace('https://', '')}
                      </a>
                    </div>

                    <div className="success-view__info-item">
                      <Label className="success-view__label">Domains</Label>
                      <div className="success-view__domain-row">
                        <a href={deploymentUrl} target="_blank" rel="noopener noreferrer" className="success-view__domain-link">
                          {deploymentUrl.replace('https://', '')}
                        </a>
                        <ExternalLink className="success-view__link-icon" />
                      </div>
                    </div>

                    <div className="success-view__stats-row">
                      <div className="success-view__info-item">
                        <Label className="success-view__label">Status</Label>
                        <div className="success-view__status-row">
                          <div className="success-view__status-dot"></div>
                          <span className="success-view__status-text">Ready</span>
                        </div>
                      </div>
                      <div className="success-view__info-item">
                        <Label className="success-view__label">Created</Label>
                        <div className="success-view__created-text">Just now</div>
                      </div>
                    </div>

                    <div className="success-view__info-item">
                      <Label className="success-view__label">Source</Label>
                      <div className="success-view__source-row">
                        <GitBranch className="success-view__source-icon" />
                        <span>main</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="success-view__actions">
                  <a href={deploymentUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <Button className="success-view__visit-btn">
                      Visit
                    </Button>
                  </a>
                  <Link href="/dashboard" className="block">
                    <Button variant="outline" className="success-view__dashboard-btn">
                      Go to Dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            <div className="success-view__cli-hint">
              <div className="success-view__cli-content">
                <Terminal className="h-4 w-4" />
                <span>To deploy to Production, run </span>
                <span className="text-white">vercel --prod</span>
                <span> via the CLI.</span>
              </div>
            </div>
          </div>
        )}

        {deploymentStatus === 'error' && (
          <Card className="error-card">
            <CardContent className="error-card__content">
              <XCircle className="error-card__icon" />
              <h2>Deployment Failed</h2>
              <p>We encountered an error while deploying your website</p>
              {errorMessage && (
                <div className="error-card__message">
                  <p>{errorMessage}</p>
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
