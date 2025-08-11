import { mongoose } from "../types";

export interface ITenant {
  _id?: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const tenantSchema = new mongoose.Schema<ITenant>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Create index for faster queries
tenantSchema.index({ name: 1 });

export const Tenant = mongoose.model<ITenant>("Tenant", tenantSchema);
