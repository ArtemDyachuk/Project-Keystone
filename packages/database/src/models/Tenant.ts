import { mongoose } from "../types";

export interface ITenant {
  _id?: string;
  name: string;
  firebaseTenantId?: string; // Firebase Auth tenant ID
  createdAt?: Date;
  updatedAt?: Date;
}

const tenantSchema = new mongoose.Schema<ITenant>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  firebaseTenantId: {
    type: String,
    required: false,
    trim: true
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Create index for faster queries
tenantSchema.index({ name: 1 });

// Handle Next.js development mode where models may be compiled multiple times
export const Tenant = mongoose.models.Tenant || mongoose.model<ITenant>("Tenant", tenantSchema);
