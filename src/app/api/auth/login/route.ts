import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId, generateToken } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    let user: { id: string; username: string; password: string; name: string | null; isAdmin: number } | null = null;

    if (username === '预览账号' && password === '6353') {
      const result = await db.execute({ sql: 'SELECT * FROM User WHERE username = ?', args: ['预览账号'] });

      if (result.rows.length > 0) {
        user = result.rows[0] as any;
      } else {
        const newId = generateId();
        await db.execute({
          sql: 'INSERT INTO User (id, username, password, name, isAdmin) VALUES (?, ?, ?, ?, 1)',
          args: [newId, '预览账号', '6353', 'Preview Account']
        });
        user = { id: newId, username: '预览账号', password: '6353', name: 'Preview Account', isAdmin: 1 };
      }
    } else {
      const result = await db.execute({ sql: 'SELECT * FROM User WHERE username = ?', args: [username] });
      if (result.rows.length === 0 || (result.rows[0] as any).password !== password) {
        return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
      }
      user = result.rows[0] as any;
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await db.execute({
      sql: 'INSERT INTO Session (id, userId, token, expiresAt) VALUES (?, ?, ?, ?)',
      args: [generateId(), user!.id, token, expiresAt]
    });

    return NextResponse.json({
      success: true,
      user: { id: user!.id, username: user!.username, name: user!.name, isAdmin: user!.isAdmin === 1 },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
