import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, projectName, htmlContent, cssContent, jsContent } = body;

    const vercelToken = process.env.VERCEL_TOKEN;

    if (!vercelToken) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Vercel token not configured. Please add VERCEL_TOKEN to your environment variables.',
        },
        { status: 500 }
      );
    }

    const files = [
      {
        file: 'index.html',
        data: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <style>${cssContent}</style>
</head>
<body>
  ${htmlContent}
  ${jsContent ? `<script>${jsContent}</script>` : ''}
</body>
</html>`,
      },
    ];

    const deploymentPayload = {
      name: projectName,
      files: files.map((f) => ({
        file: f.file,
        data: Buffer.from(f.data).toString('base64'),
        encoding: 'base64',
      })),
      projectSettings: {
        framework: null,
      },
      target: 'production',
    };

    const deploymentResponse = await fetch(
      'https://api.vercel.com/v13/deployments',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deploymentPayload),
      }
    );

    if (!deploymentResponse.ok) {
      const errorData = await deploymentResponse.json();
      console.error('Vercel API Error:', errorData);

      return NextResponse.json(
        {
          success: false,
          error: errorData.error?.message || 'Failed to deploy to Vercel',
        },
        { status: deploymentResponse.status }
      );
    }

    const deploymentData = await deploymentResponse.json();

    // Prefer the alias (production URL) if available, otherwise use the deployment URL
    let deploymentUrl = `https://${deploymentData.url}`;
    if (deploymentData.alias && deploymentData.alias.length > 0) {
      deploymentUrl = `https://${deploymentData.alias[0]}`;
    }

    return NextResponse.json({
      success: true,
      deploymentId: deploymentData.id,
      url: deploymentUrl,
    });
  } catch (error: any) {
    console.error('Deployment error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
