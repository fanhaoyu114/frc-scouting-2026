import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (token) {
      await db.execute({ sql: 'DELETE FROM Session WHERE token = ?', args: [token] });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ success: true });
  }
}
