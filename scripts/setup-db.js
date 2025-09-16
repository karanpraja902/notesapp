const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/multitenantnotesapp';

// Schemas (simplified for setup script)
const tenantSchema = new mongoose.Schema({
  name: String,
  slug: String,
  plan: { type: String, enum: ['free', 'pro'], default: 'free' },
  noteLimit: { type: Number, default: 10 }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true }
}, { timestamps: true });

const Tenant = mongoose.model('Tenant', tenantSchema);
const User = mongoose.model('User', userSchema);

async function setupDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Tenant.deleteMany({});
    await User.deleteMany({});
    console.log('Cleared existing data');

    // Create sample tenants
    const acmeTenant = new Tenant({
      name: 'Acme',
      slug: 'acme',
      plan: 'free',
      noteLimit: 3
    });
    await acmeTenant.save();

    const globexTenant = new Tenant({
      name: 'Globex',
      slug: 'globex',
      plan: 'free',
      noteLimit: 3
    });
    await globexTenant.save();

    console.log('Created sample tenants');

    // Hash password for test users
    const hashedPassword = bcrypt.hashSync('password', 10);

    // Create sample users
    const users = [
      {
        email: 'admin@acme.test',
        password: hashedPassword,
        role: 'admin',
        tenantId: acmeTenant._id
      },
      {
        email: 'user@acme.test',
        password: hashedPassword,
        role: 'member',
        tenantId: acmeTenant._id
      },
      {
        email: 'admin@globex.test',
        password: hashedPassword,
        role: 'admin',
        tenantId: globexTenant._id
      },
      {
        email: 'user@globex.test',
        password: hashedPassword,
        role: 'member',
        tenantId: globexTenant._id
      }
    ];

    await User.insertMany(users);
    console.log('Created sample users');

    console.log('\n✅ Database setup complete!');
    console.log('\nSample accounts:');
    console.log('Admin: admin@acme.test / password');
    console.log('User: user@acme.test / password');
    console.log('Admin: admin@globex.test / password');
    console.log('User: user@globex.test / password');

  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

setupDatabase();
