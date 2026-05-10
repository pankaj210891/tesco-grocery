import mongoose, { Schema, type InferSchemaType } from "mongoose";

const AddressSchema = new Schema(
  {
    userId:      { type: Schema.Types.ObjectId, ref: "User", required: true },
    label:       { type: String, enum: ["Home", "Office", "Other"], required: true },
    customLabel: { type: String },
    fullName:    { type: String, required: true, trim: true },
    phone:       { type: String, required: true, trim: true },
    line1:       { type: String, required: true, trim: true },
    line2:       { type: String, trim: true },
    city:        { type: String, required: true, trim: true },
    postcode:    { type: String, required: true, trim: true, uppercase: true },
    country:     { type: String, required: true, default: "United Kingdom" },
    isDefault:   { type: Boolean, default: false },
  },
  { timestamps: true }
);

AddressSchema.index({ userId: 1 });

export type AddressDoc = InferSchemaType<typeof AddressSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const AddressModel =
  (mongoose.models.Address as mongoose.Model<AddressDoc>) ||
  mongoose.model<AddressDoc>("Address", AddressSchema);

export default AddressModel;
