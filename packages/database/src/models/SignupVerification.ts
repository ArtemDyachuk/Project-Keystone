import { Schema, model, Document, Types } from "mongoose";

export interface ISignupVerification extends Document {
  token: string;
  email: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  type: "signup" | "invite";
  invitedBy?: string;
  tenantId?: Types.ObjectId; // Reference to Tenants collection
  roles?: string[];
  expiresAt: Date;
  createdAt: Date;
}

const SignupVerificationSchema = new Schema<ISignupVerification>({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  email: {
    type: String,
    required: true,
    index: true,
  },
  companyName: {
    type: String,
    required: false, // Only for signup type
  },
  firstName: {
    type: String,
    required: false, // Only for invite type
  },
  lastName: {
    type: String,
    required: false, // Only for invite type
  },
  type: {
    type: String,
    required: true,
    enum: ["signup", "invite"],
    index: true,
  },
  invitedBy: {
    type: String,
    required: false, // Only for invite type
  },
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: "Tenant",
    required: false, // For both signup and invite types
    index: true,
  },
  roles: {
    type: [String],
    required: false, // Only for invite type
    default: ["Tenant:Reader"],
  },
  expiresAt: {
    type: Date,
    required: true,
    expires: 15 * 60, // 15 minutes TTL
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient queries
SignupVerificationSchema.index({ token: 1, type: 1 });
SignupVerificationSchema.index({ email: 1, type: 1 });
SignupVerificationSchema.index({ tenantId: 1, type: 1 }); // Add tenant separation index

export const SignupVerification = model<ISignupVerification>(
  "SignupVerification",
  SignupVerificationSchema
);
