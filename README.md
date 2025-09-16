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

