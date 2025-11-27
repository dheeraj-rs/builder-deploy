/*
  # Website Builder Platform Schema

  1. New Tables
    - `projects`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text)
      - `description` (text)
      - `template_id` (uuid, nullable)
      - `html_content` (text)
      - `css_content` (text)
      - `js_content` (text)
      - `status` (text) - draft, published, deployed
      - `vercel_deployment_id` (text, nullable)
      - `vercel_url` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `templates`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `category` (text)
      - `thumbnail_url` (text)
      - `html_content` (text)
      - `css_content` (text)
      - `js_content` (text)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
    
    - `chat_messages`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `role` (text) - user or assistant
      - `content` (text)
      - `created_at` (timestamptz)
    
    - `deployments`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `vercel_deployment_id` (text)
      - `url` (text)
      - `status` (text) - pending, success, error
      - `error_message` (text, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own projects
    - Templates are publicly readable
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  template_id uuid,
  html_content text DEFAULT '',
  css_content text DEFAULT '',
  js_content text DEFAULT '',
  status text DEFAULT 'draft',
  vercel_deployment_id text,
  vercel_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT 'general',
  thumbnail_url text DEFAULT '',
  html_content text NOT NULL,
  css_content text DEFAULT '',
  js_content text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create deployments table
CREATE TABLE IF NOT EXISTS deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  vercel_deployment_id text,
  url text,
  status text DEFAULT 'pending',
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Templates policies (publicly readable)
CREATE POLICY "Anyone can view active templates"
  ON templates FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Chat messages policies
CREATE POLICY "Users can view chat messages for their projects"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = chat_messages.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chat messages for their projects"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = chat_messages.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Deployments policies
CREATE POLICY "Users can view deployments for their projects"
  ON deployments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = deployments.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create deployments for their projects"
  ON deployments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = deployments.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Insert sample templates
INSERT INTO templates (name, description, category, thumbnail_url, html_content, css_content) VALUES
(
  'Modern Portfolio',
  'A clean and professional portfolio website with hero section, projects showcase, and contact form',
  'portfolio',
  'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=800',
  '<!DOCTYPE html><html><head><title>Portfolio</title></head><body><header class="hero"><h1>John Doe</h1><p>Full Stack Developer</p></header><section class="projects"><h2>My Projects</h2><div class="project-grid"><div class="project-card"><h3>Project 1</h3><p>Description here</p></div></div></section></body></html>',
  'body{margin:0;font-family:system-ui,sans-serif}.hero{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:120px 20px;text-align:center}.hero h1{font-size:3rem;margin:0}.projects{padding:60px 20px;max-width:1200px;margin:0 auto}.project-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:30px;margin-top:40px}.project-card{background:white;border-radius:12px;padding:30px;box-shadow:0 4px 6px rgba(0,0,0,0.1)}'
),
(
  'SaaS Landing Page',
  'Modern SaaS landing page with features section, pricing, and call-to-action',
  'business',
  'https://images.pexels.com/photos/265087/pexels-photo-265087.jpeg?auto=compress&cs=tinysrgb&w=800',
  '<!DOCTYPE html><html><head><title>SaaS Product</title></head><body><nav class="navbar"><div class="logo">YourSaaS</div><button class="cta-btn">Get Started</button></nav><section class="hero-section"><h1>Build Better Products Faster</h1><p>The all-in-one platform for modern teams</p><button class="primary-btn">Start Free Trial</button></section><section class="features"><div class="feature"><h3>Feature 1</h3><p>Amazing capability</p></div></section></body></html>',
  'body{margin:0;font-family:Inter,sans-serif}.navbar{display:flex;justify-content:space-between;align-items:center;padding:20px 40px;background:white;box-shadow:0 2px 4px rgba(0,0,0,0.05)}.hero-section{text-align:center;padding:100px 20px;background:linear-gradient(to bottom,#f8f9fa,white)}.hero-section h1{font-size:3.5rem;margin-bottom:20px}.primary-btn{background:#0070f3;color:white;border:none;padding:16px 32px;border-radius:8px;font-size:1.1rem;cursor:pointer}.features{display:grid;grid-template-columns:repeat(3,1fr);gap:40px;padding:80px 40px;max-width:1200px;margin:0 auto}'
),
(
  'Restaurant Menu',
  'Beautiful restaurant website with menu showcase and online ordering',
  'restaurant',
  'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800',
  '<!DOCTYPE html><html><head><title>Restaurant</title></head><body><header class="header"><h1>Delicious Bites</h1><p>Fine Dining Experience</p></header><section class="menu-section"><h2>Our Menu</h2><div class="menu-items"><div class="menu-item"><h3>Signature Dish</h3><p class="price">$24.99</p><p>Fresh ingredients, expertly prepared</p></div></div></section></body></html>',
  'body{margin:0;font-family:Playfair Display,serif;background:#fafafa}.header{background:url(https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg) center/cover;color:white;text-align:center;padding:150px 20px;position:relative}.header::before{content:"";position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5)}.header h1{position:relative;font-size:4rem;margin:0}.menu-section{max-width:900px;margin:60px auto;padding:0 20px}.menu-items{display:grid;gap:30px}.menu-item{background:white;padding:30px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1)}.price{color:#d4af37;font-size:1.5rem;font-weight:bold}'
);
