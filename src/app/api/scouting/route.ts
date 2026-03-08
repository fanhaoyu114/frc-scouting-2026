import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Calculate scores based on FRC 2026 REBUILT rules
function calculateScores(data: {
  autoLeftStartLine: boolean;
  autoFuelShots: number;
  autoFuelAccuracy: number;
  autoClimbLevel: number;
  autoWon: boolean;
  teleopTransitionShots: number;
  teleopTransitionAccuracy: number;
  teleopShift1Shots: number;
  teleopShift1Accuracy: number;
  teleopShift2Shots: number;
  teleopShift2Accuracy: number;
  teleopShift3Shots: number;
  teleopShift3Accuracy: number;
  teleopShift4Shots: number;
  teleopShift4Accuracy: number;
  teleopEndgameShots: number;
  teleopEndgameAccuracy: number;
  teleopClimbLevel: number;
}) {
  // Auto scoring
  let autoScore = 0;
  
  // Leave start line bonus (if applicable)
  if (data.autoLeftStartLine) {
    autoScore += 2; // Example bonus
  }
  
  // Tower climb in auto: Level 1 = 15 pts, Level 2 = 20 pts, Level 3 = 30 pts
  if (data.autoClimbLevel === 1) autoScore += 15;
  else if (data.autoClimbLevel === 2) autoScore += 20;
  else if (data.autoClimbLevel === 3) autoScore += 30;
  
  // Fuel: shots * accuracy / 100 (estimated scored fuel)
  autoScore += Math.round(data.autoFuelShots * data.autoFuelAccuracy / 100);
  
  // Teleop scoring
  let teleopScore = 0;
  
  // Calculate teleop fuel scores from each cycle
  const cycleScores = [
    { shots: data.teleopTransitionShots, accuracy: data.teleopTransitionAccuracy },
    { shots: data.teleopShift1Shots, accuracy: data.teleopShift1Accuracy },
    { shots: data.teleopShift2Shots, accuracy: data.teleopShift2Accuracy },
    { shots: data.teleopShift3Shots, accuracy: data.teleopShift3Accuracy },
    { shots: data.teleopShift4Shots, accuracy: data.teleopShift4Accuracy },
    { shots: data.teleopEndgameShots, accuracy: data.teleopEndgameAccuracy },
  ];
  
  for (const cycle of cycleScores) {
    teleopScore += Math.round(cycle.shots * cycle.accuracy / 100);
  }
  
  // Tower climb in teleop: Level 1 = 10 pts, Level 2 = 20 pts, Level 3 = 30 pts
  if (data.teleopClimbLevel === 1) teleopScore += 10;
  else if (data.teleopClimbLevel === 2) teleopScore += 20;
  else if (data.teleopClimbLevel === 3) teleopScore += 30;

  return {
    autoScore,
    teleopScore,
    totalScore: autoScore + teleopScore
  };
}

// GET all scouting data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');
    const teamId = searchParams.get('teamId');

    const where: Record<string, string> = {};
    if (matchId) where.matchId = matchId;
    if (teamId) where.teamId = teamId;

    const scoutingData = await db.scoutingData.findMany({
      where,
      include: {
        team: true,
        match: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true
          }
        }
      },
      orderBy: [
        { match: { matchNumber: 'asc' } },
        { team: { teamNumber: 'asc' } }
      ]
    });

    return NextResponse.json(scoutingData);
  } catch (error) {
    console.error('Get scouting data error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new scouting record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      teamNumber,
      matchNumber,
      alliance,
      scoutName,
      robotType, // New field
      
      // Auto phase
      autoLeftStartLine,
      autoFuelShots,
      autoFuelAccuracy,
      autoClimbLevel,
      autoWon,
      
      // Teleop cycles
      teleopTransitionShots,
      teleopTransitionAccuracy,
      teleopTransitionDefense,
      teleopTransitionTransport,
      teleopShift1Shots,
      teleopShift1Accuracy,
      teleopShift1Defense,
      teleopShift1Transport,
      teleopShift2Shots,
      teleopShift2Accuracy,
      teleopShift2Defense,
      teleopShift2Transport,
      teleopShift3Shots,
      teleopShift3Accuracy,
      teleopShift3Defense,
      teleopShift3Transport,
      teleopShift4Shots,
      teleopShift4Accuracy,
      teleopShift4Defense,
      teleopShift4Transport,
      teleopEndgameShots,
      teleopEndgameAccuracy,
      
      // Climbing
      teleopClimbLevel,
      teleopClimbTime,
      
      // Fouls
      minorFouls,
      majorFouls,
      yellowCard,
      redCard,
      foulRecords,
      foulNotes,
      
      // Ratings
      driverRating,
      defenseRating,
      
      // Issues
      wasDisabled,
      disabledDuration,
      
      // Notes
      notes
    } = body;

    if (!teamNumber || !matchNumber || !alliance) {
      return NextResponse.json(
        { error: 'Team number, match number, and alliance are required' },
        { status: 400 }
      );
    }

    // Get or create team
    let team = await db.team.findUnique({
      where: { teamNumber }
    });
    if (!team) {
      team = await db.team.create({
        data: { teamNumber }
      });
    }

    // Get or create match
    let match = await db.match.findUnique({
      where: { matchNumber }
    });
    if (!match) {
      match = await db.match.create({
        data: { matchNumber }
      });
    }

    // Get or create preview user if no userId provided
    let effectiveUserId = userId;
    if (!effectiveUserId) {
      let previewUser = await db.user.findUnique({
        where: { username: '预览账号' }
      });
      if (!previewUser) {
        previewUser = await db.user.create({
          data: {
            username: '预览账号',
            password: '6353',
            name: 'Preview Account',
            isAdmin: true
          }
        });
      }
      effectiveUserId = previewUser.id;
    }

    // Prepare data for score calculation
    const scoreData = {
      autoLeftStartLine: autoLeftStartLine || false,
      autoFuelShots: autoFuelShots || 0,
      autoFuelAccuracy: autoFuelAccuracy || 50,
      autoClimbLevel: autoClimbLevel || 0,
      autoWon: autoWon || false,
      teleopTransitionShots: teleopTransitionShots || 0,
      teleopTransitionAccuracy: teleopTransitionAccuracy || 50,
      teleopShift1Shots: teleopShift1Shots || 0,
      teleopShift1Accuracy: teleopShift1Accuracy || 50,
      teleopShift2Shots: teleopShift2Shots || 0,
      teleopShift2Accuracy: teleopShift2Accuracy || 50,
      teleopShift3Shots: teleopShift3Shots || 0,
      teleopShift3Accuracy: teleopShift3Accuracy || 50,
      teleopShift4Shots: teleopShift4Shots || 0,
      teleopShift4Accuracy: teleopShift4Accuracy || 50,
      teleopEndgameShots: teleopEndgameShots || 0,
      teleopEndgameAccuracy: teleopEndgameAccuracy || 50,
      teleopClimbLevel: teleopClimbLevel || 0,
    };

    // Calculate scores
    const scores = calculateScores(scoreData);

    // Check if record already exists for this team in this match
    const existing = await db.scoutingData.findUnique({
      where: {
        matchId_teamId: {
          matchId: match.id,
          teamId: team.id
        }
      }
    });

    const recordData = {
      userId: effectiveUserId,
      teamId: team.id,
      matchId: match.id,
      alliance,
      scoutName: scoutName || null,
      robotType: robotType || null,
      autoLeftStartLine: autoLeftStartLine || false,
      autoFuelShots: autoFuelShots || 0,
      autoFuelAccuracy: autoFuelAccuracy || 50,
      autoClimbLevel: autoClimbLevel || 0,
      autoWon: autoWon || false,
      teleopTransitionShots: teleopTransitionShots || 0,
      teleopTransitionAccuracy: teleopTransitionAccuracy || 50,
      teleopTransitionDefense: teleopTransitionDefense || 0,
      teleopTransitionTransport: teleopTransitionTransport || 0,
      teleopShift1Shots: teleopShift1Shots || 0,
      teleopShift1Accuracy: teleopShift1Accuracy || 50,
      teleopShift1Defense: teleopShift1Defense || 0,
      teleopShift1Transport: teleopShift1Transport || 0,
      teleopShift2Shots: teleopShift2Shots || 0,
      teleopShift2Accuracy: teleopShift2Accuracy || 50,
      teleopShift2Defense: teleopShift2Defense || 0,
      teleopShift2Transport: teleopShift2Transport || 0,
      teleopShift3Shots: teleopShift3Shots || 0,
      teleopShift3Accuracy: teleopShift3Accuracy || 50,
      teleopShift3Defense: teleopShift3Defense || 0,
      teleopShift3Transport: teleopShift3Transport || 0,
      teleopShift4Shots: teleopShift4Shots || 0,
      teleopShift4Accuracy: teleopShift4Accuracy || 50,
      teleopShift4Defense: teleopShift4Defense || 0,
      teleopShift4Transport: teleopShift4Transport || 0,
      teleopEndgameShots: teleopEndgameShots || 0,
      teleopEndgameAccuracy: teleopEndgameAccuracy || 50,
      teleopClimbLevel: teleopClimbLevel || 0,
      teleopClimbTime: teleopClimbTime || 0,
      minorFouls: minorFouls || 0,
      majorFouls: majorFouls || 0,
      yellowCard: yellowCard || false,
      redCard: redCard || false,
      foulRecords: foulRecords || null,
      foulNotes: foulNotes || null,
      driverRating: driverRating || 5.0,
      defenseRating: defenseRating || 5.0,
      wasDisabled: wasDisabled || false,
      disabledDuration: disabledDuration || null,
      notes: notes || null,
      autoScore: scores.autoScore,
      teleopScore: scores.teleopScore,
      totalScore: scores.totalScore
    };

    if (existing) {
      // Update existing record
      const updated = await db.scoutingData.update({
        where: { id: existing.id },
        data: recordData,
        include: {
          team: true,
          match: true
        }
      });
      return NextResponse.json(updated);
    }

    // Create new record
    const scoutingRecord = await db.scoutingData.create({
      data: recordData,
      include: {
        team: true,
        match: true
      }
    });

    return NextResponse.json(scoutingRecord);
  } catch (error) {
    console.error('Create scouting record error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update scouting record
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Scouting record ID is required' },
        { status: 400 }
      );
    }

    // Get existing record
    const existing = await db.scoutingData.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Scouting record not found' },
        { status: 404 }
      );
    }

    // Calculate scores with updated data
    const scores = calculateScores({
      autoLeftStartLine: updateData.autoLeftStartLine ?? existing.autoLeftStartLine,
      autoFuelShots: updateData.autoFuelShots ?? existing.autoFuelShots,
      autoFuelAccuracy: updateData.autoFuelAccuracy ?? existing.autoFuelAccuracy,
      autoClimbLevel: updateData.autoClimbLevel ?? existing.autoClimbLevel,
      autoWon: updateData.autoWon ?? existing.autoWon,
      teleopTransitionShots: updateData.teleopTransitionShots ?? existing.teleopTransitionShots,
      teleopTransitionAccuracy: updateData.teleopTransitionAccuracy ?? existing.teleopTransitionAccuracy,
      teleopShift1Shots: updateData.teleopShift1Shots ?? existing.teleopShift1Shots,
      teleopShift1Accuracy: updateData.teleopShift1Accuracy ?? existing.teleopShift1Accuracy,
      teleopShift2Shots: updateData.teleopShift2Shots ?? existing.teleopShift2Shots,
      teleopShift2Accuracy: updateData.teleopShift2Accuracy ?? existing.teleopShift2Accuracy,
      teleopShift3Shots: updateData.teleopShift3Shots ?? existing.teleopShift3Shots,
      teleopShift3Accuracy: updateData.teleopShift3Accuracy ?? existing.teleopShift3Accuracy,
      teleopShift4Shots: updateData.teleopShift4Shots ?? existing.teleopShift4Shots,
      teleopShift4Accuracy: updateData.teleopShift4Accuracy ?? existing.teleopShift4Accuracy,
      teleopEndgameShots: updateData.teleopEndgameShots ?? existing.teleopEndgameShots,
      teleopEndgameAccuracy: updateData.teleopEndgameAccuracy ?? existing.teleopEndgameAccuracy,
      teleopClimbLevel: updateData.teleopClimbLevel ?? existing.teleopClimbLevel,
    });

    const updated = await db.scoutingData.update({
      where: { id },
      data: {
        ...updateData,
        autoScore: scores.autoScore,
        teleopScore: scores.teleopScore,
        totalScore: scores.totalScore
      },
      include: {
        team: true,
        match: true
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update scouting record error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE scouting record
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Scouting record ID is required' },
        { status: 400 }
      );
    }

    await db.scoutingData.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete scouting record error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
