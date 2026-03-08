import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET all teams
export async function GET(request: NextRequest) {
  try {
    const teams = await db.team.findMany({
      orderBy: { teamNumber: 'asc' },
      include: {
        _count: {
          select: { scoutingRecords: true }
        }
      }
    });

    return NextResponse.json(teams);
  } catch (error) {
    console.error('Get teams error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new team
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamNumber, nickname, city, state, country } = body;

    if (!teamNumber) {
      return NextResponse.json(
        { error: 'Team number is required' },
        { status: 400 }
      );
    }

    const existingTeam = await db.team.findUnique({
      where: { teamNumber }
    });

    if (existingTeam) {
      return NextResponse.json(existingTeam);
    }

    const team = await db.team.create({
      data: {
        teamNumber,
        nickname,
        city,
        state,
        country
      }
    });

    return NextResponse.json(team);
  } catch (error) {
    console.error('Create team error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE team
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    await db.team.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete team error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
