# Setup Guide - WebForge AI

This guide will help you set up and run the WebForge AI website builder platform.

## Prerequisites

- Node.js 18+ installed
- A Supabase account
- A Google Gemini API key
- (Optional) A Vercel account and API token for deployments

## Step 1: Clone and Install

```bash
# Install dependencies
npm install
```

## Step 2: Set Up Supabase

### 2.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in your project details
4. Wait for the project to be created

### 2.2 Run the Database Migration

The database schema is already created through the MCP Supabase tools. The following tables were created:

- **projects**: Stores user-created websites
- **templates**: Stores pre-built website templates
- **chat_messages**: Stores AI conversation history
- **deployments**: Stores deployment history

Sample templates are automatically inserted during migration.

### 2.3 Get Your Supabase Credentials

1. Go to Project Settings > API
2. Copy your Project URL (looks like: `https://xxxxx.supabase.co`)
3. Copy your anon/public key

## Step 3: Configure Environment Variables

Update the `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Gemini API Key
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSy...

# Vercel Token (Optional - for one-click deployments)
VERCEL_TOKEN=your_vercel_token
```

### Getting a Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Get API Key"
3. Create a new API key
4. Copy and paste it into your `.env.local`

### Getting a Vercel Token (Optional)

1. Log into [Vercel](https://vercel.com)
2. Go to Account Settings > Tokens
3. Create a new token
4. Copy and paste it into your `.env.local`

## Step 4: Run the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your application.

## Step 5: Test the Application

### 5.1 Sign In

The application includes a demo authentication flow. Click "Sign In" on the homepage. It will automatically create a demo account:

- Email: `demo@example.com`
- Password: `demo123456`

### 5.2 Explore Templates

Browse the pre-built templates on the homepage. Click "Use This Template" to start building from a template.

### 5.3 Chat with AI

1. Click "Start Building with AI"
2. Type a description like: "Create a modern landing page for a coffee shop"
3. Watch as AI generates your website in real-time
4. See the live preview on the right side
5. Switch to "Code" tab to view the generated HTML, CSS, and JavaScript

### 5.4 Deploy to Vercel

1. Click "Deploy to Vercel" in the builder
2. Enter a project name (e.g., `my-awesome-site`)
3. Click "Deploy Now"
4. Wait for deployment to complete
5. Visit your live website!

## Features

### Landing Page
- Hero section with call-to-action
- Feature highlights
- Template showcase
- Responsive design

### AI Builder
- Split-pane interface
- Chat with AI to generate websites
- Live preview with iframe
- Code view (HTML, CSS, JS)
- Real-time updates
- Project saving

### Dashboard
- View all your projects
- Edit existing projects
- Delete projects
- Quick access to live sites

### Deployment
- One-click deploy to Vercel
- Deployment status tracking
- Live URL generation
- Error handling

## Architecture

### Frontend
- **Framework**: Next.js 13 (App Router)
- **UI**: Tailwind CSS + shadcn/ui components
- **State**: React hooks
- **Icons**: Lucide React

### Backend
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **AI**: Google Gemini 2.0 Flash
- **Deployment**: Vercel API

### File Structure

```
/app
  /page.tsx                 - Landing page
  /builder/page.tsx         - AI builder interface
  /dashboard/page.tsx       - Project management
  /deploy/[id]/page.tsx     - Deployment page
  /api/deploy/route.ts      - Vercel deployment API

/lib
  /supabase.ts              - Supabase client & types
  /gemini.ts                - Gemini AI integration

/components/ui              - shadcn/ui components
```

## Troubleshooting

### Build Errors

If you see Supabase URL errors during build:
- Make sure `.env.local` has valid placeholder URLs
- The app uses fallback values for build time
- Real values are only needed at runtime

### Deployment Fails

If Vercel deployment fails:
- Check that `VERCEL_TOKEN` is set correctly
- Ensure the project name is valid (lowercase, hyphens only)
- Check Vercel API status

### AI Generation Errors

If AI fails to generate code:
- Verify `NEXT_PUBLIC_GEMINI_API_KEY` is correct
- Check your Gemini API quota
- Try a simpler prompt

## Production Deployment

### Deploy to Vercel

```bash
vercel
```

### Environment Variables in Production

Add all environment variables in your Vercel project settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_GEMINI_API_KEY`
- `VERCEL_TOKEN`

## Security Notes

1. **Never commit** `.env.local` to version control
2. **Row Level Security (RLS)** is enabled on all Supabase tables
3. **Vercel token** should be kept secure - it has deployment permissions
4. **Gemini API key** should be protected

## Next Steps

1. Customize the templates in the database
2. Modify the AI prompts for better results
3. Add user authentication flows
4. Integrate analytics
5. Add custom domain support
6. Implement team collaboration features

## Support

For issues or questions:
- Check the README.md
- Review the database schema in the migration
- Test with simple prompts first

## License

MIT
