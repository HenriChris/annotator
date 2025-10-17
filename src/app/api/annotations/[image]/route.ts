import { NextRequest, NextResponse } from 'next/server';
import { getAnnotations, saveAnnotations, AnnotationData } from '@/lib/db';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ image: string }> }
) {
  try {
    const { image } = await context.params;
    const imageName = decodeURIComponent(image);
    const annotations = getAnnotations(imageName);

    if (!annotations) {
      return NextResponse.json({ boxes: [] });
    }

    return NextResponse.json(annotations);
  } catch (error) {
    console.error('Error getting annotations:', error);
    return NextResponse.json(
      { error: 'Failed to get annotations' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ image: string }> }
) {
  try {
    const { image } = await context.params;
    const imageName = decodeURIComponent(image);
    const data: AnnotationData = await request.json();

    saveAnnotations(imageName, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving annotations:', error);
    return NextResponse.json(
      { error: 'Failed to save annotations' },
      { status: 500 }
    );
  }
}