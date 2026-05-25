import mongoose, { Schema, type InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    name:                 { type: String, required: true, trim: true },
    email:                { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:             { type: String, required: true },
    role:                 { type: String, enum: ["customer", "vendor", "admin"], default: "customer" },
    status:               { type: String, enum: ["active", "suspended"], default: "active" },
    // Extended profile fields
    phone:                { type: String, default: null },
    isPhoneVerified:      { type: Boolean, default: false },
    dietaryPreferences:   { type: [String], default: [] },
    marketingPreference:  { type: String, enum: ["email_digital_post", "digital_post_only", "unsubscribed"], default: null },
    hearFromBrands:       { type: Boolean, default: false },
    passwordResetToken:   { type: String, default: null },
    passwordResetExpires: { type: Date,   default: null },
    // Phone OTP verification
    phoneOtp:             { type: String, default: null },
    phoneOtpExpires:      { type: Date,   default: null },
    phoneOtpAttempts:     { type: Number, default: 0 },
    phoneOtpLastSent:     { type: Date,   default: null },
  },
  { timestamps: true }
);

// Indexes for admin filtering / sorting
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ name: 1 });
// Keyset pagination: _id tiebreaker for seek-based queries
UserSchema.index({ createdAt: -1, _id: -1 });
UserSchema.index({ name: 1, _id: 1 });
UserSchema.index({ name: -1, _id: -1 });

export type UserDoc = InferSchemaType<typeof UserSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

// In development, hot-reload re-executes this module but mongoose.models.User
// persists across reloads (serverExternalPackages keeps Mongoose alive).
// Delete the stale model so the current schema is always used.
if (process.env.NODE_ENV !== "production") {
  delete (mongoose.models as Record<string, unknown>).User;
}

const UserModel =
  (mongoose.models.User as mongoose.Model<UserDoc>) ||
  mongoose.model<UserDoc>("User", UserSchema);

export default UserModel;
