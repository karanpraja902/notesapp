import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { upgradeTenant } from '@/lib/db';
import { initializeDatabase } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await initializeDatabase();
    
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (auth.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    if (auth.tenantSlug !== params.slug) {
      return NextResponse.json({ error: 'Cannot upgrade other tenants' }, { status: 403 });
    }

    const updatedTenant = await upgradeTenant(params.slug);
    if (!updatedTenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Tenant upgraded to Pro successfully',
      tenant: updatedTenant
    });
  } catch (error) {
    console.error('Error upgrading tenant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
