import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface CycleStats {
  avgShots: number;
  avgAccuracy: number;
}

interface TeamCycleStats {
  transition: CycleStats;
  shift1: CycleStats;
  shift2: CycleStats;
  shift3: CycleStats;
  shift4: CycleStats;
  endgame: CycleStats;
}

interface TeamStatResult {
  teamId: string;
  teamNumber: number;
  nickname: string | null;
  matchCount: number;
  avgTotalScore: number;
  avgAutoScore: number;
  avgTeleopScore: number;
  avgFuelScored: number;
  climbSuccessRate: number;
  autoLeaveRate: number;
  avgDefenseTime: number;
  avgDriverRating: number;
  avgDefenseRating: number;
  autoCapability: number;
  fuelEfficiency: number;
  climbCapability: number;
  scoresByMatch: Array<{
    matchNumber: number;
    totalScore: number;
    autoScore: number;
    teleopScore: number;
  }>;
  cycleStats?: TeamCycleStats;
}

// GET team statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const compareTeamIds = searchParams.get('compare'); // comma-separated team IDs for comparison

    if (teamId) {
      // Get stats for specific team
      const records = await db.scoutingData.findMany({
        where: { teamId },
        include: { match: true }
      });

      if (records.length === 0) {
        return NextResponse.json({
          teamId,
          matchCount: 0,
          avgTotalScore: 0,
          avgAutoScore: 0,
          avgTeleopScore: 0,
          avgFuelScored: 0,
          climbSuccessRate: 0,
          autoLeaveRate: 0,
          avgDefenseTime: 0,
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

      const totalMatches = records.length;
      const avgTotalScore = records.reduce((sum, r) => sum + r.totalScore, 0) / totalMatches;
      const avgAutoScore = records.reduce((sum, r) => sum + r.autoScore, 0) / totalMatches;
      const avgTeleopScore = records.reduce((sum, r) => sum + r.teleopScore, 0) / totalMatches;
      const totalFuelShots = records.reduce((sum, r) => 
        sum + r.autoFuelShots + 
        r.teleopTransitionShots + r.teleopShift1Shots + r.teleopShift2Shots + 
        r.teleopShift3Shots + r.teleopShift4Shots + r.teleopEndgameShots, 0);
      const avgFuelScored = totalFuelShots / totalMatches;
      const climbSuccessRate = records.filter(r => r.teleopClimbLevel > 0).length / totalMatches * 100;
      const autoLeaveRate = records.filter(r => r.autoLeftStartLine).length / totalMatches * 100;
      const avgDefenseTime = records.reduce((sum, r) => 
        sum + r.teleopTransitionDefense + r.teleopShift1Defense + 
        r.teleopShift2Defense + r.teleopShift3Defense + r.teleopShift4Defense, 0) / totalMatches;
      const avgDriverRating = records.reduce((sum, r) => sum + r.driverRating, 0) / totalMatches;
      const avgDefenseRating = records.reduce((sum, r) => sum + r.defenseRating, 0) / totalMatches;

      // Score trend by match
      const scoresByMatch = records
        .sort((a, b) => a.match.matchNumber - b.match.matchNumber)
        .map(r => ({
          matchNumber: r.match.matchNumber,
          totalScore: r.totalScore,
          autoScore: r.autoScore,
          teleopScore: r.teleopScore
        }));

      // Cycle stats
      const cycleStats: TeamCycleStats = {
        transition: {
          avgShots: records.reduce((sum, r) => sum + r.teleopTransitionShots, 0) / totalMatches,
          avgAccuracy: records.reduce((sum, r) => sum + r.teleopTransitionAccuracy, 0) / totalMatches
        },
        shift1: {
          avgShots: records.reduce((sum, r) => sum + r.teleopShift1Shots, 0) / totalMatches,
          avgAccuracy: records.reduce((sum, r) => sum + r.teleopShift1Accuracy, 0) / totalMatches
        },
        shift2: {
          avgShots: records.reduce((sum, r) => sum + r.teleopShift2Shots, 0) / totalMatches,
          avgAccuracy: records.reduce((sum, r) => sum + r.teleopShift2Accuracy, 0) / totalMatches
        },
        shift3: {
          avgShots: records.reduce((sum, r) => sum + r.teleopShift3Shots, 0) / totalMatches,
          avgAccuracy: records.reduce((sum, r) => sum + r.teleopShift3Accuracy, 0) / totalMatches
        },
        shift4: {
          avgShots: records.reduce((sum, r) => sum + r.teleopShift4Shots, 0) / totalMatches,
          avgAccuracy: records.reduce((sum, r) => sum + r.teleopShift4Accuracy, 0) / totalMatches
        },
        endgame: {
          avgShots: records.reduce((sum, r) => sum + r.teleopEndgameShots, 0) / totalMatches,
          avgAccuracy: records.reduce((sum, r) => sum + r.teleopEndgameAccuracy, 0) / totalMatches
        }
      };

      return NextResponse.json({
        teamId,
        matchCount: totalMatches,
        avgTotalScore: Math.round(avgTotalScore * 10) / 10,
        avgAutoScore: Math.round(avgAutoScore * 10) / 10,
        avgTeleopScore: Math.round(avgTeleopScore * 10) / 10,
        avgFuelScored: Math.round(avgFuelScored * 10) / 10,
        climbSuccessRate: Math.round(climbSuccessRate * 10) / 10,
        autoLeaveRate: Math.round(autoLeaveRate * 10) / 10,
        avgDefenseTime: Math.round(avgDefenseTime * 10) / 10,
        avgDriverRating: Math.round(avgDriverRating * 10) / 10,
        avgDefenseRating: Math.round(avgDefenseRating * 10) / 10,
        scoresByMatch,
        cycleStats,
        climbLevelDistribution: {
          level0: records.filter(r => r.teleopClimbLevel === 0).length,
          level1: records.filter(r => r.teleopClimbLevel === 1).length,
          level2: records.filter(r => r.teleopClimbLevel === 2).length,
          level3: records.filter(r => r.teleopClimbLevel === 3).length
        }
      });
    }

    // Handle comparison mode
    if (compareTeamIds) {
      const teamIds = compareTeamIds.split(',');
      const comparisonData: Array<{
        teamId: string;
        teamNumber: number;
        nickname: string | null;
        matchCount: number;
        avgTotalScore: number;
        avgAutoScore: number;
        avgTeleopScore: number;
        climbSuccessRate: number;
        avgDriverRating: number;
        avgDefenseRating: number;
      }> = [];
      
      for (const tid of teamIds) {
        const team = await db.team.findUnique({
          where: { id: tid },
          include: { scoutingRecords: { include: { match: true } } }
        });
        
        if (team && team.scoutingRecords.length > 0) {
          const records = team.scoutingRecords;
          const totalMatches = records.length;
          
          comparisonData.push({
            teamId: team.id,
            teamNumber: team.teamNumber,
            nickname: team.nickname,
            matchCount: totalMatches,
            avgTotalScore: Math.round(records.reduce((sum, r) => sum + r.totalScore, 0) / totalMatches * 10) / 10,
            avgAutoScore: Math.round(records.reduce((sum, r) => sum + r.autoScore, 0) / totalMatches * 10) / 10,
            avgTeleopScore: Math.round(records.reduce((sum, r) => sum + r.teleopScore, 0) / totalMatches * 10) / 10,
            climbSuccessRate: Math.round(records.filter(r => r.teleopClimbLevel > 0).length / totalMatches * 1000) / 10,
            avgDriverRating: Math.round(records.reduce((sum, r) => sum + r.driverRating, 0) / totalMatches * 10) / 10,
            avgDefenseRating: Math.round(records.reduce((sum, r) => sum + r.defenseRating, 0) / totalMatches * 10) / 10,
          });
        }
      }
      
      return NextResponse.json({ comparison: comparisonData });
    }

    // Get stats for all teams
    const teams = await db.team.findMany({
      include: {
        scoutingRecords: {
          include: { match: true }
        }
      }
    });

    const teamStats: TeamStatResult[] = teams.map(team => {
      const records = team.scoutingRecords;
      if (records.length === 0) {
        return {
          teamId: team.id,
          teamNumber: team.teamNumber,
          nickname: team.nickname,
          matchCount: 0,
          avgTotalScore: 0,
          avgAutoScore: 0,
          avgTeleopScore: 0,
          avgFuelScored: 0,
          climbSuccessRate: 0,
          autoLeaveRate: 0,
          avgDefenseTime: 0,
          autoCapability: 0,
          fuelEfficiency: 0,
          climbCapability: 0,
          avgDriverRating: 0,
          avgDefenseRating: 0,
          scoresByMatch: [],
          cycleStats: {
            transition: { avgShots: 0, avgAccuracy: 0 },
            shift1: { avgShots: 0, avgAccuracy: 0 },
            shift2: { avgShots: 0, avgAccuracy: 0 },
            shift3: { avgShots: 0, avgAccuracy: 0 },
            shift4: { avgShots: 0, avgAccuracy: 0 },
            endgame: { avgShots: 0, avgAccuracy: 0 },
          }
        };
      }

      const totalMatches = records.length;
      const avgTotalScore = records.reduce((sum, r) => sum + r.totalScore, 0) / totalMatches;
      const avgAutoScore = records.reduce((sum, r) => sum + r.autoScore, 0) / totalMatches;
      const avgTeleopScore = records.reduce((sum, r) => sum + r.teleopScore, 0) / totalMatches;
      const totalFuelShots = records.reduce((sum, r) => 
        sum + r.autoFuelShots + 
        r.teleopTransitionShots + r.teleopShift1Shots + r.teleopShift2Shots + 
        r.teleopShift3Shots + r.teleopShift4Shots + r.teleopEndgameShots, 0);
      const avgFuelScored = totalFuelShots / totalMatches;
      const climbSuccessRate = records.filter(r => r.teleopClimbLevel > 0).length / totalMatches * 100;
      const autoLeaveRate = records.filter(r => r.autoLeftStartLine).length / totalMatches * 100;
      const avgDefenseTime = records.reduce((sum, r) => 
        sum + r.teleopTransitionDefense + r.teleopShift1Defense + 
        r.teleopShift2Defense + r.teleopShift3Defense + r.teleopShift4Defense, 0) / totalMatches;
      const avgDriverRating = records.reduce((sum, r) => sum + r.driverRating, 0) / totalMatches;
      const avgDefenseRating = records.reduce((sum, r) => sum + r.defenseRating, 0) / totalMatches;

      // Score trend by match
      const scoresByMatch = records
        .map(r => ({
          matchNumber: r.match.matchNumber,
          totalScore: r.totalScore,
          autoScore: r.autoScore,
          teleopScore: r.teleopScore
        }))
        .sort((a, b) => a.matchNumber - b.matchNumber);

      // Calculate capability ratings (0-10 scale)
      const autoCapability = Math.min(10, (
        (autoLeaveRate / 100) * 3 +
        (records.reduce((sum, r) => sum + r.autoClimbLevel, 0) / totalMatches) +
        Math.min(4, avgAutoScore / 10)
      ));

      const fuelEfficiency = Math.min(10, avgFuelScored / 10);

      const climbCapability = Math.min(10, (
        (climbSuccessRate / 100) * 5 +
        (records.reduce((sum, r) => sum + Math.max(r.autoClimbLevel, r.teleopClimbLevel), 0) / totalMatches) * 1.67
      ));

      // Cycle stats
      const cycleStats: TeamCycleStats = {
        transition: {
          avgShots: Math.round(records.reduce((sum, r) => sum + r.teleopTransitionShots, 0) / totalMatches * 10) / 10,
          avgAccuracy: Math.round(records.reduce((sum, r) => sum + r.teleopTransitionAccuracy, 0) / totalMatches * 10) / 10
        },
        shift1: {
          avgShots: Math.round(records.reduce((sum, r) => sum + r.teleopShift1Shots, 0) / totalMatches * 10) / 10,
          avgAccuracy: Math.round(records.reduce((sum, r) => sum + r.teleopShift1Accuracy, 0) / totalMatches * 10) / 10
        },
        shift2: {
          avgShots: Math.round(records.reduce((sum, r) => sum + r.teleopShift2Shots, 0) / totalMatches * 10) / 10,
          avgAccuracy: Math.round(records.reduce((sum, r) => sum + r.teleopShift2Accuracy, 0) / totalMatches * 10) / 10
        },
        shift3: {
          avgShots: Math.round(records.reduce((sum, r) => sum + r.teleopShift3Shots, 0) / totalMatches * 10) / 10,
          avgAccuracy: Math.round(records.reduce((sum, r) => sum + r.teleopShift3Accuracy, 0) / totalMatches * 10) / 10
        },
        shift4: {
          avgShots: Math.round(records.reduce((sum, r) => sum + r.teleopShift4Shots, 0) / totalMatches * 10) / 10,
          avgAccuracy: Math.round(records.reduce((sum, r) => sum + r.teleopShift4Accuracy, 0) / totalMatches * 10) / 10
        },
        endgame: {
          avgShots: Math.round(records.reduce((sum, r) => sum + r.teleopEndgameShots, 0) / totalMatches * 10) / 10,
          avgAccuracy: Math.round(records.reduce((sum, r) => sum + r.teleopEndgameAccuracy, 0) / totalMatches * 10) / 10
        }
      };

      return {
        teamId: team.id,
        teamNumber: team.teamNumber,
        nickname: team.nickname,
        matchCount: totalMatches,
        avgTotalScore: Math.round(avgTotalScore * 10) / 10,
        avgAutoScore: Math.round(avgAutoScore * 10) / 10,
        avgTeleopScore: Math.round(avgTeleopScore * 10) / 10,
        avgFuelScored: Math.round(avgFuelScored * 10) / 10,
        climbSuccessRate: Math.round(climbSuccessRate * 10) / 10,
        autoLeaveRate: Math.round(autoLeaveRate * 10) / 10,
        avgDefenseTime: Math.round(avgDefenseTime * 10) / 10,
        autoCapability: Math.round(autoCapability * 10) / 10,
        fuelEfficiency: Math.round(fuelEfficiency * 10) / 10,
        climbCapability: Math.round(climbCapability * 10) / 10,
        avgDriverRating: Math.round(avgDriverRating * 10) / 10,
        avgDefenseRating: Math.round(avgDefenseRating * 10) / 10,
        scoresByMatch,
        cycleStats
      };
    });

    // Sort by average total score
    teamStats.sort((a, b) => b.avgTotalScore - a.avgTotalScore);

    return NextResponse.json(teamStats);
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
