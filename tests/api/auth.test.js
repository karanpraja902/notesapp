// Mock NextResponse before importing the route
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

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  compareSync: jest.fn()
}));

// Mock database functions
const mockGetUserByEmail = jest.fn();
const mockGetTenantById = jest.fn();
const mockInitializeDatabase = jest.fn();

jest.mock('../../src/lib/db', () => ({
  getUserByEmail: mockGetUserByEmail,
  getTenantById: mockGetTenantById,
  initializeDatabase: mockInitializeDatabase
}));

// Mock auth functions
const mockGenerateToken = jest.fn();
jest.mock('../../src/lib/auth', () => ({
  generateToken: mockGenerateToken
}));

const { POST } = require('../../src/app/api/auth/login/route');
const bcrypt = require('bcryptjs');

describe('Authentication Tests', () => {
  // Predefined test accounts
  const predefinedAccounts = [
    {
      email: 'admin@acme.test',
      password: 'password',
      role: 'admin',
      tenantId: 'tenant-1',
      tenantSlug: 'acme',
      tenantName: 'Acme'
    },
    {
      email: 'user@acme.test',
      password: 'password',
      role: 'member',
      tenantId: 'tenant-1',
      tenantSlug: 'acme',
      tenantName: 'Acme'
    },
    {
      email: 'admin@globex.test',
      password: 'password',
      role: 'admin',
      tenantId: 'tenant-2',
      tenantSlug: 'globex',
      tenantName: 'Globex'
    },
    {
      email: 'user@globex.test',
      password: 'password',
      role: 'member',
      tenantId: 'tenant-2',
      tenantSlug: 'globex',
      tenantName: 'Globex'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockInitializeDatabase.mockResolvedValue();
    bcrypt.compareSync.mockReturnValue(true);
    mockGenerateToken.mockReturnValue('mock-jwt-token');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    describe('Successful login for all predefined accounts', () => {
      predefinedAccounts.forEach((account, index) => {
        it(`should successfully login ${account.email} (${account.role})`, async () => {
          // Mock user data
          const mockUser = {
            _id: `user-${index + 1}`,
            email: account.email,
            password: 'hashed-password',
            role: account.role,
            tenantId: account.tenantId,
            firstName: 'Test',
            lastName: 'User'
          };

          // Mock tenant data
          const mockTenant = {
            _id: account.tenantId,
            name: account.tenantName,
            slug: account.tenantSlug,
            plan: 'free',
            noteLimit: 3
          };

          // Setup mocks
          mockGetUserByEmail.mockResolvedValue(mockUser);
          mockGetTenantById.mockResolvedValue(mockTenant);
          mockGenerateToken.mockReturnValue(`jwt-token-${account.email}`);

          // Create mock request
          const mockRequest = {
            json: jest.fn().mockResolvedValue({
              email: account.email,
              password: account.password
            })
          };

          // Call the login endpoint
          const response = await POST(mockRequest);

          // Verify response
          expect(response.status).toBe(200);
          expect(mockNextResponse.json).toHaveBeenCalledWith({
            token: `jwt-token-${account.email}`,
            user: {
              id: mockUser._id,
              email: account.email,
              firstName: 'Test',
              lastName: 'User',
              role: account.role,
              tenantId: account.tenantId,
              tenantSlug: account.tenantSlug
            }
          });

          // Verify function calls
          expect(mockInitializeDatabase).toHaveBeenCalled();
          expect(mockGetUserByEmail).toHaveBeenCalledWith(account.email);
          expect(bcrypt.compareSync).toHaveBeenCalledWith(account.password, mockUser.password);
          expect(mockGetTenantById).toHaveBeenCalledWith(account.tenantId);
          expect(mockGenerateToken).toHaveBeenCalledWith({
            userId: mockUser._id,
            email: account.email,
            role: account.role,
            tenantId: account.tenantId,
            tenantSlug: account.tenantSlug
          });
        });
      });

      it('should handle all predefined accounts with correct tenant isolation', async () => {
        const results = [];

        for (const account of predefinedAccounts) {
          const mockUser = {
            _id: `user-${account.email}`,
            email: account.email,
            password: 'hashed-password',
            role: account.role,
            tenantId: account.tenantId,
            firstName: 'Test',
            lastName: 'User'
          };

          const mockTenant = {
            _id: account.tenantId,
            name: account.tenantName,
            slug: account.tenantSlug,
            plan: 'free',
            noteLimit: 3
          };

          mockGetUserByEmail.mockResolvedValue(mockUser);
          mockGetTenantById.mockResolvedValue(mockTenant);
          mockGenerateToken.mockReturnValue(`jwt-token-${account.email}`);

          const mockRequest = {
            json: jest.fn().mockResolvedValue({
              email: account.email,
              password: account.password
            })
          };

          const response = await POST(mockRequest);
          const responseData = await response.json();

          results.push({
            email: account.email,
            status: response.status,
            user: responseData.user,
            token: responseData.token
          });
        }

        // Verify all accounts logged in successfully
        expect(results).toHaveLength(4);
        results.forEach((result, index) => {
          const account = predefinedAccounts[index];
          expect(result.status).toBe(200);
          expect(result.user.email).toBe(account.email);
          expect(result.user.role).toBe(account.role);
          expect(result.user.tenantId).toBe(account.tenantId);
          expect(result.user.tenantSlug).toBe(account.tenantSlug);
          expect(result.token).toBe(`jwt-token-${account.email}`);
        });

        // Verify tenant isolation - Acme users should have tenant-1, Globex users should have tenant-2
        const acmeUsers = results.filter(r => r.user.tenantSlug === 'acme');
        const globexUsers = results.filter(r => r.user.tenantSlug === 'globex');
        
        expect(acmeUsers).toHaveLength(2);
        expect(globexUsers).toHaveLength(2);
        
        acmeUsers.forEach(user => {
          expect(user.user.tenantId).toBe('tenant-1');
        });
        
        globexUsers.forEach(user => {
          expect(user.user.tenantId).toBe('tenant-2');
        });
      });
    });

    describe('Failed login scenarios', () => {
      it('should return 400 for missing email', async () => {
        const mockRequest = {
          json: jest.fn().mockResolvedValue({
            password: 'password'
          })
        };

        const response = await POST(mockRequest);

        expect(response.status).toBe(400);
        expect(mockNextResponse.json).toHaveBeenCalledWith(
          { error: 'Email and password are required' },
          { status: 400 }
        );
      });

      it('should return 400 for missing password', async () => {
        const mockRequest = {
          json: jest.fn().mockResolvedValue({
            email: 'admin@acme.test'
          })
        };

        const response = await POST(mockRequest);

        expect(response.status).toBe(400);
        expect(mockNextResponse.json).toHaveBeenCalledWith(
          { error: 'Email and password are required' },
          { status: 400 }
        );
      });

      it('should return 401 for non-existent user', async () => {
        mockGetUserByEmail.mockResolvedValue(null);

        const mockRequest = {
          json: jest.fn().mockResolvedValue({
            email: 'nonexistent@test.com',
            password: 'password'
          })
        };

        const response = await POST(mockRequest);

        expect(response.status).toBe(401);
        expect(mockNextResponse.json).toHaveBeenCalledWith(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      });

      it('should return 401 for invalid password', async () => {
        const mockUser = {
          _id: 'user-1',
          email: 'admin@acme.test',
          password: 'hashed-password',
          role: 'admin',
          tenantId: 'tenant-1'
        };

        mockGetUserByEmail.mockResolvedValue(mockUser);
        bcrypt.compareSync.mockReturnValue(false); // Invalid password

        const mockRequest = {
          json: jest.fn().mockResolvedValue({
            email: 'admin@acme.test',
            password: 'wrongpassword'
          })
        };

        const response = await POST(mockRequest);

        expect(response.status).toBe(401);
        expect(mockNextResponse.json).toHaveBeenCalledWith(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      });

      it('should return 500 for missing tenant', async () => {
        const mockUser = {
          _id: 'user-1',
          email: 'admin@acme.test',
          password: 'hashed-password',
          role: 'admin',
          tenantId: 'tenant-1'
        };

        mockGetUserByEmail.mockResolvedValue(mockUser);
        mockGetTenantById.mockResolvedValue(null); // Tenant not found

        const mockRequest = {
          json: jest.fn().mockResolvedValue({
            email: 'admin@acme.test',
            password: 'password'
          })
        };

        const response = await POST(mockRequest);

        expect(response.status).toBe(500);
        expect(mockNextResponse.json).toHaveBeenCalledWith(
          { error: 'Tenant not found' },
          { status: 500 }
        );
      });
    });

    describe('JWT token validation', () => {
      it('should generate valid JWT token with correct payload', async () => {
        const account = predefinedAccounts[0]; // admin@acme.test
        const mockUser = {
          _id: 'user-1',
          email: account.email,
          password: 'hashed-password',
          role: account.role,
          tenantId: account.tenantId,
          firstName: 'Test',
          lastName: 'User'
        };

        const mockTenant = {
          _id: account.tenantId,
          name: account.tenantName,
          slug: account.tenantSlug,
          plan: 'free',
          noteLimit: 3
        };

        mockGetUserByEmail.mockResolvedValue(mockUser);
        mockGetTenantById.mockResolvedValue(mockTenant);
        mockGenerateToken.mockReturnValue('valid-jwt-token');

        const mockRequest = {
          json: jest.fn().mockResolvedValue({
            email: account.email,
            password: account.password
          })
        };

        await POST(mockRequest);

        expect(mockGenerateToken).toHaveBeenCalledWith({
          userId: mockUser._id,
          email: account.email,
          role: account.role,
          tenantId: account.tenantId,
          tenantSlug: account.tenantSlug
        });
      });
    });

    describe('User data validation', () => {
      it('should return complete user data in response', async () => {
        const account = predefinedAccounts[0]; // admin@acme.test
        const mockUser = {
          _id: 'user-1',
          email: account.email,
          password: 'hashed-password',
          role: account.role,
          tenantId: account.tenantId,
          firstName: 'John',
          lastName: 'Doe'
        };

        const mockTenant = {
          _id: account.tenantId,
          name: account.tenantName,
          slug: account.tenantSlug,
          plan: 'free',
          noteLimit: 3
        };

        mockGetUserByEmail.mockResolvedValue(mockUser);
        mockGetTenantById.mockResolvedValue(mockTenant);
        mockGenerateToken.mockReturnValue('jwt-token');

        const mockRequest = {
          json: jest.fn().mockResolvedValue({
            email: account.email,
            password: account.password
          })
        };

        const response = await POST(mockRequest);
        const responseData = await response.json();

        expect(responseData.user).toEqual({
          id: mockUser._id,
          email: account.email,
          firstName: 'John',
          lastName: 'Doe',
          role: account.role,
          tenantId: account.tenantId,
          tenantSlug: account.tenantSlug
        });

        // Verify password is not included in response
        expect(responseData.user.password).toBeUndefined();
      });
    });
  });
});
