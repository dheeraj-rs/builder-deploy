'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase, type Project } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Rocket, ExternalLink, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

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

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .maybeSingle();

    if (data) {
      setProject(data);
      setProjectName(data.name.toLowerCase().replace(/[^a-z0-9]/g, '-'));
    }
  };

  const handleDeploy = async () => {
    if (!project || !projectName) return;

    setIsDeploying(true);
    setDeploymentStatus('deploying');
    setErrorMessage('');

    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.id,
          projectName,
          htmlContent: project.html_content,
          cssContent: project.css_content,
          jsContent: project.js_content,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setDeploymentStatus('success');
        setDeploymentUrl(result.url);

        await supabase
          .from('projects')
          .update({
            vercel_deployment_id: result.deploymentId,
            vercel_url: result.url,
            status: 'deployed',
          })
          .eq('id', project.id);

        await supabase
          .from('deployments')
          .insert({
            project_id: project.id,
            vercel_deployment_id: result.deploymentId,
            url: result.url,
            status: 'success',
          });
      } else {
        throw new Error(result.error || 'Deployment failed');
      }
    } catch (error: any) {
      console.error('Deployment error:', error);
      setDeploymentStatus('error');
      setErrorMessage(error.message || 'An error occurred during deployment');

      await supabase
        .from('deployments')
        .insert({
          project_id: project.id,
          status: 'error',
          error_message: error.message,
        });
    } finally {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <nav className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href={`/builder?project=${projectId}`}>
              <Button variant="ghost">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Editor
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <Rocket className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-2">Deploy to Vercel</h1>
          <p className="text-slate-600">
            Deploy your website to production with a single click
          </p>
        </div>

        {deploymentStatus === 'idle' && (
          <Card>
            <CardHeader>
              <CardTitle>Deployment Settings</CardTitle>
              <CardDescription>
                Configure your deployment settings before launching
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="my-awesome-website"
                />
                <p className="text-sm text-slate-500">
                  Your website will be available at: {projectName}.vercel.app
                </p>
              </div>

              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="border rounded-lg p-4 bg-slate-50">
                  <p className="text-sm text-slate-600">
                    <strong>HTML:</strong> {project.html_content.length} characters
                  </p>
                  <p className="text-sm text-slate-600">
                    <strong>CSS:</strong> {project.css_content.length} characters
                  </p>
                  <p className="text-sm text-slate-600">
                    <strong>JavaScript:</strong> {project.js_content?.length || 0} characters
                  </p>
                </div>
              </div>

              <Button
                onClick={handleDeploy}
                disabled={!projectName || isDeploying}
                className="w-full"
                size="lg"
              >
                {isDeploying ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-5 w-5" />
                    Deploy Now
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {deploymentStatus === 'deploying' && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Deploying Your Website</h2>
                <p className="text-slate-600">
                  This may take a few moments. Please do not close this page.
                </p>
                <div className="mt-6 space-y-2 text-left max-w-md mx-auto">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Building project files</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span>Deploying to Vercel</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {deploymentStatus === 'success' && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="py-12">
              <div className="text-center">
                <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2 text-green-900">
                  Deployment Successful!
                </h2>
                <p className="text-green-700 mb-6">
                  Your website is now live and accessible to the world
                </p>
                <div className="bg-white rounded-lg p-4 mb-6 border border-green-200">
                  <p className="text-sm text-slate-600 mb-2">Your website URL:</p>
                  <a
                    href={deploymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-mono text-lg flex items-center justify-center gap-2"
                  >
                    {deploymentUrl}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                <div className="flex gap-4 justify-center">
                  <a href={deploymentUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="lg">
                      <ExternalLink className="mr-2 h-5 w-5" />
                      Visit Website
                    </Button>
                  </a>
                  <Link href="/dashboard">
                    <Button size="lg" variant="outline">
                      Go to Dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {deploymentStatus === 'error' && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-12">
              <div className="text-center">
                <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2 text-red-900">
                  Deployment Failed
                </h2>
                <p className="text-red-700 mb-4">
                  We encountered an error while deploying your website
                </p>
                {errorMessage && (
                  <div className="bg-white rounded-lg p-4 mb-6 border border-red-200">
                    <p className="text-sm text-red-600 font-mono">{errorMessage}</p>
                  </div>
                )}
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={() => {
                      setDeploymentStatus('idle');
                      setErrorMessage('');
                    }}
                    size="lg"
                  >
                    Try Again
                  </Button>
                  <Link href={`/builder?project=${projectId}`}>
                    <Button size="lg" variant="outline">
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
