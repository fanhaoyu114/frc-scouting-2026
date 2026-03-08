import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId } from '@/lib/db';

// Calculate scores based on FRC 2026 rules
function calculateScores(data: Record<string, unknown>) {
  let autoScore = 0;
  if (data.autoLeftStartLine) autoScore += 2;
  autoScore += Math.round((data.autoFuelShots as number || 0) * (data.autoFuelAccuracy as number || 50) / 100);
  const autoClimbLevel = data.autoClimbLevel as number || 0;
  if (autoClimbLevel === 1) autoScore += 15;
  else if (autoClimbLevel === 2) autoScore += 20;
  else if (autoClimbLevel === 3) autoScore += 30;

  let teleopScore = 0;
  const cycles = ['Transition', 'Shift1', 'Shift2', 'Shift3', 'Shift4', 'Endgame'];
  for (const cycle of cycles) {
    const shots = data[`teleop${cycle}Shots`] as number || 0;
    const accuracy = data[`teleop${cycle}Accuracy`] as number || 50;
    teleopScore += Math.round(shots * accuracy / 100);
  }
  const teleopClimbLevel = data.teleopClimbLevel as number || 0;
  if (teleopClimbLevel === 1) teleopScore += 10;
  else if (teleopClimbLevel === 2) teleopScore += 20;
  else if (teleopClimbLevel === 3) teleopScore += 30;

  return { autoScore, teleopScore, totalScore: autoScore + teleopScore };
}

// GET all scouting records
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');
    const teamId = searchParams.get('teamId');

    let sql = `
      SELECT sr.*, t.number as teamNumber, t.name as teamName, m.matchNumber
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
    if (teamId) {
      conditions.push('sr.teamId = ?');
      args.push(teamId);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY m.matchNumber ASC, t.number ASC';

    const result = await db.execute({ sql, args });

    const records = result.rows.map(row => ({
      id: row.id,
      teamId: row.teamId,
      matchId: row.matchId,
      userId: row.userId,
      alliance: row.alliance,
      scoutName: row.scoutName,
      robotType: row.robotType,
      autoLeftStartLine: row.autoLeftStartLine === 1,
      autoFuelShots: row.autoFuelShots,
      autoFuelAccuracy: row.autoFuelAccuracy,
      autoClimbLevel: row.autoClimbLevel,
      autoWon: row.autoWon === 1,
      teleopTransitionShots: row.teleopTransitionShots,
      teleopTransitionAccuracy: row.teleopTransitionAccuracy,
      teleopTransitionDefense: row.teleopTransitionDefense,
      teleopTransitionTransport: row.teleopTransitionTransport,
      teleopShift1Shots: row.teleopShift1Shots,
      teleopShift1Accuracy: row.teleopShift1Accuracy,
      teleopShift1Defense: row.teleopShift1Defense,
      teleopShift1Transport: row.teleopShift1Transport,
      teleopShift2Shots: row.teleopShift2Shots,
      teleopShift2Accuracy: row.teleopShift2Accuracy,
      teleopShift2Defense: row.teleopShift2Defense,
      teleopShift2Transport: row.teleopShift2Transport,
      teleopShift3Shots: row.teleopShift3Shots,
      teleopShift3Accuracy: row.teleopShift3Accuracy,
      teleopShift3Defense: row.teleopShift3Defense,
      teleopShift3Transport: row.teleopShift3Transport,
      teleopShift4Shots: row.teleopShift4Shots,
      teleopShift4Accuracy: row.teleopShift4Accuracy,
      teleopShift4Defense: row.teleopShift4Defense,
      teleopShift4Transport: row.teleopShift4Transport,
      teleopEndgameShots: row.teleopEndgameShots,
      teleopEndgameAccuracy: row.teleopEndgameAccuracy,
      teleopClimbLevel: row.teleopClimbLevel,
      teleopClimbTime: row.teleopClimbTime,
      minorFouls: row.minorFouls,
      majorFouls: row.majorFouls,
      yellowCard: row.yellowCard === 1,
      redCard: row.redCard === 1,
      foulRecords: row.foulRecords,
      foulNotes: row.foulNotes,
      driverRating: row.driverRating,
      defenseRating: row.defenseRating,
      wasDisabled: row.wasDisabled === 1,
      disabledDuration: row.disabledDuration,
      notes: row.notes,
      autoScore: row.autoScore,
      teleopScore: row.teleopScore,
      totalScore: row.totalScore,
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

    const teamNumber = body.teamNumber;
    const matchNumber = body.matchNumber;
    const alliance = body.alliance;

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

    const scores = calculateScores(body);
    const id = existingResult.rows.length > 0
      ? existingResult.rows[0].id as string
      : generateId();

    const args: (string | number | null)[] = [
      id, matchId, teamId, body.userId || null, alliance,
      body.scoutName || null, body.robotType || null,
      body.autoLeftStartLine ? 1 : 0, body.autoFuelShots || 0, body.autoFuelAccuracy || 50, body.autoClimbLevel || 0, body.autoWon ? 1 : 0,
      body.teleopTransitionShots || 0, body.teleopTransitionAccuracy || 50, body.teleopTransitionDefense || 0, body.teleopTransitionTransport || 0,
      body.teleopShift1Shots || 0, body.teleopShift1Accuracy || 50, body.teleopShift1Defense || 0, body.teleopShift1Transport || 0,
      body.teleopShift2Shots || 0, body.teleopShift2Accuracy || 50, body.teleopShift2Defense || 0, body.teleopShift2Transport || 0,
      body.teleopShift3Shots || 0, body.teleopShift3Accuracy || 50, body.teleopShift3Defense || 0, body.teleopShift3Transport || 0,
      body.teleopShift4Shots || 0, body.teleopShift4Accuracy || 50, body.teleopShift4Defense || 0, body.teleopShift4Transport || 0,
      body.teleopEndgameShots || 0, body.teleopEndgameAccuracy || 50,
      body.teleopClimbLevel || 0, body.teleopClimbTime || 0,
      body.minorFouls || 0, body.majorFouls || 0, body.yellowCard ? 1 : 0, body.redCard ? 1 : 0, body.foulRecords || null, body.foulNotes || null,
      body.driverRating || 5, body.defenseRating || 5,
      body.wasDisabled ? 1 : 0, body.disabledDuration || null,
      body.notes || null,
      scores.autoScore, scores.teleopScore, scores.totalScore
    ];

    if (existingResult.rows.length > 0) {
      await db.execute({
        sql: `UPDATE ScoutingRecord SET
          alliance = ?, scoutName = ?, robotType = ?,
          autoLeftStartLine = ?, autoFuelShots = ?, autoFuelAccuracy = ?, autoClimbLevel = ?, autoWon = ?,
          teleopTransitionShots = ?, teleopTransitionAccuracy = ?, teleopTransitionDefense = ?, teleopTransitionTransport = ?,
          teleopShift1Shots = ?, teleopShift1Accuracy = ?, teleopShift1Defense = ?, teleopShift1Transport = ?,
          teleopShift2Shots = ?, teleopShift2Accuracy = ?, teleopShift2Defense = ?, teleopShift2Transport = ?,
          teleopShift3Shots = ?, teleopShift3Accuracy = ?, teleopShift3Defense = ?, teleopShift3Transport = ?,
          teleopShift4Shots = ?, teleopShift4Accuracy = ?, teleopShift4Defense = ?, teleopShift4Transport = ?,
          teleopEndgameShots = ?, teleopEndgameAccuracy = ?,
          teleopClimbLevel = ?, teleopClimbTime = ?,
          minorFouls = ?, majorFouls = ?, yellowCard = ?, redCard = ?, foulRecords = ?, foulNotes = ?,
          driverRating = ?, defenseRating = ?,
          wasDisabled = ?, disabledDuration = ?,
          notes = ?,
          autoScore = ?, teleopScore = ?, totalScore = ?
          WHERE id = ?`,
        args: [...args.slice(4), id]
      });
    } else {
      await db.execute({
        sql: `INSERT INTO ScoutingRecord (
          id, matchId, teamId, userId, alliance, scoutName, robotType,
          autoLeftStartLine, autoFuelShots, autoFuelAccuracy, autoClimbLevel, autoWon,
          teleopTransitionShots, teleopTransitionAccuracy, teleopTransitionDefense, teleopTransitionTransport,
          teleopShift1Shots, teleopShift1Accuracy, teleopShift1Defense, teleopShift1Transport,
          teleopShift2Shots, teleopShift2Accuracy, teleopShift2Defense, teleopShift2Transport,
          teleopShift3Shots, teleopShift3Accuracy, teleopShift3Defense, teleopShift3Transport,
          teleopShift4Shots, teleopShift4Accuracy, teleopShift4Defense, teleopShift4Transport,
          teleopEndgameShots, teleopEndgameAccuracy,
          teleopClimbLevel, teleopClimbTime,
          minorFouls, majorFouls, yellowCard, redCard, foulRecords, foulNotes,
          driverRating, defenseRating,
          wasDisabled, disabledDuration,
          notes,
          autoScore, teleopScore, totalScore
        ) VALUES (${args.map(() => '?').join(', ')})`,
        args
      });
    }

    return NextResponse.json({
      id, matchId, teamId, userId: body.userId || null, alliance,
      scoutName: body.scoutName || null,
      robotType: body.robotType || null,
      autoLeftStartLine: body.autoLeftStartLine || false,
      autoFuelShots: body.autoFuelShots || 0,
      autoFuelAccuracy: body.autoFuelAccuracy || 50,
      autoClimbLevel: body.autoClimbLevel || 0,
      autoWon: body.autoWon || false,
      teleopTransitionShots: body.teleopTransitionShots || 0,
      teleopTransitionAccuracy: body.teleopTransitionAccuracy || 50,
      teleopTransitionDefense: body.teleopTransitionDefense || 0,
      teleopTransitionTransport: body.teleopTransitionTransport || 0,
      teleopShift1Shots: body.teleopShift1Shots || 0,
      teleopShift1Accuracy: body.teleopShift1Accuracy || 50,
      teleopShift1Defense: body.teleopShift1Defense || 0,
      teleopShift1Transport: body.teleopShift1Transport || 0,
      teleopShift2Shots: body.teleopShift2Shots || 0,
      teleopShift2Accuracy: body.teleopShift2Accuracy || 50,
      teleopShift2Defense: body.teleopShift2Defense || 0,
      teleopShift2Transport: body.teleopShift2Transport || 0,
      teleopShift3Shots: body.teleopShift3Shots || 0,
      teleopShift3Accuracy: body.teleopShift3Accuracy || 50,
      teleopShift3Defense: body.teleopShift3Defense || 0,
      teleopShift3Transport: body.teleopShift3Transport || 0,
      teleopShift4Shots: body.teleopShift4Shots || 0,
      teleopShift4Accuracy: body.teleopShift4Accuracy || 50,
      teleopShift4Defense: body.teleopShift4Defense || 0,
      teleopShift4Transport: body.teleopShift4Transport || 0,
      teleopEndgameShots: body.teleopEndgameShots || 0,
      teleopEndgameAccuracy: body.teleopEndgameAccuracy || 50,
      teleopClimbLevel: body.teleopClimbLevel || 0,
      teleopClimbTime: body.teleopClimbTime || 0,
      minorFouls: body.minorFouls || 0,
      majorFouls: body.majorFouls || 0,
      yellowCard: body.yellowCard || false,
      redCard: body.redCard || false,
      foulRecords: body.foulRecords || null,
      foulNotes: body.foulNotes || null,
      driverRating: body.driverRating || 5,
      defenseRating: body.defenseRating || 5,
      wasDisabled: body.wasDisabled || false,
      disabledDuration: body.disabledDuration || null,
      notes: body.notes || null,
      autoScore: scores.autoScore,
      teleopScore: scores.teleopScore,
      totalScore: scores.totalScore,
      team: { id: teamId, teamNumber, nickname: null, city: null, state: null, country: null },
      match: { id: matchId, matchNumber, matchType: 'QUALIFICATION' }
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
