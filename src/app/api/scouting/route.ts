import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId } from '@/lib/db';

// GET all scouting records
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');
    const teamNumber = searchParams.get('teamNumber');

    let sql = `
      SELECT sr.*, t.number as teamNumber, t.name as teamName,
             m.matchNumber
      FROM ScoutingRecord sr
      LEFT JOIN Team t ON sr.teamId = t.id
      LEFT JOIN Match m ON sr.matchId = m.id
    `;

    const conditions: string[] = [];
    const args: (string | number)[] = [];

    if (matchId) {
      conditions.push('sr.matchId = ?');
      args.push(matchId);
    }
    if (teamNumber) {
      conditions.push('t.number = ?');
      args.push(parseInt(teamNumber));
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY m.matchNumber ASC, t.number ASC';

    const result = await db.execute({ sql, args });

    const records = result.rows.map(row => ({
      id: row.id,
      matchId: row.matchId,
      teamNumber: row.teamNumber,
      teamName: row.teamName,
      matchNumber: row.matchNumber,
      alliance: row.alliance,
      station: row.station,
      autoLeave: row.autoLeave,
      autoCoralLeft: row.autoCoralLeft,
      autoCoralRight: row.autoCoralRight,
      autoAlgae: row.autoAlgae,
      teleopCoralLeft: row.teleopCoralLeft,
      teleopCoralRight: row.teleopCoralRight,
      teleopAlgae: row.teleopAlgae,
      barge: row.barge,
      processor: row.processor,
      climb: row.climb,
      defense: row.defense,
      notes: row.notes,
      scoutName: row.scoutName,
      scoutTeam: row.scoutTeam,
      createdAt: row.createdAt
    }));

    return NextResponse.json(records);
  } catch (error) {
    console.error('Get scouting data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create new scouting record
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();
    const {
      teamNumber,
      matchNumber,
      alliance,
      station,
      autoLeave,
      autoCoralLeft,
      autoCoralRight,
      autoAlgae,
      teleopCoralLeft,
      teleopCoralRight,
      teleopAlgae,
      barge,
      processor,
      climb,
      defense,
      notes,
      scoutName,
      scoutTeam
    } = body;

    if (!teamNumber || !matchNumber || !alliance) {
      return NextResponse.json(
        { error: 'Team number, match number, and alliance are required' },
        { status: 400 }
      );
    }

    // Get or create team
    let teamResult = await db.execute({
      sql: 'SELECT * FROM Team WHERE number = ?',
      args: [teamNumber]
    });

    let teamId: string;
    if (teamResult.rows.length === 0) {
      teamId = generateId();
      await db.execute({
        sql: 'INSERT INTO Team (id, number) VALUES (?, ?)',
        args: [teamId, teamNumber]
      });
    } else {
      teamId = teamResult.rows[0].id as string;
    }

    // Get or create match
    let matchResult = await db.execute({
      sql: 'SELECT * FROM Match WHERE matchNumber = ?',
      args: [matchNumber]
    });

    let matchId: string;
    if (matchResult.rows.length === 0) {
      matchId = generateId();
      await db.execute({
        sql: 'INSERT INTO Match (id, matchNumber) VALUES (?, ?)',
        args: [matchId, matchNumber]
      });
    } else {
      matchId = matchResult.rows[0].id as string;
    }

    // Check if record already exists
    const existingResult = await db.execute({
      sql: 'SELECT * FROM ScoutingRecord WHERE matchId = ? AND teamId = ?',
      args: [matchId, teamId]
    });

    const id = existingResult.rows.length > 0
      ? existingResult.rows[0].id as string
      : generateId();

    if (existingResult.rows.length > 0) {
      // Update existing record
      await db.execute({
        sql: `UPDATE ScoutingRecord SET
              alliance = ?, station = ?, autoLeave = ?, autoCoralLeft = ?, autoCoralRight = ?,
              autoAlgae = ?, teleopCoralLeft = ?, teleopCoralRight = ?, teleopAlgae = ?,
              barge = ?, processor = ?, climb = ?, defense = ?, notes = ?,
              scoutName = ?, scoutTeam = ?
              WHERE id = ?`,
        args: [
          alliance, station || 1, autoLeave || 0, autoCoralLeft || 0, autoCoralRight || 0,
          autoAlgae || 0, teleopCoralLeft || 0, teleopCoralRight || 0, teleopAlgae || 0,
          barge || 0, processor || 0, climb || 'none', defense || 0, notes || null,
          scoutName || null, scoutTeam || null, id
        ]
      });
    } else {
      // Create new record
      await db.execute({
        sql: `INSERT INTO ScoutingRecord (
                id, matchId, teamId, alliance, station,
                autoLeave, autoCoralLeft, autoCoralRight, autoAlgae,
                teleopCoralLeft, teleopCoralRight, teleopAlgae,
                barge, processor, climb, defense, notes,
                scoutName, scoutTeam
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id, matchId, teamId, alliance, station || 1,
          autoLeave || 0, autoCoralLeft || 0, autoCoralRight || 0, autoAlgae || 0,
          teleopCoralLeft || 0, teleopCoralRight || 0, teleopAlgae || 0,
          barge || 0, processor || 0, climb || 'none', defense || 0, notes || null,
          scoutName || null, scoutTeam || null
        ]
      });
    }

    return NextResponse.json({
      id, matchId, teamId, teamNumber, matchNumber, alliance,
      station: station || 1,
      autoLeave: autoLeave || 0,
      autoCoralLeft: autoCoralLeft || 0,
      autoCoralRight: autoCoralRight || 0,
      autoAlgae: autoAlgae || 0,
      teleopCoralLeft: teleopCoralLeft || 0,
      teleopCoralRight: teleopCoralRight || 0,
      teleopAlgae: teleopAlgae || 0,
      barge: barge || 0,
      processor: processor || 0,
      climb: climb || 'none',
      defense: defense || 0,
      notes: notes || null,
      scoutName: scoutName || null,
      scoutTeam: scoutTeam || null
    });
  } catch (error) {
    console.error('Create scouting record error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE scouting record
export async function DELETE(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Scouting record ID is required' }, { status: 400 });
    }

    await db.execute({ sql: 'DELETE FROM ScoutingRecord WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete scouting record error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
