'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { generateWebsiteCode, generateWebsitePlan } from '@/lib/gemini';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Send, Code, Eye, Sparkles, Rocket, Save, Home, MousePointer2, X } from 'lucide-react';
import Link from 'next/link';

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

type ChatMessage = {
  _id: string;
  project_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

function BuilderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const templateId = searchParams.get('template');
  const projectId = searchParams.get('project');

  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'thinking' | 'generating' | 'completed'>('idle');
  const [currentThought, setCurrentThought] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [cssContent, setCssContent] = useState('');
  const [jsContent, setJsContent] = useState('');
  const [activeTab, setActiveTab] = useState('preview');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<{ tagName: string; html: string; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeProject();
  }, [templateId, projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (activeTab === 'preview') {
      updatePreview();
    }
  }, [htmlContent, cssContent, jsContent, activeTab]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'ELEMENT_SELECTED') {
        setSelectedElement(event.data.payload);
        setIsSelectMode(false); // Auto-exit select mode after selection
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    // Notify iframe about select mode change
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'TOGGLE_SELECT_MODE',
        isSelectMode
      }, '*');
    }
  }, [isSelectMode]);

  const initializeProject = async () => {
    try {
      // Case 1: Load existing project
      if (projectId) {
        const response = await fetch(`/api/projects/${projectId}`);
        if (!response.ok) throw new Error('Failed to fetch project');

        const existingProject = await response.json();

        if (existingProject) {
          setProject(existingProject);
          setHtmlContent(existingProject.html_content);
          setCssContent(existingProject.css_content);
          setJsContent(existingProject.js_content || '');

          // Load chat history
          const chatResponse = await fetch(`/api/chat?projectId=${projectId}`);
          if (chatResponse.ok) {
            const chatHistory = await chatResponse.json();
            setMessages(chatHistory);
          }
          return;
        }
      }

      // Case 2: Create from template
      if (templateId) {
        // We need to fetch templates first to find the one we want
        // In a real app, we might want a specific endpoint for a single template
        const templatesResponse = await fetch('/api/templates');
        if (!templatesResponse.ok) throw new Error('Failed to fetch templates');

        const templates = await templatesResponse.json();
        const template = templates.find((t: any) => t._id === templateId);

        if (template) {
          setHtmlContent(template.html_content);
          setCssContent(template.css_content);
          setJsContent(template.js_content || '');

          const createResponse = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: crypto.randomUUID(), // Public project
              name: `${template.name} - Copy`,
              description: template.description,
              template_id: template._id,
              html_content: template.html_content,
              css_content: template.css_content,
              js_content: template.js_content || '',
              status: 'draft',
            }),
          });

          if (!createResponse.ok) throw new Error('Failed to create project');
          const newProject = await createResponse.json();

          if (newProject) {
            setProject(newProject);
          }
        }
      } else {
        // Case 3: Create new blank project
        const createResponse = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: crypto.randomUUID(), // Public project
            name: 'New Website',
            description: 'Created with AI',
            html_content: '',
            css_content: '',
            js_content: '',
            status: 'draft',
          }),
        });

        if (!createResponse.ok) throw new Error('Failed to create project');
        const newProject = await createResponse.json();

        if (newProject) {
          setProject(newProject);
        }
      }
    } catch (err: any) {
      console.error('Error initializing project:', err);
      setError(err.message || 'Failed to load project. Please check your connection and configuration.');
    }
  };

  const updatePreview = () => {
    if (!iframeRef.current) return;

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>${cssContent}</style>
        <style>
          .webforge-selected-highlight {
            outline: 2px solid #3b82f6 !important;
            cursor: pointer !important;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
        <script>${jsContent}</script>
        <script>
          (function() {
            let isSelectMode = ${isSelectMode};
            let hoveredElement = null;

            window.addEventListener('message', (event) => {
              if (event.data.type === 'TOGGLE_SELECT_MODE') {
                isSelectMode = event.data.isSelectMode;
                if (!isSelectMode && hoveredElement) {
                  hoveredElement.classList.remove('webforge-selected-highlight');
                  hoveredElement = null;
                }
              }
            });

            document.addEventListener('mouseover', (e) => {
              if (!isSelectMode) return;
              e.stopPropagation();
              
              if (hoveredElement) {
                hoveredElement.classList.remove('webforge-selected-highlight');
              }
              
              hoveredElement = e.target;
              hoveredElement.classList.add('webforge-selected-highlight');
            });

            document.addEventListener('mouseout', (e) => {
              if (!isSelectMode) return;
              if (e.target === hoveredElement) {
                e.target.classList.remove('webforge-selected-highlight');
                hoveredElement = null;
              }
            });

            document.addEventListener('click', (e) => {
              if (!isSelectMode) return;
              e.preventDefault();
              e.stopPropagation();

              const element = e.target;
              const payload = {
                tagName: element.tagName.toLowerCase(),
                html: element.outerHTML,
                text: element.innerText.substring(0, 100)
              };

              window.parent.postMessage({
                type: 'ELEMENT_SELECTED',
                payload
              }, '*');
              
              if (hoveredElement) {
                hoveredElement.classList.remove('webforge-selected-highlight');
                hoveredElement = null;
              }
            });
          })();
        </script>
      </body>
      </html>
    `;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    iframeRef.current.src = url;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !project || isGenerating) return;

    const userMessageContent = selectedElement
      ? `[CONTEXT: User selected <${selectedElement.tagName}> element containing text "${selectedElement.text}"]\n${input}`
      : input;

    const userMessagePayload = {
      project_id: project._id,
      role: 'user',
      content: userMessageContent,
    };

    // Optimistic update
    const tempUserMessage: ChatMessage = {
      _id: crypto.randomUUID(),
      project_id: project._id,
      role: 'user',
      content: userMessageContent,
      created_at: new Date().toISOString(),
    };

    setMessages([...messages, tempUserMessage]);
    setInput('');
    setIsGenerating(true);

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userMessagePayload),
      });

      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Step 1: Thinking / Planning
      setGenerationStatus('thinking');
      const plan = await generateWebsitePlan(input, conversationHistory);
      setCurrentThought(plan);

      // Step 2: Generating Code
      setGenerationStatus('generating');
      const result = await generateWebsiteCode(input, conversationHistory);

      setHtmlContent(result.html);
      setCssContent(result.css);
      setJsContent(result.js);

      await fetch(`/api/projects/${project._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html_content: result.html,
          css_content: result.css,
          js_content: result.js,
        }),
      });

      const assistantMessagePayload = {
        project_id: project._id,
        role: 'assistant',
        content: 'I have generated your website based on your requirements. You can see the preview on the right. Let me know if you would like any changes!',
      };

      const assistantResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assistantMessagePayload),
      });

      const assistantMessage = await assistantResponse.json();

      setMessages((prev) => [...prev, assistantMessage]);
      setGenerationStatus('completed');
    } catch (error) {
      console.error('Error generating website:', error);
      const errorMessage: ChatMessage = {
        _id: crypto.randomUUID(),
        project_id: project._id,
        role: 'assistant',
        content: 'Sorry, I encountered an error while generating your website. Please try again.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setGenerationStatus('idle');
    } finally {
      setIsGenerating(false);
      setTimeout(() => setGenerationStatus('idle'), 3000);
    }
  };

  const handleDeploy = async () => {
    if (!project) return;
    router.push(`/deploy/${project._id}`);
  };

  const handleSave = async () => {
    if (!project) return;

    try {
      await fetch(`/api/projects/${project._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html_content: htmlContent,
          css_content: cssContent,
          js_content: jsContent,
        }),
      });
      alert('Project saved successfully!');
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Failed to save project');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <nav className="border-b bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-red-500">{error ? `Error: ${error}` : (project?.name || 'Loading...')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isSelectMode ? "secondary" : "outline"}
            onClick={() => setIsSelectMode(!isSelectMode)}
            className={isSelectMode ? "bg-blue-100 text-blue-700 border-blue-200" : ""}
            title="Select an element to edit"
          >
            <MousePointer2 className="h-4 w-4 mr-2" />
            {isSelectMode ? 'Select Mode On' : 'Select Element'}
          </Button>
          <Button variant="outline" onClick={handleSave} disabled={!project}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button onClick={handleDeploy} disabled={!project || !htmlContent}>
            <Rocket className="h-4 w-4 mr-2" />
            Deploy to Vercel
          </Button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r flex flex-col bg-white">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <Sparkles className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Start Building with AI</h2>
                  <p className="text-slate-600 mb-4">
                    Describe the website you want to create, and I will generate it for you!
                  </p>
                  <div className="space-y-2 text-left">
                    <p className="text-sm text-slate-500">Try asking:</p>
                    <ul className="text-sm text-slate-600 space-y-1">
                      <li>• Create a landing page for a coffee shop</li>
                      <li>• Build a portfolio website for a photographer</li>
                      <li>• Make a pricing page with 3 tiers</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <Card
                    key={idx}
                    className={`p-4 ${msg.role === 'user'
                      ? 'bg-blue-50 ml-12'
                      : 'bg-slate-50 mr-12'
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-600 text-white'
                          }`}
                      >
                        {msg.role === 'user' ? 'U' : 'AI'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  </Card>
                ))}
                <div ref={messagesEndRef} />

                {isGenerating && (
                  <div className="p-4 bg-slate-50 mr-12 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white animate-pulse">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700">
                            {generationStatus === 'thinking' ? 'Thinking...' : 'Generating Code...'}
                          </span>
                          <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                        </div>
                        {generationStatus === 'thinking' && currentThought && (
                          <p className="text-xs text-slate-500 italic animate-in fade-in duration-500">
                            {currentThought}
                          </p>
                        )}
                        {generationStatus === 'generating' && (
                          <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 animate-progress-indeterminate" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="border-t p-4 bg-white">
            {selectedElement && (
              <div className="mb-3 p-2 bg-blue-50 border border-blue-100 rounded-md flex items-center justify-between animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <MousePointer2 className="h-3 w-3" />
                  <span className="font-medium">Selected:</span>
                  <code className="bg-blue-100 px-1 rounded text-xs">
                    &lt;{selectedElement.tagName}&gt;
                  </code>
                  <span className="truncate max-w-[200px] text-xs opacity-70">
                    {selectedElement.text}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-blue-500 hover:text-blue-700 hover:bg-blue-100"
                  onClick={() => setSelectedElement(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Describe what you want to build..."
                disabled={isGenerating}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={isGenerating || !input.trim()}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="w-1/2 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="border-b bg-white px-4">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="preview" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="code" className="gap-2">
                  <Code className="h-4 w-4" />
                  Code
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 m-0 p-0 relative">
              {/* Preview Tab - Always mounted, toggled via CSS */}
              <div
                className="w-full h-full absolute inset-0"
                style={{ visibility: activeTab === 'preview' ? 'visible' : 'hidden', zIndex: activeTab === 'preview' ? 10 : 0 }}
              >
                <iframe
                  ref={iframeRef}
                  className="w-full h-full border-0"
                  title="Preview"
                />
              </div>

              {/* Code Tab */}
              <div
                className="w-full h-full absolute inset-0 bg-white"
                style={{ visibility: activeTab === 'code' ? 'visible' : 'hidden', zIndex: activeTab === 'code' ? 10 : 0 }}
              >
                <div className="p-4 space-y-4 h-full overflow-y-auto">
                  <div>
                    <h3 className="font-semibold mb-2 text-sm text-slate-600">HTML</h3>
                    <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
                      <code>{htmlContent || '// HTML will appear here'}</code>
                    </pre>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2 text-sm text-slate-600">CSS</h3>
                    <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
                      <code>{cssContent || '// CSS will appear here'}</code>
                    </pre>
                  </div>
                  {jsContent && (
                    <div>
                      <h3 className="font-semibold mb-2 text-sm text-slate-600">JavaScript</h3>
                      <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
                        <code>{jsContent}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default function BuilderPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
      <BuilderContent />
    </Suspense>
  );
}
