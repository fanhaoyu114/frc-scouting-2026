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
          matchCount: 0,
          avgAutoLeave: 0,
          avgAutoCoral: 0,
          avgAutoAlgae: 0,
          avgTeleopCoral: 0,
          avgTeleopAlgae: 0,
          avgBarge: 0,
          avgProcessor: 0,
          climbSuccessRate: 0,
          avgDefense: 0,
          records: []
        });
      }

      const records = result.rows;
      const totalMatches = records.length;

      const avgAutoLeave = records.reduce((sum, r) => sum + ((r.autoLeave as number) || 0), 0) / totalMatches;
      const avgAutoCoral = records.reduce((sum, r) => sum + ((r.autoCoralLeft as number) || 0) + ((r.autoCoralRight as number) || 0), 0) / totalMatches;
      const avgAutoAlgae = records.reduce((sum, r) => sum + ((r.autoAlgae as number) || 0), 0) / totalMatches;
      const avgTeleopCoral = records.reduce((sum, r) => sum + ((r.teleopCoralLeft as number) || 0) + ((r.teleopCoralRight as number) || 0), 0) / totalMatches;
      const avgTeleopAlgae = records.reduce((sum, r) => sum + ((r.teleopAlgae as number) || 0), 0) / totalMatches;
      const avgBarge = records.reduce((sum, r) => sum + ((r.barge as number) || 0), 0) / totalMatches;
      const avgProcessor = records.reduce((sum, r) => sum + ((r.processor as number) || 0), 0) / totalMatches;
      const climbSuccessRate = records.filter(r => r.climb !== 'none').length / totalMatches * 100;
      const avgDefense = records.reduce((sum, r) => sum + ((r.defense as number) || 0), 0) / totalMatches;

      return NextResponse.json({
        teamId,
        teamNumber: records[0].teamNumber,
        teamName: records[0].teamName,
        matchCount: totalMatches,
        avgAutoLeave: Math.round(avgAutoLeave * 10) / 10,
        avgAutoCoral: Math.round(avgAutoCoral * 10) / 10,
        avgAutoAlgae: Math.round(avgAutoAlgae * 10) / 10,
        avgTeleopCoral: Math.round(avgTeleopCoral * 10) / 10,
        avgTeleopAlgae: Math.round(avgTeleopAlgae * 10) / 10,
        avgBarge: Math.round(avgBarge * 10) / 10,
        avgProcessor: Math.round(avgProcessor * 10) / 10,
        climbSuccessRate: Math.round(climbSuccessRate * 10) / 10,
        avgDefense: Math.round(avgDefense * 10) / 10,
        records: records.map(r => ({
          matchNumber: r.matchNumber,
          autoLeave: r.autoLeave,
          autoCoralLeft: r.autoCoralLeft,
          autoCoralRight: r.autoCoralRight,
          autoAlgae: r.autoAlgae,
          teleopCoralLeft: r.teleopCoralLeft,
          teleopCoralRight: r.teleopCoralRight,
          teleopAlgae: r.teleopAlgae,
          barge: r.barge,
          processor: r.processor,
          climb: r.climb,
          defense: r.defense
        }))
      });
    }

    // Get stats for all teams
    const result = await db.execute(`
      SELECT t.id as teamId, t.number as teamNumber, t.name as teamName,
             COUNT(sr.id) as matchCount,
             AVG(sr.autoLeave) as avgAutoLeave,
             AVG(sr.autoCoralLeft + sr.autoCoralRight) as avgAutoCoral,
             AVG(sr.autoAlgae) as avgAutoAlgae,
             AVG(sr.teleopCoralLeft + sr.teleopCoralRight) as avgTeleopCoral,
             AVG(sr.teleopAlgae) as avgTeleopAlgae,
             AVG(sr.barge) as avgBarge,
             AVG(sr.processor) as avgProcessor,
             AVG(sr.defense) as avgDefense
      FROM Team t
      LEFT JOIN ScoutingRecord sr ON t.id = sr.teamId
      GROUP BY t.id
      ORDER BY avgAutoCoral DESC, avgTeleopCoral DESC
    `);

    const teamStats = result.rows.map(row => ({
      teamId: row.teamId,
      teamNumber: row.teamNumber,
      teamName: row.teamName,
      matchCount: row.matchCount,
      avgAutoLeave: Math.round((row.avgAutoLeave as number || 0) * 10) / 10,
      avgAutoCoral: Math.round((row.avgAutoCoral as number || 0) * 10) / 10,
      avgAutoAlgae: Math.round((row.avgAutoAlgae as number || 0) * 10) / 10,
      avgTeleopCoral: Math.round((row.avgTeleopCoral as number || 0) * 10) / 10,
      avgTeleopAlgae: Math.round((row.avgTeleopAlgae as number || 0) * 10) / 10,
      avgBarge: Math.round((row.avgBarge as number || 0) * 10) / 10,
      avgProcessor: Math.round((row.avgProcessor as number || 0) * 10) / 10,
      avgDefense: Math.round((row.avgDefense as number || 0) * 10) / 10
    }));

    return NextResponse.json(teamStats);
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
