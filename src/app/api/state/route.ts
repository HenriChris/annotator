import { getAppState, saveAppState } from '@/lib/db';
import { AppState } from '@/types/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const state = getAppState();
    return NextResponse.json(state);
  } catch (error) {
    console.error('Error getting state:', error);
    return NextResponse.json(
      { error: 'Failed to get state' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const state: AppState = await request.json();
    saveAppState(state);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving state:', error);
    return NextResponse.json(
      { error: 'Failed to save state' },
      { status: 500 }
    );
  }
}