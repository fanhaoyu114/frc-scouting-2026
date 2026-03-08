import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Logout endpoint
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      await db.session.deleteMany({
        where: { token }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ success: true });
  }
}
