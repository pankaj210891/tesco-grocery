import mongoose, { Schema, type InferSchemaType } from "mongoose";

const VendorInviteSchema = new Schema(
  {
    email:        { type: String, required: true, lowercase: true, trim: true },
    businessName: { type: String, required: true, trim: true },
    contactName:  { type: String, required: true, trim: true },
    token:        { type: String, required: true, unique: true },
    status:       { type: String, enum: ["pending", "accepted", "expired"], default: "pending" },
    expiresAt:    { type: Date, required: true },
    invitedBy:    { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

VendorInviteSchema.index({ token: 1 });
VendorInviteSchema.index({ email: 1 });
VendorInviteSchema.index({ status: 1 });
VendorInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type VendorInviteDoc = InferSchemaType<typeof VendorInviteSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const VendorInviteModel =
  (mongoose.models.VendorInvite as mongoose.Model<VendorInviteDoc>) ||
  mongoose.model<VendorInviteDoc>("VendorInvite", VendorInviteSchema);

export default VendorInviteModel;
