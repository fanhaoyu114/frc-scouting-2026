import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();

    const result = await db.execute(`
      SELECT sr.*, t.number as teamNumber, t.name as teamName, m.matchNumber
      FROM ScoutingRecord sr
      LEFT JOIN Team t ON sr.teamId = t.id
      LEFT JOIN Match m ON sr.matchId = m.id
      ORDER BY m.matchNumber ASC, t.number ASC
    `);

    const headers = [
      '比赛编号', '队伍编号', '队伍名称', '联盟', '情报员', '机器人类型',
      '自动: 离开起始线', '自动: 发射球数', '自动: 命中率(%)', '自动: 攀爬等级', '自动: 赢得',
      '过渡: 发射球数', '过渡: 命中率(%)', '过渡: 防守', '过渡: 运输',
      '切换1: 发射球数', '切换1: 命中率(%)', '切换1: 防守', '切换1: 运输',
      '切换2: 发射球数', '切换2: 命中率(%)', '切换2: 防守', '切换2: 运输',
      '切换3: 发射球数', '切换3: 命中率(%)', '切换3: 防守', '切换3: 运输',
      '切换4: 发射球数', '切换4: 命中率(%)', '切换4: 防守', '切换4: 运输',
      '最终: 发射球数', '最终: 命中率(%)',
      '攀爬等级', '攀爬时间(秒)',
      '小犯规', '大犯规', '黄牌', '红牌', '犯规记录', '犯规备注',
      'Driver评分', '防守评分',
      '是否宕机', '宕机时长',
      '备注', '自动得分', '手动得分', '总分', '创建时间'
    ];

    const rows = result.rows.map(record => [
      record.matchNumber, record.teamNumber, record.teamName || '', record.alliance, record.scoutName || '', record.robotType || '',
      record.autoLeftStartLine ? '是' : '否', record.autoFuelShots, record.autoFuelAccuracy, record.autoClimbLevel, record.autoWon ? '是' : '否',
      record.teleopTransitionShots, record.teleopTransitionAccuracy, record.teleopTransitionDefense, record.teleopTransitionTransport,
      record.teleopShift1Shots, record.teleopShift1Accuracy, record.teleopShift1Defense, record.teleopShift1Transport,
      record.teleopShift2Shots, record.teleopShift2Accuracy, record.teleopShift2Defense, record.teleopShift2Transport,
      record.teleopShift3Shots, record.teleopShift3Accuracy, record.teleopShift3Defense, record.teleopShift3Transport,
      record.teleopShift4Shots, record.teleopShift4Accuracy, record.teleopShift4Defense, record.teleopShift4Transport,
      record.teleopEndgameShots, record.teleopEndgameAccuracy,
      record.teleopClimbLevel, record.teleopClimbTime,
      record.minorFouls, record.majorFouls, record.yellowCard ? '是' : '否', record.redCard ? '是' : '否',
      `"${(record.foulRecords as string || '').replace(/"/g, '""')}"`, `"${(record.foulNotes as string || '').replace(/"/g, '""')}"`,
      record.driverRating, record.defenseRating,
      record.wasDisabled ? '是' : '否', record.disabledDuration || '',
      `"${(record.notes as string || '').replace(/"/g, '""')}"`,
      record.autoScore, record.teleopScore, record.totalScore, record.createdAt
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const bom = '\uFEFF';

    return new NextResponse(bom + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="frc-scouting-data.csv"'
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
