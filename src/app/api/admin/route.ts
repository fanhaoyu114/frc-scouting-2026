import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch all users and system stats
export async function GET(request: NextRequest) {
  try {
    // Get all users
    const users = await db.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        isAdmin: true,
        createdAt: true,
        _count: {
          select: { scoutingRecords: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get system stats
    const teamCount = await db.team.count();
    const matchCount = await db.match.count();
    const recordCount = await db.scoutingData.count();

    return NextResponse.json({
      users,
      stats: {
        teamCount,
        matchCount,
        recordCount
      }
    });
  } catch (error) {
    console.error('Get admin data error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, name, isAdmin } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Check if username exists
    const existing = await db.user.findUnique({
      where: { username }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }

    const user = await db.user.create({
      data: {
        username,
        password,
        name: name || null,
        isAdmin: isAdmin || false
      }
    });

    return NextResponse.json({
      id: user.id,
      username: user.username,
      name: user.name,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete user or clear data
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');

    if (action === 'clear-records') {
      // Clear all scouting records
      await db.scoutingData.deleteMany({});
      return NextResponse.json({ success: true, message: 'All records cleared' });
    }

    if (action === 'clear-teams') {
      // Clear all teams (will fail if there are records)
      await db.scoutingData.deleteMany({});
      await db.team.deleteMany({});
      return NextResponse.json({ success: true, message: 'All teams cleared' });
    }

    if (action === 'clear-matches') {
      // Clear all matches (will fail if there are records)
      await db.scoutingData.deleteMany({});
      await db.match.deleteMany({});
      return NextResponse.json({ success: true, message: 'All matches cleared' });
    }

    if (action === 'clear-all') {
      // Clear all data
      await db.scoutingData.deleteMany({});
      await db.match.deleteMany({});
      await db.team.deleteMany({});
      return NextResponse.json({ success: true, message: 'All data cleared' });
    }

    if (userId) {
      // Delete specific user
      await db.session.deleteMany({ where: { userId } });
      await db.user.delete({ where: { id: userId } });
      return NextResponse.json({ success: true, message: 'User deleted' });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Admin delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update user
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, username, password, name, isAdmin } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (username) updateData.username = username;
    if (password) updateData.password = password;
    if (name !== undefined) updateData.name = name;
    if (isAdmin !== undefined) updateData.isAdmin = isAdmin;

    const user = await db.user.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      id: user.id,
      username: user.username,
      name: user.name,
      isAdmin: user.isAdmin
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
