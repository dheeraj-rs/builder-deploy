'use client';

import { useEffect, useState, useRef, Suspense, createContext, useContext, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { generateWebsiteCode, generateWebsitePlan } from '@/lib/gemini';
import { Loader2, Send, Code, Eye, Sparkles, Rocket, Save, Home, MousePointer2, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import '@/app/styles/builder.scss';

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

const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("card", className)} {...props} />
);

// Tabs Implementation
const TabsContext = createContext<{ value: string; onValueChange: (value: string) => void } | null>(null);

const Tabs = ({ value, onValueChange, children, className }: { value: string; onValueChange: (value: string) => void; children: React.ReactNode; className?: string }) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn("tabs", className)}>{children}</div>
    </TabsContext.Provider>
  );
};

const TabsList = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("tabs__list", className)}>
    {children}
  </div>
);

const TabsTrigger = ({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");

  const isActive = context.value === value;

  return (
    <button
      className={cn(
        "tabs__trigger",
        isActive && "tabs__trigger--active",
        className
      )}
      onClick={() => context.onValueChange(value)}
      data-state={isActive ? "active" : "inactive"}
    >
      {children}
    </button>
  );
};

const TabsContent = ({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");

  if (context.value !== value) return null;

  return (
    <div className={cn("tabs__content", className)}>
      {children}
    </div>
  );
};


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
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'thinking' | 'generating' | 'saving' | 'completed'>('idle');
  const [generationTime, setGenerationTime] = useState(0);
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
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'ELEMENT_SELECTED') {
        setSelectedElement(event.data.payload);
        setIsSelectMode(false); // Auto-exit select mode after selection
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const initializeProject = useCallback(async () => {
    try {
      // Case 1: Load existing project
      if (projectId) {
        const response = await fetch(`/api/projects/${projectId}`);
        if (!response.ok) {
          if (response.status === 404) {
            // Project not found, redirect to builder without project ID to create new
            router.replace('/builder');
            return;
          }
          throw new Error('Failed to fetch project');
        }

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
            // Update URL with new project ID
            router.replace(`/builder?project=${newProject._id}`);
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
          // Update URL with new project ID
          router.replace(`/builder?project=${newProject._id}`);
        }
      }
    } catch (err: any) {
      console.error('Error initializing project:', err);
      setError(err.message || 'Failed to load project. Please check your connection and configuration.');
    }
  }, [projectId, templateId, router]);

  const updatePreview = useCallback(() => {
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
            z-index: 999999 !important;
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
  }, [cssContent, htmlContent, jsContent, isSelectMode]);

  useEffect(() => {
    // Notify iframe about select mode change
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'TOGGLE_SELECT_MODE',
        isSelectMode
      }, '*');
    }
  }, [isSelectMode]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      setGenerationTime(0);
      interval = setInterval(() => {
        setGenerationTime((prev) => prev + 0.1);
      }, 100);
    } else {
      setGenerationTime(0);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    initializeProject();
  }, [initializeProject]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (activeTab === 'preview') {
      updatePreview();
    }
  }, [activeTab, updatePreview]);



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

      setGenerationStatus('saving');

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
        content: `Sorry, I encountered an error while generating your website. Details: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    <div className="builder-container">
      <nav className="builder-nav">
        <div className="builder-nav__left">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
          <div className="builder-nav__project-info">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <span>{error ? `Error: ${error}` : (project?.name || 'Loading...')}</span>
          </div>
        </div>
        <div className="builder-nav__actions">
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

      <div className="builder-workspace">
        <div className="chat-panel">
          <div className="chat-panel__messages">
            {messages.length === 0 ? (
              <div className="chat-panel__empty-state">
                <div>
                  <Sparkles className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h2>Start Building with AI</h2>
                  <p>
                    Describe the website you want to create, and I will generate it for you!
                  </p>
                  <div>
                    <p>Try asking:</p>
                    <ul>
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
                  <div
                    key={idx}
                    className={`chat-message ${msg.role === 'user' ? 'chat-message--user' : 'chat-message--assistant'}`}
                  >
                    <div className="chat-message__content">
                      <div className="chat-message__avatar">
                        {msg.role === 'user' ? 'U' : 'AI'}
                      </div>
                      <div className="chat-message__text">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />

                {isGenerating && (
                  <div className="loading-indicator">
                    <div className="loading-indicator__content">
                      <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white animate-pulse">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div className="loading-indicator__text">
                        <div className="loading-indicator__status">
                          <span className="loading-indicator__text">
                            {generationStatus === 'thinking' && 'Thinking...'}
                            {generationStatus === 'generating' && 'Generating Code...'}
                            {generationStatus === 'saving' && 'Saving & Finalizing...'}
                          </span>
                          <span className="loading-indicator__time">
                            {generationTime.toFixed(1)}s
                          </span>
                          <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                        </div>
                        {generationStatus === 'thinking' && currentThought && (
                          <p className="loading-indicator__thought">
                            {currentThought}
                          </p>
                        )}
                        {generationStatus === 'generating' && (
                          <div className="loading-indicator__progress">
                            <div className="loading-indicator__progress-bar" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="chat-panel__input-wrapper">
            {selectedElement && (
              <div className="chat-panel__selection-chip">
                <MousePointer2 className="h-3 w-3" />
                <span className="font-medium">Selected:</span>
                <code>&lt;{selectedElement.tagName}&gt;</code>
                <button
                  className="chat-panel__selection-remove"
                  onClick={() => setSelectedElement(null)}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="chat-panel__input-group">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={selectedElement ? "Describe changes for this element..." : "Describe what you want to build..."}
                disabled={isGenerating}
                className="chat-panel__input"
              />
              <Button
                onClick={handleSendMessage}
                disabled={isGenerating || !input.trim()}
                className="chat-panel__send-btn"
                size="icon"
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


        <div className="preview-panel">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="preview-panel__tabs">
            <div className="preview-panel__header">
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

            <div className="preview-panel__content">
              {/* Preview Tab - Always mounted, toggled via CSS */}
              <div
                className="preview-panel__iframe-wrapper"
                style={{ visibility: activeTab === 'preview' ? 'visible' : 'hidden', zIndex: activeTab === 'preview' ? 10 : 0 }}
              >
                <iframe
                  ref={iframeRef}
                  className="preview-iframe"
                  title="Preview"
                />
              </div>

              {/* Code Tab */}
              <div
                className="preview-panel__code-wrapper"
                style={{ visibility: activeTab === 'code' ? 'visible' : 'hidden', zIndex: activeTab === 'code' ? 10 : 0 }}
              >
                <div className="space-y-4">
                  <div className="code-block">
                    <h3>HTML</h3>
                    <pre>
                      <code>{htmlContent || '// HTML will appear here'}</code>
                    </pre>
                  </div>
                  <div className="code-block">
                    <h3>CSS</h3>
                    <pre>
                      <code>{cssContent || '// CSS will appear here'}</code>
                    </pre>
                  </div>
                  {jsContent && (
                    <div className="code-block">
                      <h3>JavaScript</h3>
                      <pre>
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
    </div >
  );
}

export default function BuilderPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
      <BuilderContent />
    </Suspense>
  );
}
