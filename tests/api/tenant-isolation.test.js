// Mock NextResponse before importing the routes
const mockNextResponse = {
  json: jest.fn((data, options = {}) => ({
    status: options.status || 200,
    json: () => Promise.resolve(data),
    headers: new Map()
  }))
};

// Mock the NextResponse module
jest.mock('next/server', () => ({
  NextResponse: mockNextResponse
}));

// Mock database functions
const mockGetNotesByUserId = jest.fn();
const mockGetNoteById = jest.fn();
const mockCreateNote = jest.fn();
const mockUpdateNote = jest.fn();
const mockDeleteNote = jest.fn();
const mockGetTenantById = jest.fn();
const mockGetNoteCountByUser = jest.fn();
const mockInitializeDatabase = jest.fn();

jest.mock('../../src/lib/db', () => ({
  getNotesByUserId: mockGetNotesByUserId,
  getNoteById: mockGetNoteById,
  createNote: mockCreateNote,
  updateNote: mockUpdateNote,
  deleteNote: mockDeleteNote,
  getTenantById: mockGetTenantById,
  getNoteCountByUser: mockGetNoteCountByUser,
  initializeDatabase: mockInitializeDatabase
}));

// Mock RBAC functions
const mockRequireAuth = jest.fn();
const mockCanManageNotes = jest.fn();

jest.mock('../../src/lib/rbac', () => ({
  requireAuth: mockRequireAuth,
  canManageNotes: mockCanManageNotes
}));

// Import route handlers
const { GET: getNotes, POST: createNote } = require('../../src/app/api/notes/route');
const { GET: getNote, PUT: updateNote, DELETE: deleteNote } = require('../../src/app/api/notes/[id]/route');

describe('Tenant Isolation Tests', () => {
  // Test data for different tenants
  const acmeTenant = {
    _id: 'tenant-1',
    name: 'Acme',
    slug: 'acme',
    plan: 'free',
    noteLimit: 3
  };

  const globexTenant = {
    _id: 'tenant-2',
    name: 'Globex',
    slug: 'globex',
    plan: 'free',
    noteLimit: 3
  };

  const acmeUser = {
    userId: 'user-1',
    email: 'admin@acme.test',
    role: 'admin',
    tenantId: 'tenant-1',
    tenantSlug: 'acme'
  };

  const globexUser = {
    userId: 'user-2',
    email: 'admin@globex.test',
    role: 'admin',
    tenantId: 'tenant-2',
    tenantSlug: 'globex'
  };

  const acmeNotes = [
    {
      _id: 'note-1',
      title: 'Acme Note 1',
      content: 'This is an Acme note',
      userId: 'user-1',
      tenantId: 'tenant-1',
      createdAt: new Date()
    },
    {
      _id: 'note-2',
      title: 'Acme Note 2',
      content: 'Another Acme note',
      userId: 'user-1',
      tenantId: 'tenant-1',
      createdAt: new Date()
    }
  ];

  const globexNotes = [
    {
      _id: 'note-3',
      title: 'Globex Note 1',
      content: 'This is a Globex note',
      userId: 'user-2',
      tenantId: 'tenant-2',
      createdAt: new Date()
    },
    {
      _id: 'note-4',
      title: 'Globex Note 2',
      content: 'Another Globex note',
      userId: 'user-2',
      tenantId: 'tenant-2',
      createdAt: new Date()
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockInitializeDatabase.mockResolvedValue();
    mockCanManageNotes.mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/notes - Tenant Isolation', () => {
    it('should only return notes from user\'s own tenant (Acme user)', async () => {
      // Setup auth for Acme user
      mockRequireAuth.mockReturnValue({ auth: acmeUser });
      mockGetNotesByUserId.mockResolvedValue(acmeNotes);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer valid-token']])
      };

      const response = await getNotes(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.notes).toEqual(acmeNotes);
      expect(mockGetNotesByUserId).toHaveBeenCalledWith(acmeUser.userId, acmeUser.tenantId);
      
      // Verify only Acme notes are returned
      responseData.notes.forEach(note => {
        expect(note.tenantId).toBe('tenant-1');
        expect(note.tenantId).not.toBe('tenant-2');
      });
    });

    it('should only return notes from user\'s own tenant (Globex user)', async () => {
      // Setup auth for Globex user
      mockRequireAuth.mockReturnValue({ auth: globexUser });
      mockGetNotesByUserId.mockResolvedValue(globexNotes);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer valid-token']])
      };

      const response = await getNotes(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.notes).toEqual(globexNotes);
      expect(mockGetNotesByUserId).toHaveBeenCalledWith(globexUser.userId, globexUser.tenantId);
      
      // Verify only Globex notes are returned
      responseData.notes.forEach(note => {
        expect(note.tenantId).toBe('tenant-2');
        expect(note.tenantId).not.toBe('tenant-1');
      });
    });

    it('should prevent cross-tenant data access', async () => {
      // Test that Acme user cannot access Globex notes
      mockRequireAuth.mockReturnValue({ auth: acmeUser });
      mockGetNotesByUserId.mockResolvedValue(acmeNotes);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer valid-token']])
      };

      const response = await getNotes(mockRequest);
      const responseData = await response.json();

      // Verify Acme user only gets Acme notes
      expect(mockGetNotesByUserId).toHaveBeenCalledWith(acmeUser.userId, acmeUser.tenantId);
      expect(mockGetNotesByUserId).not.toHaveBeenCalledWith(acmeUser.userId, globexUser.tenantId);
      
      // Verify no Globex notes are returned
      responseData.notes.forEach(note => {
        expect(note.tenantId).toBe('tenant-1');
        expect(note._id).not.toBe('note-3');
        expect(note._id).not.toBe('note-4');
      });
    });
  });

  describe('GET /api/notes/[id] - Tenant Isolation', () => {
    it('should only return note if it belongs to user\'s tenant', async () => {
      const acmeNote = acmeNotes[0];
      mockRequireAuth.mockReturnValue({ auth: acmeUser });
      mockGetNoteById.mockResolvedValue(acmeNote);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer valid-token']])
      };

      const response = await getNote(mockRequest, { params: { id: 'note-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.note).toEqual(acmeNote);
      expect(mockGetNoteById).toHaveBeenCalledWith('note-1', acmeUser.tenantId, acmeUser.userId);
    });

    it('should return 404 when trying to access note from different tenant', async () => {
      // Try to access Globex note with Acme user credentials
      mockRequireAuth.mockReturnValue({ auth: acmeUser });
      mockGetNoteById.mockResolvedValue(null); // Note not found due to tenant isolation

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer valid-token']])
      };

      const response = await getNote(mockRequest, { params: { id: 'note-3' } }); // Globex note ID

      expect(response.status).toBe(404);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Note not found' },
        { status: 404 }
      );
      expect(mockGetNoteById).toHaveBeenCalledWith('note-3', acmeUser.tenantId, acmeUser.userId);
    });

    it('should enforce tenant isolation in database query', async () => {
      mockRequireAuth.mockReturnValue({ auth: acmeUser });
      mockGetNoteById.mockResolvedValue(null);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer valid-token']])
      };

      await getNote(mockRequest, { params: { id: 'note-3' } });

      // Verify the database query includes tenantId filter
      expect(mockGetNoteById).toHaveBeenCalledWith('note-3', acmeUser.tenantId, acmeUser.userId);
      expect(mockGetNoteById).not.toHaveBeenCalledWith('note-3', globexUser.tenantId, acmeUser.userId);
    });
  });

  describe('POST /api/notes - Tenant Isolation', () => {
    it('should create note with correct tenant ID', async () => {
      const newNote = {
        _id: 'note-new',
        title: 'New Acme Note',
        content: 'Content for new note',
        userId: acmeUser.userId,
        tenantId: acmeUser.tenantId,
        createdAt: new Date()
      };

      mockRequireAuth.mockReturnValue({ auth: acmeUser });
      mockGetTenantById.mockResolvedValue(acmeTenant);
      mockGetNoteCountByUser.mockResolvedValue(1);
      mockCreateNote.mockResolvedValue(newNote);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer valid-token']]),
        json: jest.fn().mockResolvedValue({
          title: 'New Acme Note',
          content: 'Content for new note'
        })
      };

      const response = await createNote(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.note).toEqual(newNote);
      expect(mockCreateNote).toHaveBeenCalledWith({
        title: 'New Acme Note',
        content: 'Content for new note',
        userId: acmeUser.userId,
        tenantId: acmeUser.tenantId
      });
    });

    it('should prevent creating notes for different tenant', async () => {
      mockRequireAuth.mockReturnValue({ auth: acmeUser });
      mockGetTenantById.mockResolvedValue(acmeTenant);
      mockGetNoteCountByUser.mockResolvedValue(1);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer valid-token']]),
        json: jest.fn().mockResolvedValue({
          title: 'New Note',
          content: 'Content for new note'
        })
      };

      await createNote(mockRequest);

      // Verify note is created with Acme user's tenant ID, not Globex
      expect(mockCreateNote).toHaveBeenCalledWith({
        title: 'New Note',
        content: 'Content for new note',
        userId: acmeUser.userId,
        tenantId: acmeUser.tenantId
      });
      expect(mockCreateNote).not.toHaveBeenCalledWith({
        title: 'New Note',
        content: 'Content for new note',
        userId: acmeUser.userId,
        tenantId: globexUser.tenantId
      });
    });
  });

  describe('PUT /api/notes/[id] - Tenant Isolation', () => {
    it('should only update notes from user\'s own tenant', async () => {
      const updatedNote = {
        ...acmeNotes[0],
        title: 'Updated Acme Note',
        content: 'Updated content'
      };

      mockRequireAuth.mockReturnValue({ auth: acmeUser });
      mockUpdateNote.mockResolvedValue(updatedNote);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer valid-token']]),
        json: jest.fn().mockResolvedValue({
          title: 'Updated Acme Note',
          content: 'Updated content'
        })
      };

      const response = await updateNote(mockRequest, { params: { id: 'note-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.note).toEqual(updatedNote);
      expect(mockUpdateNote).toHaveBeenCalledWith(
        'note-1',
        acmeUser.tenantId,
        { title: 'Updated Acme Note', content: 'Updated content' },
        acmeUser.userId
      );
    });

    it('should return 404 when trying to update note from different tenant', async () => {
      mockRequireAuth.mockReturnValue({ auth: acmeUser });
      mockUpdateNote.mockResolvedValue(null); // Note not found due to tenant isolation

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer valid-token']]),
        json: jest.fn().mockResolvedValue({
          title: 'Updated Note',
          content: 'Updated content'
        })
      };

      const response = await updateNote(mockRequest, { params: { id: 'note-3' } }); // Globex note ID

      expect(response.status).toBe(404);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Note not found' },
        { status: 404 }
      );
      expect(mockUpdateNote).toHaveBeenCalledWith(
        'note-3',
        acmeUser.tenantId,
        { title: 'Updated Note', content: 'Updated content' },
        acmeUser.userId
      );
    });
  });

  describe('DELETE /api/notes/[id] - Tenant Isolation', () => {
    it('should only delete notes from user\'s own tenant', async () => {
      mockRequireAuth.mockReturnValue({ auth: acmeUser });
      mockDeleteNote.mockResolvedValue(true);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer valid-token']])
      };

      const response = await deleteNote(mockRequest, { params: { id: 'note-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.message).toBe('Note deleted successfully');
      expect(mockDeleteNote).toHaveBeenCalledWith('note-1', acmeUser.tenantId, acmeUser.userId);
    });

    it('should return 404 when trying to delete note from different tenant', async () => {
      mockRequireAuth.mockReturnValue({ auth: acmeUser });
      mockDeleteNote.mockResolvedValue(false); // Note not found due to tenant isolation

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer valid-token']])
      };

      const response = await deleteNote(mockRequest, { params: { id: 'note-3' } }); // Globex note ID

      expect(response.status).toBe(404);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Note not found' },
        { status: 404 }
      );
      expect(mockDeleteNote).toHaveBeenCalledWith('note-3', acmeUser.tenantId, acmeUser.userId);
    });
  });

  describe('Cross-Tenant Data Protection', () => {
    it('should prevent Acme user from accessing any Globex data', async () => {
      // Test all CRUD operations with cross-tenant access
      mockRequireAuth.mockReturnValue({ auth: acmeUser });
      mockGetNotesByUserId.mockResolvedValue(acmeNotes);
      mockGetNoteById.mockResolvedValue(null);
      mockUpdateNote.mockResolvedValue(null);
      mockDeleteNote.mockResolvedValue(false);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer valid-token']]),
        json: jest.fn().mockResolvedValue({
          title: 'Test Note',
          content: 'Test content'
        })
      };

      // Test GET /api/notes
      const getResponse = await getNotes(mockRequest);
      const getData = await getResponse.json();
      expect(getData.notes.every(note => note.tenantId === 'tenant-1')).toBe(true);

      // Test GET /api/notes/[id] with Globex note ID
      const getByIdResponse = await getNote(mockRequest, { params: { id: 'note-3' } });
      expect(getByIdResponse.status).toBe(404);

      // Test PUT /api/notes/[id] with Globex note ID
      const putResponse = await updateNote(mockRequest, { params: { id: 'note-3' } });
      expect(putResponse.status).toBe(404);

      // Test DELETE /api/notes/[id] with Globex note ID
      const deleteResponse = await deleteNote(mockRequest, { params: { id: 'note-3' } });
      expect(deleteResponse.status).toBe(404);
    });

    it('should prevent Globex user from accessing any Acme data', async () => {
      // Test all CRUD operations with cross-tenant access
      mockRequireAuth.mockReturnValue({ auth: globexUser });
      mockGetNotesByUserId.mockResolvedValue(globexNotes);
      mockGetNoteById.mockResolvedValue(null);
      mockUpdateNote.mockResolvedValue(null);
      mockDeleteNote.mockResolvedValue(false);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer valid-token']]),
        json: jest.fn().mockResolvedValue({
          title: 'Test Note',
          content: 'Test content'
        })
      };

      // Test GET /api/notes
      const getResponse = await getNotes(mockRequest);
      const getData = await getResponse.json();
      expect(getData.notes.every(note => note.tenantId === 'tenant-2')).toBe(true);

      // Test GET /api/notes/[id] with Acme note ID
      const getByIdResponse = await getNote(mockRequest, { params: { id: 'note-1' } });
      expect(getByIdResponse.status).toBe(404);

      // Test PUT /api/notes/[id] with Acme note ID
      const putResponse = await updateNote(mockRequest, { params: { id: 'note-1' } });
      expect(putResponse.status).toBe(404);

      // Test DELETE /api/notes/[id] with Acme note ID
      const deleteResponse = await deleteNote(mockRequest, { params: { id: 'note-1' } });
      expect(deleteResponse.status).toBe(404);
    });
  });

  describe('JWT Token Tenant Validation', () => {
    it('should use tenant ID from JWT token for all operations', async () => {
      mockRequireAuth.mockReturnValue({ auth: acmeUser });
      mockGetNotesByUserId.mockResolvedValue(acmeNotes);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer valid-token']])
      };

      await getNotes(mockRequest);

      // Verify that the tenant ID from the JWT token is used
      expect(mockRequireAuth).toHaveBeenCalledWith(mockRequest);
      expect(mockGetNotesByUserId).toHaveBeenCalledWith(acmeUser.userId, acmeUser.tenantId);
    });

    it('should reject requests with invalid tenant context', async () => {
      // Mock invalid auth (no tenant context)
      mockRequireAuth.mockReturnValue({ 
        auth: null, 
        response: { status: 401, json: () => Promise.resolve({ error: 'Unauthorized' }) }
      });

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer invalid-token']])
      };

      const response = await getNotes(mockRequest);

      expect(response.status).toBe(401);
      expect(mockGetNotesByUserId).not.toHaveBeenCalled();
    });
  });
});
