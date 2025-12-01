import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Template from '@/models/Template';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    // Only return active templates
    const templates = await Template.find({ is_active: true }).sort({
      created_at: -1,
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
