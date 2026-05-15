import mongoose, { Schema, type InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    name:                 { type: String, required: true, trim: true },
    email:                { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:             { type: String, required: true },
    role:                 { type: String, enum: ["customer", "vendor", "admin"], default: "customer" },
    status:               { type: String, enum: ["active", "suspended"], default: "active" },
    passwordResetToken:   { type: String, default: null },
    passwordResetExpires: { type: Date,   default: null },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const UserModel =
  (mongoose.models.User as mongoose.Model<UserDoc>) ||
  mongoose.model<UserDoc>("User", UserSchema);

export default UserModel;
