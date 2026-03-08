import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET team statistics
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (teamId) {
      // Get stats for specific team
      const result = await db.execute({
        sql: `
          SELECT sr.*, m.matchNumber, t.number as teamNumber, t.name as teamName
          FROM ScoutingRecord sr
          LEFT JOIN Match m ON sr.matchId = m.id
          LEFT JOIN Team t ON sr.teamId = t.id
          WHERE sr.teamId = ?
          ORDER BY m.matchNumber ASC
        `,
        args: [teamId]
      });

      if (result.rows.length === 0) {
        return NextResponse.json({
          teamId,
          teamNumber: 0,
          nickname: null,
          matchCount: 0,
          avgTotalScore: 0,
          avgAutoScore: 0,
          avgTeleopScore: 0,
          avgFuelShots: 0,
          climbSuccessRate: 0,
          autoLeaveRate: 0,
          avgDefenseTime: 0,
          avgDriverRating: 0,
          avgDefenseRating: 0,
          autoCapability: 0,
          fuelEfficiency: 0,
          climbCapability: 0,
          scoresByMatch: [],
          cycleStats: {
            transition: { avgShots: 0, avgAccuracy: 0 },
            shift1: { avgShots: 0, avgAccuracy: 0 },
            shift2: { avgShots: 0, avgAccuracy: 0 },
            shift3: { avgShots: 0, avgAccuracy: 0 },
            shift4: { avgShots: 0, avgAccuracy: 0 },
            endgame: { avgShots: 0, avgAccuracy: 0 },
          }
        });
      }

      const records = result.rows;
      const totalMatches = records.length;

      const avgAutoScore = records.reduce((sum, r) => sum + ((r.autoLeave as number) || 0), 0) / totalMatches;
      const avgTeleopScore = records.reduce((sum, r) =>
        sum + ((r.teleopCoralLeft as number) || 0) + ((r.teleopCoralRight as number) || 0) + ((r.teleopAlgae as number) || 0), 0) / totalMatches;
      const climbSuccessRate = records.filter(r => r.climb !== 'none').length / totalMatches * 100;
      const autoLeaveRate = records.filter(r => (r.autoLeave as number) > 0).length / totalMatches * 100;
      const avgDefenseRating = records.reduce((sum, r) => sum + ((r.defense as number) || 0), 0) / totalMatches;

      return NextResponse.json({
        teamId,
        teamNumber: records[0].teamNumber,
        nickname: records[0].teamName,
        matchCount: totalMatches,
        avgTotalScore: Math.round((avgAutoScore + avgTeleopScore) * 10) / 10,
        avgAutoScore: Math.round(avgAutoScore * 10) / 10,
        avgTeleopScore: Math.round(avgTeleopScore * 10) / 10,
        avgFuelShots: 0,
        climbSuccessRate: Math.round(climbSuccessRate * 10) / 10,
        autoLeaveRate: Math.round(autoLeaveRate * 10) / 10,
        avgDefenseTime: 0,
        avgDriverRating: 5,
        avgDefenseRating: Math.round(avgDefenseRating * 10) / 10,
        autoCapability: Math.round(avgAutoScore * 10) / 10,
        fuelEfficiency: 0,
        climbCapability: Math.round(climbSuccessRate / 10),
        scoresByMatch: records.map(r => ({
          matchNumber: r.matchNumber,
          totalScore: ((r.autoLeave as number) || 0) + ((r.teleopCoralLeft as number) || 0) + ((r.teleopCoralRight as number) || 0) + ((r.teleopAlgae as number) || 0),
          autoScore: (r.autoLeave as number) || 0,
          teleopScore: ((r.teleopCoralLeft as number) || 0) + ((r.teleopCoralRight as number) || 0) + ((r.teleopAlgae as number) || 0)
        })),
        cycleStats: {
          transition: { avgShots: 0, avgAccuracy: 50 },
          shift1: { avgShots: Math.round(records.reduce((sum, r) => sum + ((r.teleopCoralLeft as number) || 0), 0) / totalMatches * 10) / 10, avgAccuracy: 50 },
          shift2: { avgShots: Math.round(records.reduce((sum, r) => sum + ((r.teleopCoralRight as number) || 0), 0) / totalMatches * 10) / 10, avgAccuracy: 50 },
          shift3: { avgShots: Math.round(records.reduce((sum, r) => sum + ((r.teleopAlgae as number) || 0), 0) / totalMatches * 10) / 10, avgAccuracy: 50 },
          shift4: { avgShots: Math.round(records.reduce((sum, r) => sum + ((r.barge as number) || 0), 0) / totalMatches * 10) / 10, avgAccuracy: 50 },
          endgame: { avgShots: Math.round(records.reduce((sum, r) => sum + ((r.processor as number) || 0), 0) / totalMatches * 10) / 10, avgAccuracy: 50 },
        }
      });
    }

    // Get stats for all teams
    const result = await db.execute(`
      SELECT t.id as teamId, t.number as teamNumber, t.name as teamName,
             COUNT(sr.id) as matchCount,
             AVG(sr.autoLeave) as avgAutoLeave,
             AVG(sr.teleopCoralLeft + sr.teleopCoralRight + sr.teleopAlgae) as avgTeleopScore,
             AVG(sr.defense) as avgDefense
      FROM Team t
      LEFT JOIN ScoutingRecord sr ON t.id = sr.teamId
      GROUP BY t.id
      ORDER BY avgTeleopScore DESC
    `);

    const teamStats = result.rows.map(row => {
      const avgAutoScore = (row.avgAutoLeave as number) || 0;
      const avgTeleopScore = (row.avgTeleopScore as number) || 0;
      return {
        teamId: row.teamId,
        teamNumber: row.teamNumber,
        nickname: row.teamName,
        matchCount: (row.matchCount as number) || 0,
        avgTotalScore: Math.round((avgAutoScore + avgTeleopScore) * 10) / 10,
        avgAutoScore: Math.round(avgAutoScore * 10) / 10,
        avgTeleopScore: Math.round(avgTeleopScore * 10) / 10,
        avgFuelShots: 0,
        climbSuccessRate: 0,
        autoLeaveRate: 0,
        avgDefenseTime: 0,
        avgDriverRating: 5,
        avgDefenseRating: Math.round(((row.avgDefense as number) || 0) * 10) / 10,
        autoCapability: Math.round(avgAutoScore * 10) / 10,
        fuelEfficiency: 0,
        climbCapability: 0,
        scoresByMatch: [],
        cycleStats: {
          transition: { avgShots: 0, avgAccuracy: 50 },
          shift1: { avgShots: 0, avgAccuracy: 50 },
          shift2: { avgShots: 0, avgAccuracy: 50 },
          shift3: { avgShots: 0, avgAccuracy: 50 },
          shift4: { avgShots: 0, avgAccuracy: 50 },
          endgame: { avgShots: 0, avgAccuracy: 50 },
        }
      };
    });

    return NextResponse.json(teamStats);
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
