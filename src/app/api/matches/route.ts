import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET all matches
export async function GET(request: NextRequest) {
  try {
    const matches = await db.match.findMany({
      orderBy: { matchNumber: 'asc' },
      include: {
        _count: {
          select: { scoutingRecords: true }
        }
      }
    });

    return NextResponse.json(matches);
  } catch (error) {
    console.error('Get matches error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new match
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { matchNumber, matchType } = body;

    if (!matchNumber) {
      return NextResponse.json(
        { error: 'Match number is required' },
        { status: 400 }
      );
    }

    const existingMatch = await db.match.findUnique({
      where: { matchNumber }
    });

    if (existingMatch) {
      return NextResponse.json(existingMatch);
    }

    const match = await db.match.create({
      data: {
        matchNumber,
        matchType: matchType || 'QUALIFICATION'
      }
    });

    return NextResponse.json(match);
  } catch (error) {
    console.error('Create match error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE match
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      );
    }

    await db.match.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete match error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
