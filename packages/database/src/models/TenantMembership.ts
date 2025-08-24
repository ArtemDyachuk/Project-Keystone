import { mongoose } from "../types";

export interface ITenantMembership {
  _id?: string;
  userId: string; // Firebase UID
  tenantId: mongoose.Types.ObjectId; // Reference to the tenant
  roles: string[]; // Array of roles e.g., ["Tenant:Owner", "Corporation:Admin"]
  isActive: boolean;
  joinedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Role-based access control (RBAC) schema
// Roles follow the format: "Resource:Level" (e.g., "Tenant:Owner", "Corporation:Admin")
// Global roles provide system-wide access: "Global:Admin", "Global:Reader"
// The schema is permissive and allows any role following this pattern without hardcoding
const tenantMembershipSchema = new mongoose.Schema<ITenantMembership>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant",
    required: true,
    index: true
  },
  roles: [{
    type: String,
    // No strict enum - allow any role that follows the "Resource:Level" pattern
    // This prevents duplication and allows easy addition of new role sets
    // default: ["Tenant:Reader"]
    default: []
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

// Custom validator to ensure roles follow the correct format pattern
// This is permissive and allows any role that follows "Resource:Level" pattern
tenantMembershipSchema.path('roles').validate(function (roles: string[]) {
  if (!Array.isArray(roles)) return false;

  // Check that each role follows the "Resource:Level" pattern
  const rolePattern = /^[A-Z][a-zA-Z]+:[A-Z][a-zA-Z]+$/;

  return roles.every(role => {
    const isValidFormat = rolePattern.test(role);
    if (!isValidFormat) {
      console.warn(`Invalid role format: "${role}". Expected format: "Resource:Level" (e.g., "Tenant:Owner")`);
    }
    return isValidFormat;
  });
}, 'Invalid role format. Roles must follow the pattern "Resource:Level" (e.g., "Tenant:Owner", "Corporation:Admin")');

// Create indexes for faster queries
// Unique constraint: One user can only be in one tenant (simplified for single-tenant users)
tenantMembershipSchema.index({ userId: 1 }, { unique: true });
tenantMembershipSchema.index({ tenantId: 1, roles: 1 });
tenantMembershipSchema.index({ userId: 1, isActive: 1 });

// Additional constraints for role consistency
// Ensure roles array is not empty when membership is active
tenantMembershipSchema.path('isActive').validate(function(isActive: boolean) {
  if (isActive && (!this.roles || this.roles.length === 0)) {
    return false;
  }
  return true;
}, 'Active memberships must have at least one role assigned');

// Ensure roles array contains unique values
tenantMembershipSchema.path('roles').validate(function(roles: string[]) {
  if (!Array.isArray(roles)) return false;
  
  const uniqueRoles = new Set(roles);
  return uniqueRoles.size === roles.length;
}, 'Roles array cannot contain duplicate values');

// Handle Next.js development mode where models may be compiled multiple times
export const TenantMembership = mongoose.models.TenantMembership || mongoose.model<ITenantMembership>("TenantMembership", tenantMembershipSchema);
