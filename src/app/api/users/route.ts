import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { createUser, getUsersByTenantId } from '@/lib/db';
import { initializeDatabase } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET /api/users - List all users in the tenant (Admin only)
export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();
    
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (auth.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const users = await getUsersByTenantId(auth.tenantId);
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/users - Invite a new user (Admin only)
export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();
    
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (auth.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const { email, password, role = 'member' } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (!['admin', 'member'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin or member' },
        { status: 400 }
      );
    }

    const newUser = await createUser({
      email,
      password,
      role,
      tenantId: auth.tenantId
    });

    return NextResponse.json({ 
      user: {
        id: newUser._id.toString(),
        email: newUser.email,
        role: newUser.role,
        tenantId: newUser.tenantId.toString()
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
