import { mongoose } from "../types";

export interface ICorporation {
  _id?: string;
  name: string;
  tenantId: string; // Reference to the tenant this corporation belongs to
  createdAt?: Date;
  updatedAt?: Date;
}

const corporationSchema = new mongoose.Schema<ICorporation>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Create indexes for faster queries
corporationSchema.index({ tenantId: 1, name: 1 });

// Handle Next.js development mode where models may be compiled multiple times
export const Corporation = mongoose.models.Corporation || mongoose.model<ICorporation>("Corporation", corporationSchema);
