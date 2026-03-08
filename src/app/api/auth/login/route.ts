import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';
import type { User } from '@prisma/client';

// Login endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Check for preview account or database user
    let user: User | null = null;
    
    if (username === '预览账号' && password === '6353') {
      // Preview account - check if exists, if not create
      user = await db.user.findUnique({
        where: { username: '预览账号' }
      });

      if (!user) {
        user = await db.user.create({
          data: {
            username: '预览账号',
            password: '6353',
            name: 'Preview Account',
            isAdmin: true
          }
        });
      }
    } else {
      // Check database for user
      user = await db.user.findUnique({
        where: { username }
      });
      
      if (!user || user.password !== password) {
        return NextResponse.json(
          { error: 'Invalid username or password' },
          { status: 401 }
        );
      }
    }

    // Create session token
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt
      }
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        isAdmin: user.isAdmin
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
