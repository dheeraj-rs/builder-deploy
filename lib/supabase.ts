import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YW1wbGUiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjI4OTYyMiwiZXhwIjoxOTMxODY1NjIyfQ.example';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Project = {
  id: string;
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

export type Template = {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail_url: string;
  html_content: string;
  css_content: string;
  js_content: string;
  is_active: boolean;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  project_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

export type Deployment = {
  id: string;
  project_id: string;
  vercel_deployment_id?: string;
  url?: string;
  status: string;
  error_message?: string;
  created_at: string;
};
