import { User, Tenant, Note } from './types';
import bcrypt from 'bcryptjs';

// Hash password for test users
const hashedPassword = bcrypt.hashSync('password', 10);

export const tenants: Tenant[] = [
  {
    id: 'tenant-1',
    name: 'Acme',
    slug: 'acme',
    plan: 'free',
    noteLimit: 3
  },
  {
    id: 'tenant-2',
    name: 'Globex',
    slug: 'globex',
    plan: 'free',
    noteLimit: 3
  }
];

export const users: User[] = [
  {
    id: 'user-1',
    email: 'admin@acme.test',
    password: hashedPassword,
    role: 'admin',
    tenantId: 'tenant-1'
  },
  {
    id: 'user-2',
    email: 'user@acme.test',
    password: hashedPassword,
    role: 'member',
    tenantId: 'tenant-1'
  },
  {
    id: 'user-3',
    email: 'admin@globex.test',
    password: hashedPassword,
    role: 'admin',
    tenantId: 'tenant-2'
  },
  {
    id: 'user-4',
    email: 'user@globex.test',
    password: hashedPassword,
    role: 'member',
    tenantId: 'tenant-2'
  }
];

export const notes: Note[] = [];

// Helper functions
export const getUserByEmail = (email: string): User | undefined => {
  return users.find(user => user.email === email);
};

export const getTenantById = (id: string): Tenant | undefined => {
  return tenants.find(tenant => tenant.id === id);
};

export const getTenantBySlug = (slug: string): Tenant | undefined => {
  return tenants.find(tenant => tenant.slug === slug);
};

export const getNotesByTenantId = (tenantId: string): Note[] => {
  return notes.filter(note => note.tenantId === tenantId);
};

export const getNoteById = (id: string, tenantId: string): Note | undefined => {
  return notes.find(note => note.id === id && note.tenantId === tenantId);
};

export const addNote = (note: Note): void => {
  notes.push(note);
};

export const updateNote = (id: string, tenantId: string, updates: Partial<Note>): boolean => {
  const index = notes.findIndex(note => note.id === id && note.tenantId === tenantId);
  if (index !== -1) {
    notes[index] = { ...notes[index], ...updates, updatedAt: new Date().toISOString() };
    return true;
  }
  return false;
};

export const deleteNote = (id: string, tenantId: string): boolean => {
  const index = notes.findIndex(note => note.id === id && note.tenantId === tenantId);
  if (index !== -1) {
    notes.splice(index, 1);
    return true;
  }
  return false;
};

export const upgradeTenant = (slug: string): boolean => {
  const tenant = getTenantBySlug(slug);
  if (tenant) {
    tenant.plan = 'pro';
    tenant.noteLimit = Infinity;
    return true;
  }
  return false;
};
