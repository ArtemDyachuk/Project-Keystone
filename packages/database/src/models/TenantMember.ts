import { mongoose } from "../types";
import { ROLES, UserRole } from "@keystone/auth";

export interface ITenantMember {
  _id?: string;
  userId: string; // Firebase UID
  tenantId: string; // MongoDB Tenant ID
  roles: UserRole[]; // Changed from single role to array of roles
  invitedBy?: string; // Firebase UID of the inviter
  invitedAt?: Date;
  joinedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const tenantMemberSchema = new mongoose.Schema<ITenantMember>({
  userId: {
    type: String,
    required: true,
    trim: true,
  },
  tenantId: {
    type: String,
    required: true,
    trim: true,
  },
  roles: {
    type: [String],
    required: true,
    enum: Object.values(ROLES),
    default: [ROLES.TENANT_USER],
    validate: {
      validator: function(roles: string[]) {
        return roles.length > 0; // At least one role required
      },
      message: 'At least one role is required'
    }
  },
  invitedBy: {
    type: String,
    trim: true,
  },
  invitedAt: {
    type: Date,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Create compound index for efficient queries
tenantMemberSchema.index({ userId: 1, tenantId: 1 }, { unique: true });
tenantMemberSchema.index({ tenantId: 1 });
tenantMemberSchema.index({ userId: 1 });

// Handle Next.js development mode where models may be compiled multiple times
export const TenantMember = mongoose.models.TenantMember || mongoose.model<ITenantMember>("TenantMember", tenantMemberSchema);
