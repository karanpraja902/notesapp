import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, canManageNotes } from '@/lib/rbac';
import { getNoteById, updateNote, deleteNote } from '@/lib/db';
import { initializeDatabase } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initializeDatabase();
    
    const { auth, response } = requireAuth(request);
    if (!auth) {
      return response!;
    }

    if (!canManageNotes(auth)) {
      return NextResponse.json({ error: 'Forbidden. Insufficient permissions.' }, { status: 403 });
    }

    const note = await getNoteById(params.id, auth.tenantId, auth.userId);
    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ note });
  } catch (error) {
    console.error('Error fetching note:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const updatedNote = await updateNote(params.id, auth.tenantId, { title, content }, auth.userId);
    if (!updatedNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ note: updatedNote });
  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initializeDatabase();
    
    const { auth, response } = requireAuth(request);
    if (!auth) {
      return response!;
    }

    if (!canManageNotes(auth)) {
      return NextResponse.json({ error: 'Forbidden. Insufficient permissions.' }, { status: 403 });
    }

    const success = await deleteNote(params.id, auth.tenantId, auth.userId);
    if (!success) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
