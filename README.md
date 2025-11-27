# WebForge AI - No-Code Website Builder

An AI-powered website builder platform that allows users to create production-ready websites through natural language conversation. Features include template selection, real-time preview, and one-click deployment to Vercel.

## Features

- **AI-Powered Generation**: Chat with Gemini AI to generate complete websites
- **Template Library**: Start with professionally designed templates
- **Live Preview**: See changes in real-time as you build
- **Code View**: Access generated HTML, CSS, and JavaScript
- **One-Click Deploy**: Deploy to Vercel with a single click
- **Project Management**: Dashboard to manage all your projects

## Setup Instructions

### 1. Configure Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the migration in `supabase/migrations` or use the provided SQL schema
3. Get your project URL and anon key from Settings > API

### 2. Configure Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_GEMINI_API_KEY=your-gemini-api-key
VERCEL_TOKEN=your-vercel-token
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Deployment

The platform is designed to work with Next.js and can be deployed to:
- Vercel
- Netlify
- AWS Amplify
- Any Node.js hosting

## Database Schema

The application uses Supabase with the following tables:
- `projects`: User-created websites
- `templates`: Pre-built website templates
- `chat_messages`: AI conversation history
- `deployments`: Deployment history

## API Integration

### Gemini AI
Used for generating website code from natural language descriptions.

### Vercel API
Handles one-click deployments to production.

## Technology Stack

- **Frontend**: Next.js 13, React, Tailwind CSS, shadcn/ui
- **AI**: Google Gemini 2.0 Flash
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **Authentication**: Supabase Auth

## Usage

1. **Browse Templates**: Explore pre-built templates on the homepage
2. **Start Building**: Click "Start Building with AI" or choose a template
3. **Chat with AI**: Describe your website requirements in plain English
4. **Preview**: See real-time preview of generated website
5. **Deploy**: One-click deploy to Vercel
6. **Manage**: View and manage all projects from the dashboard

## Demo Account

For testing purposes, a demo account can be automatically created:
- Email: demo@example.com
- Password: demo123456

## License

MIT
