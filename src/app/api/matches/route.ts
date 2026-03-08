import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId } from '@/lib/db';

// GET all matches
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const result = await db.execute(`
      SELECT m.*, COUNT(sr.id) as recordCount
      FROM Match m
      LEFT JOIN ScoutingRecord sr ON m.id = sr.matchId
      GROUP BY m.id
      ORDER BY m.matchNumber ASC
    `);

    const matches = result.rows.map(row => ({
      id: row.id,
      matchNumber: row.matchNumber,
      blue1: row.blue1,
      blue2: row.blue2,
      blue3: row.blue3,
      red1: row.red1,
      red2: row.red2,
      red3: row.red3,
      blueScore: row.blueScore,
      redScore: row.redScore,
      winner: row.winner,
      createdAt: row.createdAt,
      _count: { scoutingRecords: (row.recordCount as number) || 0 }
    }));

    return NextResponse.json(matches);
  } catch (error) {
    console.error('Get matches error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create new match
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();
    const { matchNumber, blue1, blue2, blue3, red1, red2, red3 } = body;

    if (!matchNumber) {
      return NextResponse.json({ error: 'Match number is required' }, { status: 400 });
    }

    const existingMatch = await db.execute({
      sql: 'SELECT * FROM Match WHERE matchNumber = ?',
      args: [matchNumber]
    });

    if (existingMatch.rows.length > 0) {
      return NextResponse.json(existingMatch.rows[0]);
    }

    const id = generateId();
    await db.execute({
      sql: `INSERT INTO Match (id, matchNumber, blue1, blue2, blue3, red1, red2, red3)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, matchNumber, blue1 || null, blue2 || null, blue3 || null, red1 || null, red2 || null, red3 || null]
    });

    return NextResponse.json({
      id, matchNumber, blue1, blue2, blue3, red1, red2, red3
    });
  } catch (error) {
    console.error('Create match error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE match
export async function DELETE(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Match ID is required' }, { status: 400 });
    }

    // First delete associated scouting records
    await db.execute({ sql: 'DELETE FROM ScoutingRecord WHERE matchId = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM Match WHERE id = ?', args: [id] });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete match error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
