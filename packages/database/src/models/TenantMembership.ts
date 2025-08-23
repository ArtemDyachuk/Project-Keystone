import { mongoose } from "../types";

export interface ITenantMembership {
  _id?: string;
  userId: string; // Firebase UID
  tenantId: string; // Reference to the tenant
  roles: string[]; // Array of roles e.g., ["owner", "admin"]
  isActive: boolean;
  joinedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const tenantMembershipSchema = new mongoose.Schema<ITenantMembership>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  roles: [{
    type: String,
    enum: ["owner", "admin", "member", "viewer"],
    default: ["member"]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Create indexes for faster queries
tenantMembershipSchema.index({ userId: 1, tenantId: 1 }, { unique: true });
tenantMembershipSchema.index({ tenantId: 1, roles: 1 });
tenantMembershipSchema.index({ userId: 1, isActive: 1 });

// Handle Next.js development mode where models may be compiled multiple times
export const TenantMembership = mongoose.models.TenantMembership || mongoose.model<ITenantMembership>("TenantMembership", tenantMembershipSchema);
