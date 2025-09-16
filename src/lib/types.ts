export interface User {
    id: string;
    email: string;
    password: string;
    role: 'admin' | 'member';
    tenantId: string;
  }
  
  export interface Tenant {
    id: string;
    name: string;
    slug: string;
    plan: 'free' | 'pro';
    noteLimit: number;
  }
  
  export interface Note {
    id: string;
    title: string;
    content: string;
    userId: string;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface AuthToken {
    userId: string;
    email: string;
    role: 'admin' | 'member';
    tenantId: string;
    tenantSlug: string;
  }
  