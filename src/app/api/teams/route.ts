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

    // Map to frontend expected format
    const teams = result.rows.map(row => ({
      id: row.id,
      teamNumber: row.number,
      nickname: row.name,
      city: null,
      state: null,
      country: null,
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
    const { teamNumber, nickname } = body;

    if (!teamNumber) {
      return NextResponse.json({ error: 'Team number is required' }, { status: 400 });
    }

    const existing = await db.execute({ sql: 'SELECT * FROM Team WHERE number = ?', args: [teamNumber] });
    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      return NextResponse.json({
        id: row.id,
        teamNumber: row.number,
        nickname: row.name,
        city: null,
        state: null,
        country: null
      });
    }

    const id = generateId();
    await db.execute({
      sql: 'INSERT INTO Team (id, number, name) VALUES (?, ?, ?)',
      args: [id, teamNumber, nickname || null]
    });

    return NextResponse.json({
      id,
      teamNumber,
      nickname: nickname || null,
      city: null,
      state: null,
      country: null
    });
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

    await db.execute({ sql: 'DELETE FROM ScoutingRecord WHERE teamId = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM Team WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete team error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
