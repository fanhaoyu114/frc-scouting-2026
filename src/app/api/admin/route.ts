import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId } from '@/lib/db';

// GET - Fetch all users and system stats
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();

    // Get all users
    const usersResult = await db.execute(`
      SELECT u.id, u.username, u.name, u.isAdmin
      FROM User u
      ORDER BY u.id DESC
    `);

    const users = usersResult.rows.map(row => ({
      id: row.id,
      username: row.username,
      name: row.name,
      isAdmin: row.isAdmin === 1,
      _count: { scoutingRecords: 0 }
    }));

    // Get system stats
    const teamCount = await db.execute('SELECT COUNT(*) as count FROM Team');
    const matchCount = await db.execute('SELECT COUNT(*) as count FROM Match');
    const recordCount = await db.execute('SELECT COUNT(*) as count FROM ScoutingRecord');

    return NextResponse.json({
      users,
      stats: {
        teamCount: (teamCount.rows[0]?.count as number) || 0,
        matchCount: (matchCount.rows[0]?.count as number) || 0,
        recordCount: (recordCount.rows[0]?.count as number) || 0
      }
    });
  } catch (error) {
    console.error('Get admin data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();
    const { username, password, name, isAdmin } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    // Check if username exists
    const existing = await db.execute({
      sql: 'SELECT * FROM User WHERE username = ?',
      args: [username]
    });

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    const id = generateId();
    await db.execute({
      sql: 'INSERT INTO User (id, username, password, name, isAdmin) VALUES (?, ?, ?, ?, ?)',
      args: [id, username, password, name || null, isAdmin ? 1 : 0]
    });

    return NextResponse.json({
      id,
      username,
      name,
      isAdmin: isAdmin || false
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete user or clear data
export async function DELETE(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');

    if (action === 'clear-records') {
      await db.execute('DELETE FROM ScoutingRecord');
      return NextResponse.json({ success: true, message: 'All records cleared' });
    }

    if (action === 'clear-teams') {
      await db.execute('DELETE FROM ScoutingRecord');
      await db.execute('DELETE FROM Team');
      return NextResponse.json({ success: true, message: 'All teams cleared' });
    }

    if (action === 'clear-matches') {
      await db.execute('DELETE FROM ScoutingRecord');
      await db.execute('DELETE FROM Match');
      return NextResponse.json({ success: true, message: 'All matches cleared' });
    }

    if (action === 'clear-all') {
      await db.execute('DELETE FROM ScoutingRecord');
      await db.execute('DELETE FROM Match');
      await db.execute('DELETE FROM Team');
      return NextResponse.json({ success: true, message: 'All data cleared' });
    }

    if (userId) {
      await db.execute({ sql: 'DELETE FROM Session WHERE userId = ?', args: [userId] });
      await db.execute({ sql: 'DELETE FROM User WHERE id = ?', args: [userId] });
      return NextResponse.json({ success: true, message: 'User deleted' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Admin delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update user
export async function PUT(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();
    const { id, username, password, name, isAdmin } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const updates: string[] = [];
    const args: (string | number | null)[] = [];

    if (username) {
      updates.push('username = ?');
      args.push(username);
    }
    if (password) {
      updates.push('password = ?');
      args.push(password);
    }
    if (name !== undefined) {
      updates.push('name = ?');
      args.push(name);
    }
    if (isAdmin !== undefined) {
      updates.push('isAdmin = ?');
      args.push(isAdmin ? 1 : 0);
    }

    if (updates.length > 0) {
      args.push(id);
      await db.execute({
        sql: `UPDATE User SET ${updates.join(', ')} WHERE id = ?`,
        args
      });
    }

    return NextResponse.json({ id, username, name, isAdmin });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
