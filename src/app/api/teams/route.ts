import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const result = await db.execute(`
      SELECT t.*, COUNT(sd.id) as recordCount
      FROM Team t
      LEFT JOIN ScoutingData sd ON t.id = sd.teamId
      GROUP BY t.id
      ORDER BY t.teamNumber ASC
    `);

    const teams = result.rows.map(row => ({
      id: row.id,
      teamNumber: row.teamNumber,
      nickname: row.nickname,
      city: row.city,
      state: row.state,
      country: row.country,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      _count: { scoutingRecords: row.recordCount || 0 }
    }));

    return NextResponse.json(teams);
  } catch (error) {
    console.error('Get teams error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { teamNumber, nickname, city, state, country } = body;

    if (!teamNumber) {
      return NextResponse.json({ error: 'Team number is required' }, { status: 400 });
    }

    const existing = await db.execute({ sql: 'SELECT * FROM Team WHERE teamNumber = ?', args: [teamNumber] });
    if (existing.rows.length > 0) {
      return NextResponse.json(existing.rows[0]);
    }

    const id = generateId();
    await db.execute({
      sql: 'INSERT INTO Team (id, teamNumber, nickname, city, state, country) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, teamNumber, nickname || null, city || null, state || null, country || null]
    });

    return NextResponse.json({ id, teamNumber, nickname, city, state, country });
  } catch (error) {
    console.error('Create team error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = getDb();
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
