'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase, type Project, type ChatMessage } from '@/lib/supabase';
import { generateWebsiteCode, generateWebsitePlan } from '@/lib/gemini';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Send, Code, Eye, Sparkles, Rocket, Save, Home, MousePointer2, X } from 'lucide-react';
import Link from 'next/link';

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
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/');
      return;
    }

    // Case 1: Load existing project
    if (projectId) {
      const { data: existingProject } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (existingProject) {
        setProject(existingProject);
        setHtmlContent(existingProject.html_content);
        setCssContent(existingProject.css_content);
        setJsContent(existingProject.js_content || '');

        // Load chat history
        const { data: chatHistory } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true });

        if (chatHistory) {
          setMessages(chatHistory);
        }
        return;
      }
    }

    // Case 2: Create from template
    if (templateId) {
      const { data: template } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .maybeSingle();

      if (template) {
        setHtmlContent(template.html_content);
        setCssContent(template.css_content);
        setJsContent(template.js_content || '');

        const { data: newProject } = await supabase
          .from('projects')
          .insert({
            user_id: user.id,
            name: `${template.name} - Copy`,
            description: template.description,
            template_id: template.id,
            html_content: template.html_content,
            css_content: template.css_content,
            js_content: template.js_content || '',
            status: 'draft',
          })
          .select()
          .single();

        if (newProject) {
          setProject(newProject);
        }
      }
    } else {
      // Case 3: Create new blank project
      const { data: newProject } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: 'New Website',
          description: 'Created with AI',
          html_content: '',
          css_content: '',
          js_content: '',
          status: 'draft',
        })
        .select()
        .single();

      if (newProject) {
        setProject(newProject);
      }
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

    const userMessage: Partial<ChatMessage> = {
      project_id: project.id,
      role: 'user',
      content: selectedElement
        ? `[CONTEXT: User selected <${selectedElement.tagName}> element containing text "${selectedElement.text}"]\n${input}`
        : input,
    };

    setMessages([...messages, userMessage as ChatMessage]);
    setInput('');
    setIsGenerating(true);

    try {
      await supabase.from('chat_messages').insert(userMessage);

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

      await supabase
        .from('projects')
        .update({
          html_content: result.html,
          css_content: result.css,
          js_content: result.js,
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);

      const assistantMessage: Partial<ChatMessage> = {
        project_id: project.id,
        role: 'assistant',
        content: 'I have generated your website based on your requirements. You can see the preview on the right. Let me know if you would like any changes!',
      };

      await supabase.from('chat_messages').insert(assistantMessage);
      setMessages([...messages, userMessage as ChatMessage, assistantMessage as ChatMessage]);
      setGenerationStatus('completed');
    } catch (error) {
      console.error('Error generating website:', error);
      const errorMessage: Partial<ChatMessage> = {
        project_id: project.id,
        role: 'assistant',
        content: 'Sorry, I encountered an error while generating your website. Please try again.',
      };
      setMessages([...messages, userMessage as ChatMessage, errorMessage as ChatMessage]);
      setGenerationStatus('idle');
    } finally {
      setIsGenerating(false);
      setTimeout(() => setGenerationStatus('idle'), 3000);
    }
  };

  const handleDeploy = async () => {
    if (!project) return;
    router.push(`/deploy/${project.id}`);
  };

  const handleSave = async () => {
    if (!project) return;

    await supabase
      .from('projects')
      .update({
        html_content: htmlContent,
        css_content: cssContent,
        js_content: jsContent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', project.id);

    alert('Project saved successfully!');
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
            <span className="font-semibold">{project?.name || 'Loading...'}</span>
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

            <TabsContent value="preview" className="flex-1 m-0 p-0">
              <iframe
                ref={iframeRef}
                className="w-full h-full border-0"
                title="Preview"
              />
            </TabsContent>

            <TabsContent value="code" className="flex-1 m-0 overflow-auto">
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
            </TabsContent>
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
