import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET export all scouting data as CSV
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

    // CSV headers
    const headers = [
      '比赛编号',
      '队伍编号',
      '队伍名称',
      '联盟',
      '站位',
      '自动: 离开',
      '自动: 左侧Coral',
      '自动: 右侧Coral',
      '自动: Algae',
      '手动: 左侧Coral',
      '手动: 右侧Coral',
      '手动: Algae',
      'Barge',
      'Processor',
      '攀爬',
      '防守',
      '情报员',
      '情报员队伍',
      '备注',
      '创建时间'
    ];

    // CSV rows
    const rows = result.rows.map(record => [
      record.matchNumber,
      record.teamNumber,
      record.teamName || '',
      record.alliance,
      record.station,
      record.autoLeave,
      record.autoCoralLeft,
      record.autoCoralRight,
      record.autoAlgae,
      record.teleopCoralLeft,
      record.teleopCoralRight,
      record.teleopAlgae,
      record.barge,
      record.processor,
      record.climb,
      record.defense,
      record.scoutName || '',
      record.scoutTeam || '',
      `"${(record.notes as string || '').replace(/"/g, '""')}"`,
      record.createdAt
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
