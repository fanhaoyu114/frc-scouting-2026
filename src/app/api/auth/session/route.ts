import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const result = await db.execute({
      sql: `SELECT s.*, u.id as userId, u.username, u.name, u.isAdmin
            FROM Session s JOIN User u ON s.userId = u.id WHERE s.token = ?`,
      args: [token]
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const session = result.rows[0] as any;
    if (new Date(session.expiresAt as string) < new Date()) {
      await db.execute({ sql: 'DELETE FROM Session WHERE token = ?', args: [token] });
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: { id: session.userId, username: session.username, name: session.name, isAdmin: session.isAdmin === 1 }
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
