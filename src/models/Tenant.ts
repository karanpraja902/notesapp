import mongoose, { Document, Schema } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  slug: string;
  plan: 'free' | 'pro';
  noteLimit: number;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  plan: {
    type: String,
    enum: ['free', 'pro'],
    default: 'free'
  },
  noteLimit: {
    type: Number,
    default: 3// Free plan limit
  }
}, {
  timestamps: true
});

// Set noteLimit based on plan
TenantSchema.pre('save', function(next) {
  if (this.plan === 'pro') {
    this.noteLimit = -1; // -1 means unlimited
  } else {
    this.noteLimit = 3; // Free plan limit
  }
  next();
});

export default mongoose.models.Tenant || mongoose.model<ITenant>('Tenant', TenantSchema);
