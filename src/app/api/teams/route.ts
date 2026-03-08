import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const result = await db.execute(`
      SELECT t.*, COUNT(sr.id) as recordCount
      FROM Team t
      LEFT JOIN ScoutingRecord sr ON t.id = sr.teamId
      GROUP BY t.id
      ORDER BY t.number ASC
    `);

    const teams = result.rows.map(row => ({
      id: row.id,
      number: row.number,
      name: row.name,
      _count: { scoutingRecords: (row.recordCount as number) || 0 }
    }));

    return NextResponse.json(teams);
  } catch (error) {
    console.error('Get teams error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();
    const { number, name } = body;

    if (!number) {
      return NextResponse.json({ error: 'Team number is required' }, { status: 400 });
    }

    const existing = await db.execute({ sql: 'SELECT * FROM Team WHERE number = ?', args: [number] });
    if (existing.rows.length > 0) {
      return NextResponse.json(existing.rows[0]);
    }

    const id = generateId();
    await db.execute({
      sql: 'INSERT INTO Team (id, number, name) VALUES (?, ?, ?)',
      args: [id, number, name || null]
    });

    return NextResponse.json({ id, number, name });
  } catch (error) {
    console.error('Create team error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    await db.execute({ sql: 'DELETE FROM Team WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete team error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
