import mongoose, { Schema, type InferSchemaType } from "mongoose";

const VendorRateSchema = new Schema(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    rate:     { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false }
);

// Singleton — only one document lives in this collection (upserted by _id: "singleton")
const CommissionConfigSchema = new Schema(
  {
    _id:         { type: String, default: "singleton" },
    defaultRate: { type: Number, required: true, min: 0, max: 100, default: 10 },
    vendorRates: { type: [VendorRateSchema], default: [] },
  },
  { _id: false, timestamps: true }
);

export type CommissionConfigDoc = InferSchemaType<typeof CommissionConfigSchema> & {
  updatedAt: Date;
};

const CommissionConfigModel =
  (mongoose.models.CommissionConfig as mongoose.Model<CommissionConfigDoc>) ||
  mongoose.model<CommissionConfigDoc>("CommissionConfig", CommissionConfigSchema);

export default CommissionConfigModel;
