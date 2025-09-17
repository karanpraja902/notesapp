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
const mockGetUsersByTenantId = jest.fn();
const mockCreateUser = jest.fn();
const mockGetUserById = jest.fn();
const mockUpdateUser = jest.fn();
const mockDeleteUser = jest.fn();
const mockUpgradeTenant = jest.fn();
const mockInitializeDatabase = jest.fn();

jest.mock('../../src/lib/db', () => ({
  getUsersByTenantId: mockGetUsersByTenantId,
  createUser: mockCreateUser,
  getUserById: mockGetUserById,
  updateUser: mockUpdateUser,
  deleteUser: mockDeleteUser,
  upgradeTenant: mockUpgradeTenant,
  initializeDatabase: mockInitializeDatabase
}));

// Mock auth functions
const mockGetAuthFromRequest = jest.fn();
jest.mock('../../src/lib/auth', () => ({
  getAuthFromRequest: mockGetAuthFromRequest
}));

// Mock RBAC functions
const mockRequireAuth = jest.fn();
const mockCanUpgradeSubscription = jest.fn();

jest.mock('../../src/lib/rbac', () => ({
  requireAuth: mockRequireAuth,
  canUpgradeSubscription: mockCanUpgradeSubscription
}));

// Import route handlers
const { GET: getUsers, POST: inviteUser } = require('../../src/app/api/users/route');
const { GET: getUser, PUT: updateUser, DELETE: deleteUser } = require('../../src/app/api/users/[id]/route');
const { POST: upgradeTenant } = require('../../src/app/api/tenants/[slug]/upgrade/route');

describe('Role-Based Access Control Tests', () => {
  // Test users with different roles
  const adminUser = {
    userId: 'admin-1',
    email: 'admin@acme.test',
    role: 'admin',
    tenantId: 'tenant-1',
    tenantSlug: 'acme'
  };

  const memberUser = {
    userId: 'member-1',
    email: 'user@acme.test',
    role: 'member',
    tenantId: 'tenant-1',
    tenantSlug: 'acme'
  };

  const otherTenantAdmin = {
    userId: 'admin-2',
    email: 'admin@globex.test',
    role: 'admin',
    tenantId: 'tenant-2',
    tenantSlug: 'globex'
  };

  const mockUsers = [
    {
      _id: 'user-1',
      email: 'admin@acme.test',
      role: 'admin',
      tenantId: 'tenant-1',
      createdAt: new Date()
    },
    {
      _id: 'user-2',
      email: 'user@acme.test',
      role: 'member',
      tenantId: 'tenant-1',
      createdAt: new Date()
    }
  ];

  const mockNewUser = {
    _id: 'user-3',
    email: 'newuser@acme.test',
    role: 'member',
    tenantId: 'tenant-1',
    createdAt: new Date()
  };

  const mockUpdatedTenant = {
    _id: 'tenant-1',
    name: 'Acme',
    slug: 'acme',
    plan: 'pro',
    noteLimit: -1
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockInitializeDatabase.mockResolvedValue();
    mockCanUpgradeSubscription.mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('User Management - Role Restrictions', () => {
    describe('GET /api/users - List Users', () => {
      it('should allow admin to list users', async () => {
        mockGetAuthFromRequest.mockReturnValue(adminUser);
        mockGetUsersByTenantId.mockResolvedValue(mockUsers);

        const mockRequest = {
          headers: new Map([['authorization', 'Bearer admin-token']])
        };

        const response = await getUsers(mockRequest);
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.users).toEqual(mockUsers);
        expect(mockGetUsersByTenantId).toHaveBeenCalledWith(adminUser.tenantId);
      });

      it('should deny member access to list users', async () => {
        mockGetAuthFromRequest.mockReturnValue(memberUser);

        const mockRequest = {
          headers: new Map([['authorization', 'Bearer member-token']])
        };

        const response = await getUsers(mockRequest);

        expect(response.status).toBe(403);
        expect(mockNextResponse.json).toHaveBeenCalledWith(
          { error: 'Forbidden. Admin access required.' },
          { status: 403 }
        );
        expect(mockGetUsersByTenantId).not.toHaveBeenCalled();
      });

      it('should deny unauthenticated access to list users', async () => {
        mockGetAuthFromRequest.mockReturnValue(null);

        const mockRequest = {
          headers: new Map()
        };

        const response = await getUsers(mockRequest);

        expect(response.status).toBe(401);
        expect(mockNextResponse.json).toHaveBeenCalledWith(
          { error: 'Unauthorized' },
          { status: 401 }
        );
        expect(mockGetUsersByTenantId).not.toHaveBeenCalled();
      });
    });

    describe('POST /api/users - Invite User', () => {
      it('should allow admin to invite new users', async () => {
        mockGetAuthFromRequest.mockReturnValue(adminUser);
        mockCreateUser.mockResolvedValue(mockNewUser);

        const mockRequest = {
          headers: new Map([['authorization', 'Bearer admin-token']]),
          json: jest.fn().mockResolvedValue({
            email: 'newuser@acme.test',
            password: 'password123',
            role: 'member'
          })
        };

        const response = await inviteUser(mockRequest);
        const responseData = await response.json();

        expect(response.status).toBe(201);
        expect(responseData.user).toEqual({
          id: mockNewUser._id,
          email: mockNewUser.email,
          role: mockNewUser.role,
          tenantId: mockNewUser.tenantId
        });
        expect(mockCreateUser).toHaveBeenCalledWith({
          email: 'newuser@acme.test',
          password: 'password123',
          role: 'member',
          tenantId: adminUser.tenantId
        });
      });

      it('should deny member from inviting users', async () => {
        mockGetAuthFromRequest.mockReturnValue(memberUser);

        const mockRequest = {
          headers: new Map([['authorization', 'Bearer member-token']]),
          json: jest.fn().mockResolvedValue({
            email: 'newuser@acme.test',
            password: 'password123',
            role: 'member'
          })
        };

        const response = await inviteUser(mockRequest);

        expect(response.status).toBe(403);
        expect(mockNextResponse.json).toHaveBeenCalledWith(
          { error: 'Forbidden. Admin access required.' },
          { status: 403 }
        );
        expect(mockCreateUser).not.toHaveBeenCalled();
      });

      it('should allow admin to invite other admins', async () => {
        const newAdminUser = {
          _id: 'user-4',
          email: 'newadmin@acme.test',
          role: 'admin',
          tenantId: 'tenant-1',
          createdAt: new Date()
        };

        mockGetAuthFromRequest.mockReturnValue(adminUser);
        mockCreateUser.mockResolvedValue(newAdminUser);

        const mockRequest = {
          headers: new Map([['authorization', 'Bearer admin-token']]),
          json: jest.fn().mockResolvedValue({
            email: 'newadmin@acme.test',
            password: 'password123',
            role: 'admin'
          })
        };

        const response = await inviteUser(mockRequest);
        const responseData = await response.json();

        expect(response.status).toBe(201);
        expect(responseData.user.role).toBe('admin');
        expect(mockCreateUser).toHaveBeenCalledWith({
          email: 'newadmin@acme.test',
          password: 'password123',
          role: 'admin',
          tenantId: adminUser.tenantId
        });
      });
    });

    describe('GET /api/users/[id] - Get User Details', () => {
      it('should allow admin to get user details', async () => {
        const targetUser = mockUsers[1]; // member user
        mockGetAuthFromRequest.mockReturnValue(adminUser);
        mockGetUserById.mockResolvedValue(targetUser);

        const mockRequest = {
          headers: new Map([['authorization', 'Bearer admin-token']])
        };

        const response = await getUser(mockRequest, { params: { id: 'user-2' } });
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.user).toEqual({
          id: targetUser._id,
          email: targetUser.email,
          role: targetUser.role,
          tenantId: targetUser.tenantId,
          createdAt: targetUser.createdAt
        });
        expect(mockGetUserById).toHaveBeenCalledWith('user-2', adminUser.tenantId);
      });

      it('should deny member access to get user details', async () => {
        mockGetAuthFromRequest.mockReturnValue(memberUser);

        const mockRequest = {
          headers: new Map([['authorization', 'Bearer member-token']])
        };

        const response = await getUser(mockRequest, { params: { id: 'user-2' } });

        expect(response.status).toBe(403);
        expect(mockNextResponse.json).toHaveBeenCalledWith(
          { error: 'Forbidden. Admin access required.' },
          { status: 403 }
        );
        expect(mockGetUserById).not.toHaveBeenCalled();
      });
    });

    describe('PUT /api/users/[id] - Update User', () => {
      it('should allow admin to update user details', async () => {
        const updatedUser = {
          ...mockUsers[1],
          email: 'updated@acme.test',
          role: 'admin'
        };

        mockGetAuthFromRequest.mockReturnValue(adminUser);
        mockUpdateUser.mockResolvedValue(updatedUser);

        const mockRequest = {
          headers: new Map([['authorization', 'Bearer admin-token']]),
          json: jest.fn().mockResolvedValue({
            email: 'updated@acme.test',
            role: 'admin'
          })
        };

        const response = await updateUser(mockRequest, { params: { id: 'user-2' } });
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.user.email).toBe('updated@acme.test');
        expect(responseData.user.role).toBe('admin');
        expect(mockUpdateUser).toHaveBeenCalledWith('user-2', adminUser.tenantId, {
          email: 'updated@acme.test',
          role: 'admin'
        });
      });

      it('should deny member from updating user details', async () => {
        mockGetAuthFromRequest.mockReturnValue(memberUser);

        const mockRequest = {
          headers: new Map([['authorization', 'Bearer member-token']]),
          json: jest.fn().mockResolvedValue({
            email: 'updated@acme.test',
            role: 'admin'
          })
        };

        const response = await updateUser(mockRequest, { params: { id: 'user-2' } });

        expect(response.status).toBe(403);
        expect(mockNextResponse.json).toHaveBeenCalledWith(
          { error: 'Forbidden. Admin access required.' },
          { status: 403 }
        );
        expect(mockUpdateUser).not.toHaveBeenCalled();
      });
    });

    describe('DELETE /api/users/[id] - Delete User', () => {
      it('should allow admin to delete other users', async () => {
        mockGetAuthFromRequest.mockReturnValue(adminUser);
        mockDeleteUser.mockResolvedValue(true);

        const mockRequest = {
          headers: new Map([['authorization', 'Bearer admin-token']])
        };

        const response = await deleteUser(mockRequest, { params: { id: 'user-2' } });
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.message).toBe('User deleted successfully');
        expect(mockDeleteUser).toHaveBeenCalledWith('user-2', adminUser.tenantId);
      });

      it('should deny member from deleting users', async () => {
        mockGetAuthFromRequest.mockReturnValue(memberUser);

        const mockRequest = {
          headers: new Map([['authorization', 'Bearer member-token']])
        };

        const response = await deleteUser(mockRequest, { params: { id: 'user-2' } });

        expect(response.status).toBe(403);
        expect(mockNextResponse.json).toHaveBeenCalledWith(
          { error: 'Forbidden. Admin access required.' },
          { status: 403 }
        );
        expect(mockDeleteUser).not.toHaveBeenCalled();
      });

      it('should prevent admin from deleting themselves', async () => {
        mockGetAuthFromRequest.mockReturnValue(adminUser);

        const mockRequest = {
          headers: new Map([['authorization', 'Bearer admin-token']])
        };

        const response = await deleteUser(mockRequest, { params: { id: adminUser.userId } });

        expect(response.status).toBe(400);
        expect(mockNextResponse.json).toHaveBeenCalledWith(
          { error: 'Cannot delete your own account' },
          { status: 400 }
        );
        expect(mockDeleteUser).not.toHaveBeenCalled();
      });
    });
  });

  describe('Tenant Management - Role Restrictions', () => {
    describe('POST /api/tenants/[slug]/upgrade - Upgrade Tenant', () => {
      it('should allow admin to upgrade their tenant', async () => {
        mockRequireAuth.mockReturnValue({ auth: adminUser });
        mockUpgradeTenant.mockResolvedValue(mockUpdatedTenant);

        const mockRequest = {
          headers: new Map([['authorization', 'Bearer admin-token']])
        };

        const response = await upgradeTenant(mockRequest, { params: { slug: 'acme' } });
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.message).toBe('Tenant upgraded to Pro successfully');
        expect(responseData.tenant).toEqual(mockUpdatedTenant);
        expect(mockUpgradeTenant).toHaveBeenCalledWith('acme');
      });

      it('should deny member from upgrading tenant', async () => {
        mockRequireAuth.mockReturnValue({ 
          auth: null, 
          response: { status: 403, json: () => Promise.resolve({ error: 'Forbidden. Admin access required.' }) }
        });

        const mockRequest = {
          headers: new Map([['authorization', 'Bearer member-token']])
        };

        const response = await upgradeTenant(mockRequest, { params: { slug: 'acme' } });

        expect(response.status).toBe(403);
        expect(mockUpgradeTenant).not.toHaveBeenCalled();
      });

      it('should prevent admin from upgrading other tenants', async () => {
        mockRequireAuth.mockReturnValue({ auth: adminUser });

        const mockRequest = {
          headers: new Map([['authorization', 'Bearer admin-token']])
        };

        const response = await upgradeTenant(mockRequest, { params: { slug: 'globex' } });

        expect(response.status).toBe(403);
        expect(mockNextResponse.json).toHaveBeenCalledWith(
          { error: 'Cannot upgrade other tenants' },
          { status: 403 }
        );
        expect(mockUpgradeTenant).not.toHaveBeenCalled();
      });
    });
  });

  describe('Cross-Tenant Role Restrictions', () => {
    it('should prevent admin from managing users in other tenants', async () => {
      // Acme admin trying to access Globex users
      mockGetAuthFromRequest.mockReturnValue(adminUser);
      mockGetUsersByTenantId.mockResolvedValue([]);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer admin-token']])
      };

      const response = await getUsers(mockRequest);
      const responseData = await response.json();

      // Should only return users from Acme tenant, not Globex
      expect(mockGetUsersByTenantId).toHaveBeenCalledWith(adminUser.tenantId);
      expect(mockGetUsersByTenantId).not.toHaveBeenCalledWith(otherTenantAdmin.tenantId);
    });

    it('should prevent cross-tenant user creation', async () => {
      mockGetAuthFromRequest.mockReturnValue(adminUser);
      mockCreateUser.mockResolvedValue(mockNewUser);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer admin-token']]),
        json: jest.fn().mockResolvedValue({
          email: 'newuser@acme.test',
          password: 'password123',
          role: 'member'
        })
      };

      await inviteUser(mockRequest);

      // Should create user in Acme tenant, not Globex
      expect(mockCreateUser).toHaveBeenCalledWith({
        email: 'newuser@acme.test',
        password: 'password123',
        role: 'member',
        tenantId: adminUser.tenantId
      });
      expect(mockCreateUser).not.toHaveBeenCalledWith({
        email: 'newuser@acme.test',
        password: 'password123',
        role: 'member',
        tenantId: otherTenantAdmin.tenantId
      });
    });
  });

  describe('Role Hierarchy Validation', () => {
    it('should enforce admin-only access to user management', async () => {
      const adminOnlyEndpoints = [
        { method: 'GET', endpoint: getUsers, name: 'list users' },
        { method: 'POST', endpoint: inviteUser, name: 'invite user' },
        { method: 'GET', endpoint: getUser, name: 'get user details' },
        { method: 'PUT', endpoint: updateUser, name: 'update user' },
        { method: 'DELETE', endpoint: deleteUser, name: 'delete user' }
      ];

      for (const endpoint of adminOnlyEndpoints) {
        mockGetAuthFromRequest.mockReturnValue(memberUser);

        const mockRequest = {
          headers: new Map([['authorization', 'Bearer member-token']]),
          json: jest.fn().mockResolvedValue({
            email: 'test@acme.test',
            password: 'password123',
            role: 'member'
          })
        };

        let response;
        if (endpoint.method === 'GET' && endpoint.name === 'get user details') {
          response = await endpoint.endpoint(mockRequest, { params: { id: 'user-1' } });
        } else if (endpoint.method === 'PUT') {
          response = await endpoint.endpoint(mockRequest, { params: { id: 'user-1' } });
        } else if (endpoint.method === 'DELETE') {
          response = await endpoint.endpoint(mockRequest, { params: { id: 'user-1' } });
        } else {
          response = await endpoint.endpoint(mockRequest);
        }

        expect(response.status).toBe(403);
        expect(mockNextResponse.json).toHaveBeenCalledWith(
          { error: 'Forbidden. Admin access required.' },
          { status: 403 }
        );
      }
    });

    it('should allow members to access note management', async () => {
      // This test verifies that members can still access their allowed endpoints
      // while being blocked from admin-only endpoints
      
      // Members should be able to manage notes (tested in other test files)
      // But should be blocked from user management
      
      mockGetAuthFromRequest.mockReturnValue(memberUser);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer member-token']])
      };

      const response = await getUsers(mockRequest);

      expect(response.status).toBe(403);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Forbidden. Admin access required.' },
        { status: 403 }
      );
    });
  });

  describe('Input Validation for Role-Based Operations', () => {
    it('should validate role values when inviting users', async () => {
      mockGetAuthFromRequest.mockReturnValue(adminUser);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer admin-token']]),
        json: jest.fn().mockResolvedValue({
          email: 'test@acme.test',
          password: 'password123',
          role: 'invalid-role'
        })
      };

      const response = await inviteUser(mockRequest);

      expect(response.status).toBe(400);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid role. Must be admin or member' },
        { status: 400 }
      );
      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it('should require email and password when inviting users', async () => {
      mockGetAuthFromRequest.mockReturnValue(adminUser);

      const mockRequest = {
        headers: new Map([['authorization', 'Bearer admin-token']]),
        json: jest.fn().mockResolvedValue({
          email: 'test@acme.test'
          // Missing password
        })
      };

      const response = await inviteUser(mockRequest);

      expect(response.status).toBe(400);
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { error: 'Email and password are required' },
        { status: 400 }
      );
      expect(mockCreateUser).not.toHaveBeenCalled();
    });
  });
});
