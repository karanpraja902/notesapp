import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { getTenantBySlug } from '@/lib/db';
import { initializeDatabase } from '@/lib/db';

// GET /api/tenants/[slug] - Get tenant information
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await initializeDatabase();
    
    const { auth, response } = requireAuth(request);
    if (!auth) {
      return response!;
    }

    const { slug } = await params;
    // Users can only access their own tenant
    if (auth.tenantSlug !== slug) {
      return NextResponse.json({ error: 'Forbidden. Cannot access other tenants.' }, { status: 403 });
    }

    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      tenant: {
        id: tenant._id as string,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        noteLimit: tenant.noteLimit,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
