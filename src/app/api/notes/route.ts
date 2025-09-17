import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, canManageNotes } from '@/lib/rbac';
import { getNotesByUserId, createNote, getTenantById, getNoteCountByUser } from '@/lib/db';
import { initializeDatabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();
    
    const { auth, response } = requireAuth(request);
    if (!auth) {
      return response!;
    }

    if (!canManageNotes(auth)) {
      return NextResponse.json({ error: 'Forbidden. Insufficient permissions.' }, { status: 403 });
    }

    const notes = await getNotesByUserId(auth.userId, auth.tenantId);
    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();
    
    const { auth, response } = requireAuth(request);
    if (!auth) {
      return response!;
    }

    if (!canManageNotes(auth)) {
      return NextResponse.json({ error: 'Forbidden. Insufficient permissions.' }, { status: 403 });
    }

    const { title, content } = await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Check subscription limits
    const tenant = await getTenantById(auth.tenantId);
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 500 });
    }

    if (tenant.plan === 'free') {
      const noteCount = await getNoteCountByUser(auth.userId, auth.tenantId);
      if (noteCount >= tenant.noteLimit) {
        return NextResponse.json(
          { 
            error: 'Note limit reached. Upgrade to Pro for unlimited notes.',
            limitReached: true 
          },
          { status: 403 }
        );
      }
    }

    const note = await createNote({
      title,
      content,
      userId: auth.userId,
      tenantId: auth.tenantId
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
