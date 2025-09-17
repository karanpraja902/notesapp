# Test Suite Documentation

This directory contains comprehensive automated tests for the Multi-Tenant Notes Application.

## 🧪 Test Coverage

### API Tests (Jest)
- **Health Endpoint Tests** (`tests/api/health.test.js`)
  - Tests API health endpoint availability
  - Verifies correct response format
  - Ensures endpoint is accessible without authentication

- **Authentication Tests** (`tests/api/auth.test.js`)
  - Tests successful login for all predefined accounts
  - Tests failed login scenarios
  - Validates JWT token generation
  - Tests user data retrieval

- **Tenant Isolation Tests** (`tests/api/tenant-isolation.test.js`)
  - Tests enforcement of tenant isolation
  - Verifies users can only access their own tenant's data
  - Tests cross-tenant data protection

- **Role-Based Access Control Tests** (`tests/api/rbac.test.js`)
  - Tests admin vs member permissions
  - Verifies member cannot invite users
  - Tests admin-only upgrade functionality
  - Tests unauthorized access scenarios

- **Subscription Limits Tests** (`tests/api/subscription-limits.test.js`)
  - Tests Free plan 3-note limit enforcement
  - Tests Pro plan unlimited access
  - Tests upgrade functionality
  - Tests per-user limit enforcement

- **CRUD Operations Tests** (`tests/api/crud-operations.test.js`)
  - Tests all CRUD endpoints (Create, Read, Update, Delete)
  - Tests input validation
  - Tests error handling
  - Tests authorization requirements

### Frontend Tests (Playwright)
- **Frontend Accessibility Tests** (`tests/e2e/frontend-accessibility.test.ts`)
  - Tests page loading and navigation
  - Tests login functionality
  - Tests dashboard accessibility
  - Tests responsive design
  - Tests form validation

- **Subscription Flow Tests** (`tests/e2e/subscription-flow.test.ts`)
  - Tests subscription status display
  - Tests upgrade flow for admins
  - Tests note limit enforcement in UI
  - Tests Pro plan unlimited access

- **Signup API Tests** (`tests/api/signup.test.js`)
  - Tests organization registration API
  - Tests validation of required fields
  - Tests duplicate prevention (email and slug)
  - Tests JWT token generation
  - Tests organization setup with free plan

- **Signup Flow Tests** (`tests/e2e/signup-flow.test.ts`)
  - Tests organization registration UI flow
  - Tests form validation and error handling
  - Tests auto-generation of organization slug
  - Tests duplicate prevention in UI
  - Tests successful registration and redirect

## 🚀 Running Tests

### Prerequisites
1. **MongoDB**: Ensure MongoDB is running
2. **Dependencies**: Run `npm install`
3. **Database Setup**: Run `npm run setup-db`
4. **Environment**: Ensure `.env.local` is configured

### Test Commands

```bash
# Run all API tests
npm test

# Run specific test file
npm test -- tests/api/health.test.js

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run all frontend tests
npm run test:e2e

# Run frontend tests with UI
npm run test:e2e:ui

# Run all tests (API + Frontend)
npm run test:all

# Run comprehensive test suite with detailed reporting
npm run test:comprehensive
```

## 📊 Test Data

### Predefined Test Accounts
- `admin@acme.test` / `password` (Admin, Acme tenant)
- `user@acme.test` / `password` (Member, Acme tenant)
- `admin@globex.test` / `password` (Admin, Globex tenant)
- `user@globex.test` / `password` (Member, Globex tenant)

### Test Scenarios
1. **Health Check**: Verifies API availability
2. **Authentication**: Tests all login scenarios
3. **Tenant Isolation**: Ensures data separation
4. **Role-Based Access**: Tests admin vs member permissions
5. **Subscription Limits**: Tests Free (3 notes) vs Pro (unlimited)
6. **CRUD Operations**: Tests all note operations
7. **Frontend Access**: Tests UI functionality
8. **Subscription Flow**: Tests upgrade process
9. **Organization Registration**: Tests signup flow and validation

## 🔧 Test Configuration

### Jest Configuration (`jest.config.js`)
- Test environment: Node.js
- Timeout: 30 seconds
- Coverage collection enabled
- Setup file: `tests/setup.js`

### Playwright Configuration (`playwright.config.ts`)
- Tests multiple browsers (Chrome, Firefox, Safari)
- Base URL: `http://localhost:3000`
- Auto-starts development server
- HTML reporter enabled

### Test Setup (`tests/setup.js`)
- Sets test environment variables
- Initializes test database
- Configures global test timeout

## 📈 Test Results

### Expected Outcomes
- **Health Endpoint**: Should return 200 with status info
- **Authentication**: All predefined accounts should login successfully
- **Tenant Isolation**: Users should only see their tenant's data
- **RBAC**: Members should be blocked from admin functions
- **Subscription Limits**: Free plan should limit to 3 notes per user
- **CRUD Operations**: All operations should work correctly
- **Frontend**: All pages should be accessible and functional
- **Organization Registration**: New organizations can register successfully

### Success Criteria
- All API endpoints return correct status codes
- Authentication works for all test accounts
- Tenant data is properly isolated
- Role-based permissions are enforced
- Subscription limits work correctly
- Frontend is accessible and responsive
- Upgrade flow works for admins
- Organization registration works correctly

## 🐛 Troubleshooting

### Common Issues
1. **MongoDB Connection**: Ensure MongoDB is running
2. **Environment Variables**: Check `.env.local` configuration
3. **Database Setup**: Run `npm run setup-db` if tests fail
4. **Port Conflicts**: Ensure port 3000 is available for frontend tests
5. **Dependencies**: Run `npm install` if modules are missing

### Debug Mode
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test with debug info
npm test -- tests/api/auth.test.js --verbose

# Run frontend tests in headed mode
npx playwright test --headed
```

## 📝 Adding New Tests

### API Tests
1. Create test file in `tests/api/`
2. Import required modules and route handlers
3. Use Jest testing framework
4. Mock requests and responses
5. Test both success and failure scenarios

### Frontend Tests
1. Create test file in `tests/e2e/`
2. Use Playwright testing framework
3. Test user interactions and UI elements
4. Verify page navigation and form submissions
5. Test responsive design and accessibility

## 🎯 Test Coverage Goals

- **API Coverage**: 100% of endpoints tested
- **Authentication**: All user roles and scenarios
- **Security**: Tenant isolation and RBAC
- **Business Logic**: Subscription limits and upgrades
- **Frontend**: All major user flows
- **Error Handling**: All error scenarios covered

This comprehensive test suite ensures the Multi-Tenant Notes Application works correctly across all features and user scenarios.
