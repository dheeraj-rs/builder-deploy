import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const deploymentId = searchParams.get('id');

  if (!deploymentId) {
    return NextResponse.json(
      { success: false, error: 'Deployment ID is required' },
      { status: 400 }
    );
  }

  const vercelToken = process.env.VERCEL_TOKEN;

  if (!vercelToken) {
    return NextResponse.json(
      {
        success: false,
        error: 'Vercel token not configured',
      },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://api.vercel.com/v13/deployments/${deploymentId}`,
      {
        headers: {
          Authorization: `Bearer ${vercelToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          success: false,
          error:
            errorData.error?.message || 'Failed to fetch deployment status',
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Prefer the alias (production URL) if available
    let deploymentUrl = `https://${data.url}`;
    if (data.alias && data.alias.length > 0) {
      deploymentUrl = `https://${data.alias[0]}`;
    }

    return NextResponse.json({
      success: true,
      status: data.readyState, // QUEUED, BUILDING, READY, ERROR, CANCELED
      url: deploymentUrl,
      createdAt: data.createdAt,
      buildingAt: data.buildingAt,
      readyAt: data.readyAt,
    });
  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
