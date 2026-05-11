import mongoose, { Schema, type InferSchemaType } from "mongoose";

const VendorSchema = new Schema(
  {
    name:        { type: String, required: true, trim: true },
    slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    logo:        { type: String, default: "" },
    email:       { type: String, required: true, lowercase: true, trim: true },
    phone:       { type: String, default: "" },
    address:     { type: String, default: "" },
    city:        { type: String, default: "" },
    status:      { type: String, enum: ["pending", "active", "suspended"], default: "pending" },
    ownerId:     { type: Schema.Types.ObjectId, ref: "User", required: true },
    ownerName:   { type: String, required: true },
  },
  { timestamps: true }
);

VendorSchema.index({ ownerId: 1 });
VendorSchema.index({ status: 1 });

export type VendorDoc = InferSchemaType<typeof VendorSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const VendorModel =
  (mongoose.models.Vendor as mongoose.Model<VendorDoc>) ||
  mongoose.model<VendorDoc>("Vendor", VendorSchema);

export default VendorModel;
