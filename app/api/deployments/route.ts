import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Deployment from '@/models/Deployment';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();

    // Basic validation
    if (!body.project_id || !body.vercel_deployment_id || !body.url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const deployment = await Deployment.create(body);
    return NextResponse.json(deployment, { status: 201 });
  } catch (error) {
    console.error('Error creating deployment:', error);
    return NextResponse.json(
      { error: 'Failed to create deployment' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { vercel_deployment_id, ...updateData } = body;

    if (!vercel_deployment_id) {
      return NextResponse.json(
        { error: 'vercel_deployment_id is required' },
        { status: 400 }
      );
    }

    const deployment = await Deployment.findOneAndUpdate(
      { vercel_deployment_id },
      { ...updateData, updated_at: new Date() },
      { new: true }
    );

    if (!deployment) {
      return NextResponse.json(
        { error: 'Deployment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(deployment);
  } catch (error) {
    console.error('Error updating deployment:', error);
    return NextResponse.json(
      { error: 'Failed to update deployment' },
      { status: 500 }
    );
  }
}
