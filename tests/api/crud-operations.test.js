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

describe('CRUD Operations Tests', () => {
  // Test user
  const testUser = {
    userId: 'user-1',
    email: 'user@acme.test',
    role: 'member',
    tenantId: 'tenant-1',
    tenantSlug: 'acme'
  };

  // Test tenant
  const testTenant = {
    _id: 'tenant-1',
    name: 'Acme',
    slug: 'acme',
    plan: 'pro', // Pro plan for unlimited access
    noteLimit: -1
  };

  // Mock notes data
  const mockNotes = [
    {
      _id: 'note-1',
      title: 'First Note',
      content: 'This is the first note',
      userId: 'user-1',
      tenantId: 'tenant-1',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z')
    },
    {
      _id: 'note-2',
      title: 'Second Note',
      content: 'This is the second note',
      userId: 'user-1',
      tenantId: 'tenant-1',
      createdAt: new Date('2024-01-02T10:00:00Z'),
      updatedAt: new Date('2024-01-02T10:00:00Z')
    }
  ];

  const newNote = {
    _id: 'note-3',
    title: 'New Note',
    content: 'This is a new note',
    userId: 'user-1',
    tenantId: 'tenant-1',
    createdAt: new Date('2024-01-03T10:00:00Z'),
    updatedAt: new Date('2024-01-03T10:00:00Z')
  };

  const updatedNote = {
    _id: 'note-1',
    title: 'Updated First Note',
    content: 'This is the updated first note',
    userId: 'user-1',
    tenantId: 'tenant-1',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-03T10:00:00Z')
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockInitializeDatabase.mockResolvedValue();
    mockCanManageNotes.mockReturnValue(true);
    mockGetTenantById.mockResolvedValue(testTenant);
    mockGetNoteCountByUser.mockResolvedValue(0); // Pro plan, no limit checks
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CREATE - POST /api/notes', () => {
    it('should create a new note successfully', async () => {
      mockRequireAuth.mockReturnValue({ auth: testUser });
      mockCreateNote.mockResolvedValue(newNote);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'New Note',
          content: 'This is a new note'
        })
      };

      const response = await createNote(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.note).toEqual(newNote);
      expect(mockCreateNote).toHaveBeenCalledWith({
        title: 'New Note',
        content: 'This is a new note',
        userId: testUser.userId,
        tenantId: testUser.tenantId
      });
    });

    it('should validate required fields when creating note', async () => {
      mockRequireAuth.mockReturnValue({ auth: testUser });

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'Note without content'
          // Missing content
        })
      };

      const response = await createNote(mockRequest);

      expect(response.status).toBe(400);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Title and content are required' },
        { status: 400 }
      );
      expect(mockCreateNote).not.toHaveBeenCalled();
    });

    it('should validate title is provided when creating note', async () => {
      mockRequireAuth.mockReturnValue({ auth: testUser });

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          content: 'Content without title'
          // Missing title
        })
      };

      const response = await createNote(mockRequest);

      expect(response.status).toBe(400);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Title and content are required' },
        { status: 400 }
      );
      expect(mockCreateNote).not.toHaveBeenCalled();
    });

    it('should handle empty title and content', async () => {
      mockRequireAuth.mockReturnValue({ auth: testUser });

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: '',
          content: ''
        })
      };

      const response = await createNote(mockRequest);

      expect(response.status).toBe(400);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Title and content are required' },
        { status: 400 }
      );
      expect(mockCreateNote).not.toHaveBeenCalled();
    });

    it('should require authentication to create note', async () => {
      mockRequireAuth.mockReturnValue({ 
        auth: null, 
        response: { status: 401, json: () => Promise.resolve({ error: 'Unauthorized' }) }
      });

      const mockRequest = {
        headers: new Map(),
        json: jest.fn().mockResolvedValue({
          title: 'New Note',
          content: 'This is a new note'
        })
      };

      const response = await createNote(mockRequest);

      expect(response.status).toBe(401);
      expect(mockCreateNote).not.toHaveBeenCalled();
    });

    it('should require proper permissions to create note', async () => {
      mockRequireAuth.mockReturnValue({ auth: testUser });
      mockCanManageNotes.mockReturnValue(false);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'New Note',
          content: 'This is a new note'
        })
      };

      const response = await createNote(mockRequest);

      expect(response.status).toBe(403);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Forbidden. Insufficient permissions.' },
        { status: 403 }
      );
      expect(mockCreateNote).not.toHaveBeenCalled();
    });

    it('should handle database errors during note creation', async () => {
      mockRequireAuth.mockReturnValue({ auth: testUser });
      mockCreateNote.mockRejectedValue(new Error('Database error'));

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'New Note',
          content: 'This is a new note'
        })
      };

      const response = await createNote(mockRequest);

      expect(response.status).toBe(500);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Internal server error' },
        { status: 500 }
      );
    });
  });

  describe('READ - GET /api/notes', () => {
    it('should retrieve all notes for authenticated user', async () => {
      mockRequireAuth.mockReturnValue({ auth: testUser });
      mockGetNotesByUserId.mockResolvedValue(mockNotes);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']])
      };

      const response = await getNotes(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.notes).toEqual(mockNotes);
      expect(mockGetNotesByUserId).toHaveBeenCalledWith(testUser.userId, testUser.tenantId);
    });

    it('should return empty array when user has no notes', async () => {
      mockRequireAuth.mockReturnValue({ auth: testUser });
      mockGetNotesByUserId.mockResolvedValue([]);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']])
      };

      const response = await getNotes(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.notes).toEqual([]);
      expect(mockGetNotesByUserId).toHaveBeenCalledWith(testUser.userId, testUser.tenantId);
    });

    it('should require authentication to retrieve notes', async () => {
      mockRequireAuth.mockReturnValue({ 
        auth: null, 
        response: { status: 401, json: () => Promise.resolve({ error: 'Unauthorized' }) }
      });

      const mockRequest = {
        headers: new Map()
      };

      const response = await getNotes(mockRequest);

      expect(response.status).toBe(401);
      expect(mockGetNotesByUserId).not.toHaveBeenCalled();
    });

    it('should require proper permissions to retrieve notes', async () => {
      mockRequireAuth.mockReturnValue({ auth: testUser });
      mockCanManageNotes.mockReturnValue(false);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']])
      };

      const response = await getNotes(mockRequest);

      expect(response.status).toBe(403);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Forbidden. Insufficient permissions.' },
        { status: 403 }
      );
      expect(mockGetNotesByUserId).not.toHaveBeenCalled();
    });

    it('should handle database errors during note retrieval', async () => {
      mockRequireAuth.mockReturnValue({ auth: testUser });
      mockGetNotesByUserId.mockRejectedValue(new Error('Database error'));

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']])
      };

      const response = await getNotes(mockRequest);

      expect(response.status).toBe(500);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Internal server error' },
        { status: 500 }
      );
    });
  });

  describe('READ - GET /api/notes/[id]', () => {
    it('should retrieve a specific note by ID', async () => {
      const targetNote = mockNotes[0];
      mockRequireAuth.mockReturnValue({ auth: testUser });
      mockGetNoteById.mockResolvedValue(targetNote);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']])
      };

      const response = await getNote(mockRequest, { params: { id: 'note-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.note).toEqual(targetNote);
      expect(mockGetNoteById).toHaveBeenCalledWith('note-1', testUser.tenantId, testUser.userId);
    });

    it('should return 404 when note is not found', async () => {
      mockRequireAuth.mockReturnValue({ auth: testUser });
      mockGetNoteById.mockResolvedValue(null);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']])
      };

      const response = await getNote(mockRequest, { params: { id: 'nonexistent-note' } });

      expect(response.status).toBe(404);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Note not found' },
        { status: 404 }
      );
      expect(mockGetNoteById).toHaveBeenCalledWith('nonexistent-note', testUser.tenantId, testUser.userId);
    });

    it('should require authentication to retrieve specific note', async () => {
      mockRequireAuth.mockReturnValue({ 
        auth: null, 
        response: { status: 401, json: () => Promise.resolve({ error: 'Unauthorized' }) }
      });

      const mockRequest = {
        headers: new Map()
      };

      const response = await getNote(mockRequest, { params: { id: 'note-1' } });

      expect(response.status).toBe(401);
      expect(mockGetNoteById).not.toHaveBeenCalled();
    });

    it('should require proper permissions to retrieve specific note', async () => {
      mockRequireAuth.mockReturnValue({ auth: testUser });
      mockCanManageNotes.mockReturnValue(false);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']])
      };

      const response = await getNote(mockRequest, { params: { id: 'note-1' } });

      expect(response.status).toBe(403);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Forbidden. Insufficient permissions.' },
        { status: 403 }
      );
      expect(mockGetNoteById).not.toHaveBeenCalled();
    });

    it('should handle database errors during specific note retrieval', async () => {
      mockRequireAuth.mockReturnValue({ auth: testUser });
      mockGetNoteById.mockRejectedValue(new Error('Database error'));

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']])
      };

      const response = await getNote(mockRequest, { params: { id: 'note-1' } });

      expect(response.status).toBe(500);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Internal server error' },
        { status: 500 }
      );
    });
  });

  describe('UPDATE - PUT /api/notes/[id]', () => {
    it('should update a note successfully', async () => {
      mockRequireAuth.mockReturnValue({ auth: testUser });
      mockUpdateNote.mockResolvedValue(updatedNote);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'Updated First Note',
          content: 'This is the updated first note'
        })
      };

      const response = await updateNote(mockRequest, { params: { id: 'note-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.note).toEqual(updatedNote);
      expect(mockUpdateNote).toHaveBeenCalledWith(
        'note-1',
        testUser.tenantId,
        { title: 'Updated First Note', content: 'This is the updated first note' },
        testUser.userId
      );
    });

    it('should validate required fields when updating note', async () => {
      mockRequireAuth.mockReturnValue({ auth: testUser });

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'Updated Note'
          // Missing content
        })
      };

      const response = await updateNote(mockRequest, { params: { id: 'note-1' } });

      expect(response.status).toBe(400);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Title and content are required' },
        { status: 400 }
      );
      expect(mockUpdateNote).not.toHaveBeenCalled();
    });

    it('should validate title is provided when updating note', async () => {
      mockRequireAuth.mockReturnValue({ auth: testUser });

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          content: 'Updated content'
          // Missing title
        })
      };

      const response = await updateNote(mockRequest, { params: { id: 'note-1' } });

      expect(response.status).toBe(400);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Title and content are required' },
        { status: 400 }
      );
      expect(mockUpdateNote).not.toHaveBeenCalled();
    });

    it('should return 404 when updating non-existent note', async () => {
      mockRequireAuth.mockReturnValue({ auth: testUser });
      mockUpdateNote.mockResolvedValue(null);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'Updated Note',
          content: 'Updated content'
        })
      };

      const response = await updateNote(mockRequest, { params: { id: 'nonexistent-note' } });

      expect(response.status).toBe(404);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Note not found' },
        { status: 404 }
      );
      expect(mockUpdateNote).toHaveBeenCalledWith(
        'nonexistent-note',
        testUser.tenantId,
        { title: 'Updated Note', content: 'Updated content' },
        testUser.userId
      );
    });

    it('should require authentication to update note', async () => {
      mockRequireAuth.mockReturnValue({ 
        auth: null, 
        response: { status: 401, json: () => Promise.resolve({ error: 'Unauthorized' }) }
      });

      const mockRequest = {
        headers: new Map(),
        json: jest.fn().mockResolvedValue({
          title: 'Updated Note',
          content: 'Updated content'
        })
      };

      const response = await updateNote(mockRequest, { params: { id: 'note-1' } });

      expect(response.status).toBe(401);
      expect(mockUpdateNote).not.toHaveBeenCalled();
    });

    it('should require proper permissions to update note', async () => {
      mockRequireAuth.mockReturnValue({ auth: testUser });
      mockCanManageNotes.mockReturnValue(false);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'Updated Note',
          content: 'Updated content'
        })
      };

      const response = await updateNote(mockRequest, { params: { id: 'note-1' } });

      expect(response.status).toBe(403);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Forbidden. Insufficient permissions.' },
        { status: 403 }
      );
      expect(mockUpdateNote).not.toHaveBeenCalled();
    });

    it('should handle database errors during note update', async () => {
      mockRequireAuth.mockReturnValue({ auth: testUser });
      mockUpdateNote.mockRejectedValue(new Error('Database error'));

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'Updated Note',
          content: 'Updated content'
        })
      };

      const response = await updateNote(mockRequest, { params: { id: 'note-1' } });

      expect(response.status).toBe(500);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Internal server error' },
        { status: 500 }
      );
    });
  });

  describe('DELETE - DELETE /api/notes/[id]', () => {
    it('should delete a note successfully', async () => {
      mockRequireAuth.mockReturnValue({ auth: testUser });
      mockDeleteNote.mockResolvedValue(true);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']])
      };

      const response = await deleteNote(mockRequest, { params: { id: 'note-1' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.message).toBe('Note deleted successfully');
      expect(mockDeleteNote).toHaveBeenCalledWith('note-1', testUser.tenantId, testUser.userId);
    });

    it('should return 404 when deleting non-existent note', async () => {
      mockRequireAuth.mockReturnValue({ auth: testUser });
      mockDeleteNote.mockResolvedValue(false);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']])
      };

      const response = await deleteNote(mockRequest, { params: { id: 'nonexistent-note' } });

      expect(response.status).toBe(404);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Note not found' },
        { status: 404 }
      );
      expect(mockDeleteNote).toHaveBeenCalledWith('nonexistent-note', testUser.tenantId, testUser.userId);
    });

    it('should require authentication to delete note', async () => {
      mockRequireAuth.mockReturnValue({ 
        auth: null, 
        response: { status: 401, json: () => Promise.resolve({ error: 'Unauthorized' }) }
      });

      const mockRequest = {
        headers: new Map()
      };

      const response = await deleteNote(mockRequest, { params: { id: 'note-1' } });

      expect(response.status).toBe(401);
      expect(mockDeleteNote).not.toHaveBeenCalled();
    });

    it('should require proper permissions to delete note', async () => {
      mockRequireAuth.mockReturnValue({ auth: testUser });
      mockCanManageNotes.mockReturnValue(false);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']])
      };

      const response = await deleteNote(mockRequest, { params: { id: 'note-1' } });

      expect(response.status).toBe(403);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Forbidden. Insufficient permissions.' },
        { status: 403 }
      );
      expect(mockDeleteNote).not.toHaveBeenCalled();
    });

    it('should handle database errors during note deletion', async () => {
      mockRequireAuth.mockReturnValue({ auth: testUser });
      mockDeleteNote.mockRejectedValue(new Error('Database error'));

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']])
      };

      const response = await deleteNote(mockRequest, { params: { id: 'note-1' } });

      expect(response.status).toBe(500);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Internal server error' },
        { status: 500 }
      );
    });
  });

  describe('CRUD Integration Tests', () => {
    it('should perform complete CRUD cycle successfully', async () => {
      // CREATE
      mockRequireAuth.mockReturnValue({ auth: testUser });
      mockCreateNote.mockResolvedValue(newNote);

      const createRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'New Note',
          content: 'This is a new note'
        })
      };

      const createResponse = await createNote(createRequest);
      expect(createResponse.status).toBe(201);

      // READ - Get all notes
      mockGetNotesByUserId.mockResolvedValue([...mockNotes, newNote]);
      const getRequest = {
        headers: new Map([['authorization', 'Bearer token']])
      };

      const getResponse = await getNotes(getRequest);
      const getData = await getResponse.json();
      expect(getResponse.status).toBe(200);
      expect(getData.notes).toHaveLength(3);

      // READ - Get specific note
      mockGetNoteById.mockResolvedValue(newNote);
      const getByIdResponse = await getNote(getRequest, { params: { id: 'note-3' } });
      const getByIdData = await getByIdResponse.json();
      expect(getByIdResponse.status).toBe(200);
      expect(getByIdData.note).toEqual(newNote);

      // UPDATE
      mockUpdateNote.mockResolvedValue(updatedNote);
      const updateRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'Updated Note',
          content: 'Updated content'
        })
      };

      const updateResponse = await updateNote(updateRequest, { params: { id: 'note-1' } });
      expect(updateResponse.status).toBe(200);

      // DELETE
      mockDeleteNote.mockResolvedValue(true);
      const deleteResponse = await deleteNote(getRequest, { params: { id: 'note-1' } });
      expect(deleteResponse.status).toBe(200);
    });

    it('should handle malformed JSON in request body', async () => {
      mockRequireAuth.mockReturnValue({ auth: testUser });

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      };

      const response = await createNote(mockRequest);

      expect(response.status).toBe(500);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Internal server error' },
        { status: 500 }
      );
    });

    it('should validate all CRUD operations require proper tenant context', async () => {
      // All operations should include tenantId in database calls
      mockRequireAuth.mockReturnValue({ auth: testUser });
      mockGetNotesByUserId.mockResolvedValue(mockNotes);
      mockCreateNote.mockResolvedValue(newNote);
      mockGetNoteById.mockResolvedValue(mockNotes[0]);
      mockUpdateNote.mockResolvedValue(updatedNote);
      mockDeleteNote.mockResolvedValue(true);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'Test Note',
          content: 'Test content'
        })
      };

      // Test all operations include tenantId
      await getNotes(mockRequest);
      expect(mockGetNotesByUserId).toHaveBeenCalledWith(testUser.userId, testUser.tenantId);

      await createNote(mockRequest);
      expect(mockCreateNote).toHaveBeenCalledWith({
        title: 'Test Note',
        content: 'Test content',
        userId: testUser.userId,
        tenantId: testUser.tenantId
      });

      await getNote(mockRequest, { params: { id: 'note-1' } });
      expect(mockGetNoteById).toHaveBeenCalledWith('note-1', testUser.tenantId, testUser.userId);

      await updateNote(mockRequest, { params: { id: 'note-1' } });
      expect(mockUpdateNote).toHaveBeenCalledWith(
        'note-1',
        testUser.tenantId,
        { title: 'Test Note', content: 'Test content' },
        testUser.userId
      );

      await deleteNote(mockRequest, { params: { id: 'note-1' } });
      expect(mockDeleteNote).toHaveBeenCalledWith('note-1', testUser.tenantId, testUser.userId);
    });
  });
});
