import connectDB from './mongodb';
import User, { IUser } from '../models/User';
import Tenant, { ITenant } from '../models/Tenant';
import Note, { INote } from '../models/Note';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// Initialize database with sample data if empty
export const initializeDatabase = async () => {
  await connectDB();
  
  // Check if we already have data
  const tenantCount = await Tenant.countDocuments();
  if (tenantCount > 0) return;

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

  // Hash password for test users
  const hashedPassword = bcrypt.hashSync('password', 10);

  // Create sample users
  const users = [
    {
      email: 'admin@acme.test',
      password: hashedPassword,
      role: 'admin' as const,
      tenantId: acmeTenant._id
    },
    {
      email: 'user@acme.test',
      password: hashedPassword,
      role: 'member' as const,
      tenantId: acmeTenant._id
    },
    {
      email: 'admin@globex.test',
      password: hashedPassword,
      role: 'admin' as const,
      tenantId: globexTenant._id
    },
    {
      email: 'user@globex.test',
      password: hashedPassword,
      role: 'member' as const,
      tenantId: globexTenant._id
    }
  ];

  await User.insertMany(users);
  console.log('Database initialized with sample data');
};

// Database service functions
export const getUserByEmail = async (email: string): Promise<IUser | null> => {
  await connectDB();
  return await User.findOne({ email });
};

export const getTenantById = async (id: string | mongoose.Types.ObjectId): Promise<ITenant | null> => {
  await connectDB();
  return await Tenant.findById(id);
};

export const getTenantBySlug = async (slug: string): Promise<ITenant | null> => {
  await connectDB();
  return await Tenant.findOne({ slug });
};

export const getNotesByTenantId = async (tenantId: string): Promise<INote[]> => {
  await connectDB();
  return await Note.find({ tenantId })
    .populate('userId', 'email')
    .sort({ createdAt: -1 });
};

export const getNotesByUserId = async (userId: string, tenantId: string): Promise<INote[]> => {
  await connectDB();
  return await Note.find({ userId, tenantId })
    .populate('userId', 'email')
    .sort({ createdAt: -1 });
};

export const getNoteById = async (id: string, tenantId: string, userId?: string): Promise<INote | null> => {
  await connectDB();
  const query: Record<string, string> = { _id: id, tenantId };
  if (userId) {
    query.userId = userId;
  }
  return await Note.findOne(query).populate('userId', 'email');
};

export const createNote = async (noteData: {
  title: string;
  content: string;
  userId: string;
  tenantId: string;
}): Promise<INote> => {
  await connectDB();
  const note = new Note(noteData);
  return await note.save();
};

export const updateNote = async (
  id: string, 
  tenantId: string, 
  updates: { title?: string; content?: string },
  userId?: string
): Promise<INote | null> => {
  await connectDB();
  const query: Record<string, string> = { _id: id, tenantId };
  if (userId) {
    query.userId = userId;
  }
  return await Note.findOneAndUpdate(
    query,
    { ...updates, updatedAt: new Date() },
    { new: true }
  ).populate('userId', 'email');
};

export const deleteNote = async (id: string, tenantId: string, userId?: string): Promise<boolean> => {
  await connectDB();
  const query: Record<string, string> = { _id: id, tenantId };
  if (userId) {
    query.userId = userId;
  }
  const result = await Note.deleteOne(query);
  return result.deletedCount > 0;
};

export const upgradeTenant = async (slug: string): Promise<ITenant | null> => {
  await connectDB();
  return await Tenant.findOneAndUpdate(
    { slug },
    { plan: 'pro', noteLimit: -1 },
    { new: true }
  );
};

export const getNoteCountByTenant = async (tenantId: string): Promise<number> => {
  await connectDB();
  return await Note.countDocuments({ tenantId });
};

export const getNoteCountByUser = async (userId: string, tenantId: string): Promise<number> => {
  await connectDB();
  return await Note.countDocuments({ userId, tenantId });
};

// User management functions
export const getUsersByTenantId = async (tenantId: string): Promise<IUser[]> => {
  await connectDB();
  return await User.find({ tenantId }).select('-password');
};

export const getUserById = async (id: string, tenantId: string): Promise<IUser | null> => {
  await connectDB();
  return await User.findOne({ _id: id, tenantId }).select('-password');
};

export const createUser = async (userData: {
  email: string;
  password: string;
  role: 'admin' | 'member';
  tenantId: string;
}): Promise<IUser> => {
  await connectDB();
  const hashedPassword = bcrypt.hashSync(userData.password, 10);
  const user = new User({
    ...userData,
    password: hashedPassword
  });
  return await user.save();
};

export const updateUser = async (
  id: string, 
  tenantId: string, 
  updates: { email?: string; role?: string; password?: string }
): Promise<IUser | null> => {
  await connectDB();
  
  const updateData: Record<string, string> = { ...updates };
  if (updates.password) {
    updateData.password = bcrypt.hashSync(updates.password, 10);
  }
  
  return await User.findOneAndUpdate(
    { _id: id, tenantId },
    updateData,
    { new: true }
  ).select('-password');
};

export const deleteUser = async (id: string, tenantId: string): Promise<boolean> => {
  await connectDB();
  const result = await User.deleteOne({ _id: id, tenantId });
  return result.deletedCount > 0;
};

// Tenant management functions
export const createTenant = async (tenantData: {
  name: string;
  slug: string;
  plan: string;
  noteLimit: number;
  createdAt: Date;
  updatedAt: Date;
}): Promise<ITenant | null> => {
  await connectDB();
  try {
    const tenant = new Tenant(tenantData);
    return await tenant.save();
  } catch (error) {
    console.error('Error creating tenant:', error);
    return null;
  }
};
