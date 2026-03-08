import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET export all scouting data as CSV
export async function GET(request: NextRequest) {
  try {
    const scoutingData = await db.scoutingData.findMany({
      include: {
        team: true,
        match: true,
        user: {
          select: {
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

    // CSV headers
    const headers = [
      '比赛编号',
      '队伍编号',
      '队伍昵称',
      '联盟',
      '情报员',
      '自动: 离开起始线',
      '自动: 发射球数',
      '自动: 命中率(%)',
      '自动: 攀爬等级',
      '自动: 得分',
      '过渡: 发射球数',
      '过渡: 命中率(%)',
      '切换1: 发射球数',
      '切换1: 命中率(%)',
      '切换2: 发射球数',
      '切换2: 命中率(%)',
      '切换3: 发射球数',
      '切换3: 命中率(%)',
      '切换4: 发射球数',
      '切换4: 命中率(%)',
      '最终: 发射球数',
      '最终: 命中率(%)',
      '手动: 攀爬等级',
      '攀爬时间(秒)',
      '手动: 得分',
      '小犯规',
      '大犯规',
      '黄牌',
      '红牌',
      '犯规备注',
      'Driver能力',
      '防守能力',
      '是否宕机',
      '宕机时长',
      '备注',
      '总分',
      '记录员'
    ];

    // CSV rows
    const rows = scoutingData.map(record => [
      record.match.matchNumber,
      record.team.teamNumber,
      record.team.nickname || '',
      record.alliance,
      record.scoutName || '',
      record.autoLeftStartLine ? '是' : '否',
      record.autoFuelShots,
      record.autoFuelAccuracy,
      record.autoClimbLevel,
      record.autoScore,
      record.teleopTransitionShots,
      record.teleopTransitionAccuracy,
      record.teleopShift1Shots,
      record.teleopShift1Accuracy,
      record.teleopShift2Shots,
      record.teleopShift2Accuracy,
      record.teleopShift3Shots,
      record.teleopShift3Accuracy,
      record.teleopShift4Shots,
      record.teleopShift4Accuracy,
      record.teleopEndgameShots,
      record.teleopEndgameAccuracy,
      record.teleopClimbLevel,
      record.teleopClimbTime,
      record.teleopScore,
      record.minorFouls,
      record.majorFouls,
      record.yellowCard ? '是' : '否',
      record.redCard ? '是' : '否',
      `"${(record.foulNotes || '').replace(/"/g, '""')}"`,
      record.driverRating,
      record.defenseRating,
      record.wasDisabled ? '是' : '否',
      record.disabledDuration || '',
      `"${(record.notes || '').replace(/"/g, '""')}"`,
      record.totalScore,
      record.user?.name || record.user?.username || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Add BOM for Excel compatibility with Chinese characters
    const bom = '\uFEFF';
    const csvWithBom = bom + csv;

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="frc-scouting-data.csv"'
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
