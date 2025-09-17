# Multi-Tenant SaaS Notes Application

A secure, multi-tenant notes application with JWT authentication, role-based access control, and subscription feature gating.

## Multi-Tenancy Approach

This application uses a **shared schema with tenant ID column** approach. All data is stored in shared data structures with tenant isolation enforced through:
- Tenant ID filtering on all queries
- JWT token validation containing tenant context
- Strict access controls preventing cross-tenant data access

## Features

- **Multi-tenant architecture** with strict data isolation
- **JWT-based authentication** with role-based access control
- **Subscription feature gating** (Free: 3 notes limit, Pro: unlimited)
- **CRUD operations** for notes with tenant isolation
- **Admin upgrade functionality** for subscription management
- **Responsive UI** built with React and Tailwind CSS

## Test Accounts

All accounts use password: `password`

- `admin@acme.test` (Admin, Acme tenant)
- `user@acme.test` (Member, Acme tenant)
- `admin@globex.test` (Admin, Globex tenant)
- `user@globex.test` (Member, Globex tenant)

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/login` - User login
- `GET /api/notes` - List tenant notes
- `POST /api/notes` - Create note (with limits)
- `GET /api/notes/:id` - Get specific note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note
- `POST /api/tenants/:slug/upgrade` - Upgrade tenant (Admin only)

## MongoDB Setup

### Prerequisites
- MongoDB installed locally or MongoDB Atlas account
- Node.js and npm installed

### Local MongoDB Setup

1. **Install MongoDB locally** (if not already installed):
   - Windows: Download from [MongoDB Community Server](https://www.mongodb.com/try/download/community)
   - macOS: `brew install mongodb-community`
   - Linux: Follow [MongoDB installation guide](https://docs.mongodb.com/manual/installation/)

2. **Start MongoDB service**:
   ```bash
   # Windows (if installed as service)
   net start MongoDB
   
   # macOS/Linux
   brew services start mongodb-community
   # or
   sudo systemctl start mongod
   ```

3. **Configure environment variables**:
   The `.env.local` file is already configured with:
   ```
   MONGODB_URI=mongodb://localhost:27017/multitenantnotesapp
   JWT_SECRET=your_jwt_secret_key
   ```

### MongoDB Atlas Setup (Cloud)

1. **Create MongoDB Atlas account** at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

2. **Create a cluster** and get your connection string

3. **Update `.env.local`**:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/multitenantnotesapp
   ```

### Initialize Database

Run the setup script to create sample data:

```bash
npm run setup-db
```

This will:
- Connect to MongoDB
- Create sample tenants (Acme, Globex)
- Create sample users with test accounts
- Set up the database schema

### Database Schema

- **Tenants**: Company/organization data with subscription plans
- **Users**: User accounts with roles (admin/member) and tenant association
- **Notes**: User notes with tenant isolation

## Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Access the application**:
   - Open [http://localhost:3000](http://localhost:3000)
   - Use test accounts from the setup

## Deployment

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/multitenantnotesapp
# or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/multitenantnotesapp

# JWT Secret (use a strong, random string in production)
JWT_SECRET=your_super_secret_jwt_key_change_in_production

# Next.js
NEXTAUTH_URL=http://localhost:3000
```

### Production Deployment

#### Vercel (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Set environment variables** in Vercel dashboard:
   - `MONGODB_URI`
   - `JWT_SECRET`

#### Docker Deployment

1. **Create Dockerfile**:
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Build and run**:
   ```bash
   docker build -t multitenant-notes-app .
   docker run -p 3000:3000 --env-file .env.local multitenant-notes-app
   ```

#### Manual Server Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Start production server**:
   ```bash
   npm start
   ```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

### Test Structure

- **API Tests**: `tests/api/` - Tests for all API endpoints
- **E2E Tests**: `tests/e2e/` - End-to-end frontend tests
- **Unit Tests**: Component and utility function tests

### Test Coverage

The test suite covers:
- Authentication and authorization
- CRUD operations with tenant isolation
- Role-based access control
- Subscription limits and upgrades
- Frontend accessibility and responsiveness

## Project Structure

```
multitenantnotesapp/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── notes/         # Notes CRUD operations
│   │   │   ├── tenants/       # Tenant management
│   │   │   └── users/         # User management
│   │   ├── dashboard/         # Main dashboard page
│   │   ├── login/             # Login page
│   │   ├── signup/            # Registration page
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── CreateNote.tsx     # Note creation form
│   │   ├── NotesList.tsx      # Notes display component
│   │   ├── UserManagement.tsx # User management interface
│   │   └── SubscriptionStatus.tsx # Subscription info
│   ├── lib/                   # Utility libraries
│   │   ├── auth.ts           # JWT authentication
│   │   ├── db.ts             # Database operations
│   │   ├── mongodb.ts        # MongoDB connection
│   │   ├── rbac.ts           # Role-based access control
│   │   └── types.ts          # TypeScript interfaces
│   ├── models/               # MongoDB models
│   │   ├── User.ts           # User schema
│   │   ├── Tenant.ts         # Tenant schema
│   │   └── Note.ts           # Note schema
│   └── types/                # TypeScript type definitions
├── tests/                    # Test files
│   ├── api/                  # API tests
│   ├── e2e/                  # End-to-end tests
│   └── setup.js              # Test setup
├── scripts/                  # Utility scripts
│   └── setup-db.js           # Database initialization
├── public/                   # Static assets
├── package.json              # Dependencies and scripts
├── next.config.ts            # Next.js configuration
├── tailwind.config.js        # Tailwind CSS configuration
└── tsconfig.json             # TypeScript configuration
```

## Security Features

### Multi-Tenant Data Isolation

- **Tenant ID Filtering**: All database queries include tenant ID filtering
- **JWT Token Validation**: Every request validates tenant context from JWT
- **Strict Access Controls**: Prevents cross-tenant data access at API level

### Authentication & Authorization

- **JWT-based Authentication**: Secure token-based authentication
- **Role-based Access Control**: Admin and member roles with different permissions
- **Password Hashing**: bcrypt for secure password storage
- **Token Expiration**: 7-day token expiration for security

### API Security

- **Input Validation**: All API endpoints validate input data
- **Error Handling**: Secure error messages without sensitive information
- **Rate Limiting**: Built-in Next.js rate limiting
- **CORS Protection**: Configured for production environments

## Performance Optimizations

### Frontend

- **Next.js App Router**: Latest Next.js routing for optimal performance
- **Tailwind CSS**: Utility-first CSS for minimal bundle size
- **Component Optimization**: React hooks and memoization
- **Responsive Design**: Mobile-first responsive layout

### Backend

- **MongoDB Indexing**: Optimized database queries
- **Connection Pooling**: Efficient database connections
- **JWT Caching**: Token validation optimization
- **API Response Caching**: Strategic caching for better performance

## Monitoring & Logging

### Development

- **Console Logging**: Detailed logs for development debugging
- **Error Tracking**: Comprehensive error handling and logging
- **Performance Monitoring**: Built-in Next.js performance metrics

### Production

- **Health Check Endpoint**: `/api/health` for monitoring
- **Error Boundaries**: React error boundaries for graceful failures
- **Logging**: Structured logging for production monitoring

## Contributing

### Development Setup

1. **Fork the repository**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/yourusername/multitenantnotesapp.git
   cd multitenantnotesapp
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

5. **Initialize database**:
   ```bash
   npm run setup-db
   ```

6. **Start development server**:
   ```bash
   npm run dev
   ```

### Code Style

- **TypeScript**: Strict TypeScript configuration
- **ESLint**: Code linting with Next.js recommended rules
- **Prettier**: Code formatting (if configured)
- **Conventional Commits**: Use conventional commit messages

### Pull Request Process

1. **Create a feature branch**: `git checkout -b feature/amazing-feature`
2. **Make your changes** and test thoroughly
3. **Run tests**: `npm test`
4. **Run build**: `npm run build`
5. **Commit changes**: `git commit -m 'feat: add amazing feature'`
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

## Troubleshooting

### Common Issues

#### Database Connection Issues

```bash
# Check MongoDB service status
# Windows
net start MongoDB

# macOS/Linux
brew services start mongodb-community
# or
sudo systemctl start mongod
```

#### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

#### Authentication Issues

- Verify JWT_SECRET is set in environment variables
- Check token expiration (7 days default)
- Ensure user has correct tenant association

### Getting Help

- **Issues**: Create an issue on GitHub
- **Documentation**: Check this README and inline code comments
- **Community**: Join discussions in GitHub Discussions

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Next.js** - React framework for production
- **MongoDB** - NoSQL database
- **Tailwind CSS** - Utility-first CSS framework
- **JWT** - JSON Web Token authentication
- **bcrypt** - Password hashing library

---

**Built with ❤️ using Next.js, MongoDB, and Tailwind CSS**
