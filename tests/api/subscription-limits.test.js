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
const mockCreateNote = jest.fn();
const mockGetTenantById = jest.fn();
const mockGetNoteCountByUser = jest.fn();
const mockUpgradeTenant = jest.fn();
const mockInitializeDatabase = jest.fn();

jest.mock('../../src/lib/db', () => ({
  getNotesByUserId: mockGetNotesByUserId,
  createNote: mockCreateNote,
  getTenantById: mockGetTenantById,
  getNoteCountByUser: mockGetNoteCountByUser,
  upgradeTenant: mockUpgradeTenant,
  initializeDatabase: mockInitializeDatabase
}));

// Mock RBAC functions
const mockRequireAuth = jest.fn();
const mockCanManageNotes = jest.fn();
const mockCanUpgradeSubscription = jest.fn();

jest.mock('../../src/lib/rbac', () => ({
  requireAuth: mockRequireAuth,
  canManageNotes: mockCanManageNotes,
  canUpgradeSubscription: mockCanUpgradeSubscription
}));

// Import route handlers
const { GET: getNotes, POST: createNote } = require('../../src/app/api/notes/route');
const { POST: upgradeTenant } = require('../../src/app/api/tenants/[slug]/upgrade/route');

describe('Subscription Limits Tests', () => {
  // Test users
  const freePlanUser = {
    userId: 'user-1',
    email: 'user@acme.test',
    role: 'member',
    tenantId: 'tenant-1',
    tenantSlug: 'acme'
  };

  const freePlanAdmin = {
    userId: 'admin-1',
    email: 'admin@acme.test',
    role: 'admin',
    tenantId: 'tenant-1',
    tenantSlug: 'acme'
  };

  const proPlanUser = {
    userId: 'user-2',
    email: 'user@globex.test',
    role: 'member',
    tenantId: 'tenant-2',
    tenantSlug: 'globex'
  };

  // Test tenants
  const freePlanTenant = {
    _id: 'tenant-1',
    name: 'Acme',
    slug: 'acme',
    plan: 'free',
    noteLimit: 3
  };

  const proPlanTenant = {
    _id: 'tenant-2',
    name: 'Globex',
    slug: 'globex',
    plan: 'pro',
    noteLimit: -1 // Unlimited
  };

  const upgradedTenant = {
    _id: 'tenant-1',
    name: 'Acme',
    slug: 'acme',
    plan: 'pro',
    noteLimit: -1 // Unlimited after upgrade
  };

  // Mock notes
  const existingNotes = [
    {
      _id: 'note-1',
      title: 'Note 1',
      content: 'Content 1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      createdAt: new Date()
    },
    {
      _id: 'note-2',
      title: 'Note 2',
      content: 'Content 2',
      userId: 'user-1',
      tenantId: 'tenant-1',
      createdAt: new Date()
    },
    {
      _id: 'note-3',
      title: 'Note 3',
      content: 'Content 3',
      userId: 'user-1',
      tenantId: 'tenant-1',
      createdAt: new Date()
    }
  ];

  const newNote = {
    _id: 'note-4',
    title: 'New Note',
    content: 'New content',
    userId: 'user-1',
    tenantId: 'tenant-1',
    createdAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockInitializeDatabase.mockResolvedValue();
    mockCanManageNotes.mockReturnValue(true);
    mockCanUpgradeSubscription.mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Free Plan - Note Limit Enforcement', () => {
    it('should allow creating notes within the 3-note limit', async () => {
      mockRequireAuth.mockReturnValue({ auth: freePlanUser });
      mockGetTenantById.mockResolvedValue(freePlanTenant);
      mockGetNoteCountByUser.mockResolvedValue(2); // 2 notes, under limit of 3
      mockCreateNote.mockResolvedValue(newNote);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'New Note',
          content: 'New content'
        })
      };

      const response = await createNote(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.note).toEqual(newNote);
      expect(mockCreateNote).toHaveBeenCalledWith({
        title: 'New Note',
        content: 'New content',
        userId: freePlanUser.userId,
        tenantId: freePlanUser.tenantId
      });
    });

    it('should block creating the 4th note (limit reached)', async () => {
      mockRequireAuth.mockReturnValue({ auth: freePlanUser });
      mockGetTenantById.mockResolvedValue(freePlanTenant);
      mockGetNoteCountByUser.mockResolvedValue(3); // At the limit of 3

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'Fourth Note',
          content: 'This should be blocked'
        })
      };

      const response = await createNote(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.error).toBe('Note limit reached. Upgrade to Pro for unlimited notes.');
      expect(responseData.limitReached).toBe(true);
      expect(mockCreateNote).not.toHaveBeenCalled();
    });

    it('should block creating notes when already at limit', async () => {
      mockRequireAuth.mockReturnValue({ auth: freePlanUser });
      mockGetTenantById.mockResolvedValue(freePlanTenant);
      mockGetNoteCountByUser.mockResolvedValue(3); // At the limit

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'Another Note',
          content: 'This should be blocked'
        })
      };

      const response = await createNote(mockRequest);

      expect(response.status).toBe(403);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        {
          error: 'Note limit reached. Upgrade to Pro for unlimited notes.',
          limitReached: true
        },
        { status: 403 }
      );
    });

    it('should enforce per-user note limits in Free plan', async () => {
      // Test that each user has their own 3-note limit
      mockRequireAuth.mockReturnValue({ auth: freePlanUser });
      mockGetTenantById.mockResolvedValue(freePlanTenant);
      mockGetNoteCountByUser.mockResolvedValue(3); // This user is at limit

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'User Note',
          content: 'This should be blocked for this user'
        })
      };

      const response = await createNote(mockRequest);

      expect(response.status).toBe(403);
      expect(mockGetNoteCountByUser).toHaveBeenCalledWith(freePlanUser.userId, freePlanUser.tenantId);
    });

    it('should allow creating notes after deleting some (under limit)', async () => {
      // User deletes a note, now has 2 notes, can create another
      mockRequireAuth.mockReturnValue({ auth: freePlanUser });
      mockGetTenantById.mockResolvedValue(freePlanTenant);
      mockGetNoteCountByUser.mockResolvedValue(2); // Under limit after deletion
      mockCreateNote.mockResolvedValue(newNote);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'New Note After Deletion',
          content: 'This should be allowed'
        })
      };

      const response = await createNote(mockRequest);

      expect(response.status).toBe(201);
      expect(mockCreateNote).toHaveBeenCalled();
    });
  });

  describe('Pro Plan - Unlimited Access', () => {
    it('should allow unlimited note creation in Pro plan', async () => {
      mockRequireAuth.mockReturnValue({ auth: proPlanUser });
      mockGetTenantById.mockResolvedValue(proPlanTenant);
      mockCreateNote.mockResolvedValue(newNote);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'Pro Plan Note',
          content: 'This should be allowed'
        })
      };

      const response = await createNote(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.note).toEqual(newNote);
      expect(mockCreateNote).toHaveBeenCalledWith({
        title: 'Pro Plan Note',
        content: 'This should be allowed',
        userId: proPlanUser.userId,
        tenantId: proPlanUser.tenantId
      });
      // Should not check note count for Pro plan
      expect(mockGetNoteCountByUser).not.toHaveBeenCalled();
    });

    it('should allow creating many notes in Pro plan', async () => {
      mockRequireAuth.mockReturnValue({ auth: proPlanUser });
      mockGetTenantById.mockResolvedValue(proPlanTenant);
      mockCreateNote.mockResolvedValue(newNote);

      // Simulate creating 10 notes (would be blocked in Free plan)
      for (let i = 0; i < 10; i++) {
        const mockRequest = {
          headers: new Map([['authorization', 'Bearer token']]),
          json: jest.fn().mockResolvedValue({
            title: `Pro Note ${i + 1}`,
            content: `Content ${i + 1}`
          })
        };

        const response = await createNote(mockRequest);
        expect(response.status).toBe(201);
      }

      // Should not check note count for Pro plan
      expect(mockGetNoteCountByUser).not.toHaveBeenCalled();
    });
  });

  describe('Upgrade Process - Limit Removal', () => {
    it('should allow admin to upgrade tenant from Free to Pro', async () => {
      mockRequireAuth.mockReturnValue({ auth: freePlanAdmin });
      mockUpgradeTenant.mockResolvedValue(upgradedTenant);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer admin-token']])
      };

      const response = await upgradeTenant(mockRequest, { params: { slug: 'acme' } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.message).toBe('Tenant upgraded to Pro successfully');
      expect(responseData.tenant.plan).toBe('pro');
      expect(responseData.tenant.noteLimit).toBe(-1); // Unlimited
      expect(mockUpgradeTenant).toHaveBeenCalledWith('acme');
    });

    it('should remove note limits after upgrade', async () => {
      // Clear all mocks to ensure clean state
      jest.clearAllMocks();
      mockInitializeDatabase.mockResolvedValue();
      mockCanManageNotes.mockReturnValue(true);
      mockCanUpgradeSubscription.mockReturnValue(true);

      // First, verify Free plan limits
      mockRequireAuth.mockReturnValue({ auth: freePlanUser });
      mockGetTenantById.mockResolvedValue(freePlanTenant);
      mockGetNoteCountByUser.mockResolvedValue(3); // At limit

      const freePlanRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'Blocked Note',
          content: 'This should be blocked in Free plan'
        })
      };

      const freePlanResponse = await createNote(freePlanRequest);
      expect(freePlanResponse.status).toBe(403);

      // Clear the note count mock for the next part
      mockGetNoteCountByUser.mockClear();

      // Now upgrade to Pro
      mockRequireAuth.mockReturnValue({ auth: freePlanAdmin });
      mockUpgradeTenant.mockResolvedValue(upgradedTenant);

      const upgradeRequest = {
        headers: new Map([['authorization', 'Bearer admin-token']])
      };

      const upgradeResponse = await upgradeTenant(upgradeRequest, { params: { slug: 'acme' } });
      expect(upgradeResponse.status).toBe(200);

      // Now verify Pro plan allows unlimited notes
      mockRequireAuth.mockReturnValue({ auth: freePlanUser });
      mockGetTenantById.mockResolvedValue(upgradedTenant);
      mockCreateNote.mockResolvedValue(newNote);

      const proPlanRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'Unlimited Note',
          content: 'This should be allowed in Pro plan'
        })
      };

      const proPlanResponse = await createNote(proPlanRequest);
      expect(proPlanResponse.status).toBe(201);
      expect(mockGetNoteCountByUser).not.toHaveBeenCalled(); // No limit check in Pro
    });

    it('should allow creating notes immediately after upgrade', async () => {
      // Simulate the upgrade process
      mockRequireAuth.mockReturnValue({ auth: freePlanAdmin });
      mockUpgradeTenant.mockResolvedValue(upgradedTenant);

      const upgradeRequest = {
        headers: new Map([['authorization', 'Bearer admin-token']])
      };

      await upgradeTenant(upgradeRequest, { params: { slug: 'acme' } });

      // Immediately try to create a note with the upgraded tenant
      mockRequireAuth.mockReturnValue({ auth: freePlanUser });
      mockGetTenantById.mockResolvedValue(upgradedTenant);
      mockCreateNote.mockResolvedValue(newNote);

      const createRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'Post-Upgrade Note',
          content: 'Created immediately after upgrade'
        })
      };

      const response = await createNote(createRequest);
      expect(response.status).toBe(201);
      expect(mockGetNoteCountByUser).not.toHaveBeenCalled();
    });
  });

  describe('Subscription Limit Edge Cases', () => {
    it('should handle tenant not found gracefully', async () => {
      mockRequireAuth.mockReturnValue({ auth: freePlanUser });
      mockGetTenantById.mockResolvedValue(null); // Tenant not found

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'Test Note',
          content: 'Test content'
        })
      };

      const response = await createNote(mockRequest);

      expect(response.status).toBe(500);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Tenant not found' },
        { status: 500 }
      );
      expect(mockCreateNote).not.toHaveBeenCalled();
    });

    it('should handle database errors during note count check', async () => {
      mockRequireAuth.mockReturnValue({ auth: freePlanUser });
      mockGetTenantById.mockResolvedValue(freePlanTenant);
      mockGetNoteCountByUser.mockRejectedValue(new Error('Database error'));

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'Test Note',
          content: 'Test content'
        })
      };

      const response = await createNote(mockRequest);

      expect(response.status).toBe(500);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Internal server error' },
        { status: 500 }
      );
    });

    it('should validate note limit configuration', async () => {
      const customLimitTenant = {
        _id: 'tenant-3',
        name: 'Custom',
        slug: 'custom',
        plan: 'free',
        noteLimit: 5 // Custom limit
      };

      mockRequireAuth.mockReturnValue({ auth: freePlanUser });
      mockGetTenantById.mockResolvedValue(customLimitTenant);
      mockGetNoteCountByUser.mockResolvedValue(5); // At custom limit
      mockCreateNote.mockResolvedValue(newNote);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'Custom Limit Note',
          content: 'Testing custom limit'
        })
      };

      const response = await createNote(mockRequest);

      expect(response.status).toBe(403);
      expect(mockGetNoteCountByUser).toHaveBeenCalledWith(freePlanUser.userId, freePlanUser.tenantId);
    });
  });

  describe('Plan Comparison Tests', () => {
    it('should demonstrate Free vs Pro plan differences', async () => {
      // Test Free plan limitation
      mockRequireAuth.mockReturnValue({ auth: freePlanUser });
      mockGetTenantById.mockResolvedValue(freePlanTenant);
      mockGetNoteCountByUser.mockResolvedValue(3);

      const freePlanRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'Free Plan Note',
          content: 'Should be blocked'
        })
      };

      const freeResponse = await createNote(freePlanRequest);
      expect(freeResponse.status).toBe(403);

      // Test Pro plan unlimited access
      mockRequireAuth.mockReturnValue({ auth: proPlanUser });
      mockGetTenantById.mockResolvedValue(proPlanTenant);
      mockCreateNote.mockResolvedValue(newNote);

      const proPlanRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'Pro Plan Note',
          content: 'Should be allowed'
        })
      };

      const proResponse = await createNote(proPlanRequest);
      expect(proResponse.status).toBe(201);
    });

    it('should verify upgrade removes all limitations', async () => {
      // Clear all mocks to ensure clean state
      jest.clearAllMocks();
      mockInitializeDatabase.mockResolvedValue();
      mockCanManageNotes.mockReturnValue(true);
      mockCanUpgradeSubscription.mockReturnValue(true);

      // Create a scenario where Free plan user is at limit
      mockRequireAuth.mockReturnValue({ auth: freePlanUser });
      mockGetTenantById.mockResolvedValue(freePlanTenant);
      mockGetNoteCountByUser.mockResolvedValue(3);

      const atLimitRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'At Limit Note',
          content: 'Should be blocked'
        })
      };

      const atLimitResponse = await createNote(atLimitRequest);
      expect(atLimitResponse.status).toBe(403);

      // Clear the note count mock for the next part
      mockGetNoteCountByUser.mockClear();

      // Upgrade to Pro
      mockRequireAuth.mockReturnValue({ auth: freePlanAdmin });
      mockUpgradeTenant.mockResolvedValue(upgradedTenant);

      const upgradeRequest = {
        headers: new Map([['authorization', 'Bearer admin-token']])
      };

      await upgradeTenant(upgradeRequest, { params: { slug: 'acme' } });

      // Now same user can create unlimited notes
      mockRequireAuth.mockReturnValue({ auth: freePlanUser });
      mockGetTenantById.mockResolvedValue(upgradedTenant);
      mockCreateNote.mockResolvedValue(newNote);

      const unlimitedRequest = {
        headers: new Map([['authorization', 'Bearer token']]),
        json: jest.fn().mockResolvedValue({
          title: 'Unlimited Note',
          content: 'Now allowed after upgrade'
        })
      };

      const unlimitedResponse = await createNote(unlimitedRequest);
      expect(unlimitedResponse.status).toBe(201);
      expect(mockGetNoteCountByUser).not.toHaveBeenCalled();
    });
  });
});
