import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, canUpgradeSubscription } from '@/lib/rbac';
import { upgradeTenant } from '@/lib/db';
import { initializeDatabase } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await initializeDatabase();
    
    const { auth, response } = requireAuth(request, { requiredRole: 'admin' });
    if (!auth) {
      return response!;
    }

    if (!canUpgradeSubscription(auth)) {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const { slug } = await params;
    if (auth.tenantSlug !== slug) {
      return NextResponse.json({ error: 'Cannot upgrade other tenants' }, { status: 403 });
    }

    const updatedTenant = await upgradeTenant(slug);
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
