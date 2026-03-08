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

    // Map to frontend expected format with nested team and match objects
    const records = result.rows.map(row => ({
      id: row.id,
      teamId: row.teamId,
      matchId: row.matchId,
      userId: row.id, // fallback
      alliance: row.alliance,
      scoutName: row.scoutName,
      robotType: null,
      // Auto
      autoLeftStartLine: (row.autoLeave as number) > 0,
      autoFuelShots: 0,
      autoFuelAccuracy: 50,
      autoClimbLevel: 0,
      autoWon: false,
      // Teleop - map to new schema
      teleopTransitionShots: 0,
      teleopTransitionAccuracy: 50,
      teleopTransitionDefense: 0,
      teleopTransitionTransport: 0,
      teleopShift1Shots: (row.teleopCoralLeft as number) || 0,
      teleopShift1Accuracy: 50,
      teleopShift1Defense: 0,
      teleopShift1Transport: 0,
      teleopShift2Shots: (row.teleopCoralRight as number) || 0,
      teleopShift2Accuracy: 50,
      teleopShift2Defense: 0,
      teleopShift2Transport: 0,
      teleopShift3Shots: (row.teleopAlgae as number) || 0,
      teleopShift3Accuracy: 50,
      teleopShift3Defense: 0,
      teleopShift3Transport: 0,
      teleopShift4Shots: (row.barge as number) || 0,
      teleopShift4Accuracy: 50,
      teleopShift4Defense: 0,
      teleopShift4Transport: 0,
      teleopEndgameShots: (row.processor as number) || 0,
      teleopEndgameAccuracy: 50,
      // Climb
      teleopClimbLevel: row.climb === 'none' ? 0 : row.climb === 'shallow' ? 1 : row.climb === 'deep' ? 2 : 0,
      teleopClimbTime: 0,
      // Fouls
      minorFouls: 0,
      majorFouls: 0,
      yellowCard: false,
      redCard: false,
      foulRecords: null,
      foulNotes: null,
      // Ratings
      driverRating: 5,
      defenseRating: (row.defense as number) || 0,
      // Issues
      wasDisabled: false,
      disabledDuration: null,
      // Notes
      notes: row.notes,
      // Scores (calculated)
      autoScore: (row.autoLeave as number) || 0,
      teleopScore: ((row.teleopCoralLeft as number) || 0) + ((row.teleopCoralRight as number) || 0) + ((row.teleopAlgae as number) || 0),
      totalScore: ((row.autoLeave as number) || 0) + ((row.teleopCoralLeft as number) || 0) + ((row.teleopCoralRight as number) || 0) + ((row.teleopAlgae as number) || 0),
      // Nested objects for frontend
      team: {
        id: row.teamId,
        teamNumber: row.teamNumber,
        nickname: row.teamName,
        city: null,
        state: null,
        country: null
      },
      match: {
        id: row.matchId,
        matchNumber: row.matchNumber,
        matchType: 'QUALIFICATION'
      }
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

    // Return in frontend expected format
    return NextResponse.json({
      id,
      teamId,
      matchId,
      userId: id,
      alliance,
      scoutName: scoutName || null,
      robotType: null,
      autoLeftStartLine: (autoLeave || 0) > 0,
      autoFuelShots: 0,
      autoFuelAccuracy: 50,
      autoClimbLevel: 0,
      autoWon: false,
      teleopTransitionShots: 0,
      teleopTransitionAccuracy: 50,
      teleopTransitionDefense: 0,
      teleopTransitionTransport: 0,
      teleopShift1Shots: teleopCoralLeft || 0,
      teleopShift1Accuracy: 50,
      teleopShift1Defense: 0,
      teleopShift1Transport: 0,
      teleopShift2Shots: teleopCoralRight || 0,
      teleopShift2Accuracy: 50,
      teleopShift2Defense: 0,
      teleopShift2Transport: 0,
      teleopShift3Shots: teleopAlgae || 0,
      teleopShift3Accuracy: 50,
      teleopShift3Defense: 0,
      teleopShift3Transport: 0,
      teleopShift4Shots: barge || 0,
      teleopShift4Accuracy: 50,
      teleopShift4Defense: 0,
      teleopShift4Transport: 0,
      teleopEndgameShots: processor || 0,
      teleopEndgameAccuracy: 50,
      teleopClimbLevel: climb === 'none' ? 0 : climb === 'shallow' ? 1 : climb === 'deep' ? 2 : 0,
      teleopClimbTime: 0,
      minorFouls: 0,
      majorFouls: 0,
      yellowCard: false,
      redCard: false,
      foulRecords: null,
      foulNotes: null,
      driverRating: 5,
      defenseRating: defense || 0,
      wasDisabled: false,
      disabledDuration: null,
      notes: notes || null,
      autoScore: autoLeave || 0,
      teleopScore: (teleopCoralLeft || 0) + (teleopCoralRight || 0) + (teleopAlgae || 0),
      totalScore: (autoLeave || 0) + (teleopCoralLeft || 0) + (teleopCoralRight || 0) + (teleopAlgae || 0),
      team: {
        id: teamId,
        teamNumber,
        nickname: null,
        city: null,
        state: null,
        country: null
      },
      match: {
        id: matchId,
        matchNumber,
        matchType: 'QUALIFICATION'
      }
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
