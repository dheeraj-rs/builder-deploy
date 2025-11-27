import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      projectName,
      htmlContent,
      cssContent,
      jsContent,
      framework,
      rootDirectory,
      buildCommand,
      outputDirectory,
      installCommand,
      envVars,
    } = body;

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

    const deploymentPayload: any = {
      name: projectName,
      files: files.map((f) => ({
        file: f.file,
        data: Buffer.from(f.data).toString('base64'),
        encoding: 'base64',
      })),
      projectSettings: {
        framework: framework || null,
        rootDirectory: rootDirectory || null,
        buildCommand: buildCommand || null,
        outputDirectory: outputDirectory || null,
        installCommand: installCommand || null,
      },
      target: 'production',
    };

    // Add environment variables if provided
    if (envVars && Array.isArray(envVars) && envVars.length > 0) {
      // Note: Vercel API v13 deployments endpoint might not support setting env vars directly for the project creation in the same call easily
      // without creating the project first, but we can try passing it in 'env' property which some versions support for the build.
      // Alternatively, we would need to create the project first.
      // For this implementation, we will try passing it as 'env' object which is common for defining build envs.
      const envObj: Record<string, string> = {};
      envVars.forEach((e: any) => {
        if (e.key && e.value) {
          envObj[e.key] = e.value;
        }
      });
      deploymentPayload.env = envObj;
    }

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
