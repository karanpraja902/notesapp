import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, createUser, createTenant, getUserByEmail, getTenantBySlug } from '@/lib/db';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// POST /api/auth/signup - Register new organization
export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();
    
    const body = await request.json();
    const { 
      organizationName, 
      organizationSlug, 
      adminEmail, 
      adminPassword, 
      adminFirstName, 
      adminLastName 
    } = body;

    // Validate required fields
    if (!organizationName || !organizationSlug || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'Organization name, slug, admin email, and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (adminPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Validate organization slug format (alphanumeric and hyphens only)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(organizationSlug)) {
      return NextResponse.json(
        { error: 'Organization slug can only contain lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    // Check if organization slug is already taken
    const existingTenant = await getTenantBySlug(organizationSlug);
    if (existingTenant) {
      return NextResponse.json(
        { error: 'Organization slug is already taken' },
        { status: 409 }
      );
    }

    // Check if admin email is already registered
    const existingUser = await getUserByEmail(adminEmail);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email is already registered' },
        { status: 409 }
      );
    }

    // Create the organization (tenant)
    const tenantData = {
      name: organizationName,
      slug: organizationSlug,
      plan: 'free',
      noteLimit: 3,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const tenant = await createTenant(tenantData);
    if (!tenant) {
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      );
    }

    // Create the admin user (password will be hashed in createUser function)
    const userData = {
      email: adminEmail,
      password: adminPassword, // Pass plain password - createUser will hash it
      firstName: adminFirstName || '',
      lastName: adminLastName || '',
      role: 'admin',
      tenantId: tenant._id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const user = await createUser(userData);
    if (!user) {
      return NextResponse.json(
        { error: 'Failed to create admin user' },
        { status: 500 }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        tenantId: user.tenantId.toString(),
        tenantSlug: tenant.slug
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Return success response
    return NextResponse.json({
      message: 'Organization registered successfully',
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId.toString(),
        tenantSlug: tenant.slug
      },
      organization: {
        id: tenant._id.toString(),
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        noteLimit: tenant.noteLimit
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
