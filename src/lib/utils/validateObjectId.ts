import mongoose from "mongoose";
import { NextResponse } from "next/server";

/**
 * Type-safe guard that confirms an unknown value is a valid MongoDB ObjectId string.
 * Use this instead of calling mongoose.Types.ObjectId.isValid() directly so the
 * check is consistent across all routes.
 */
export function isValidObjectId(id: unknown): id is string {
  return typeof id === "string" && mongoose.Types.ObjectId.isValid(id);
}

/**
 * Returns a pre-built 400 NextResponse for an invalid ObjectId.
 * Keeps error message format consistent across all routes.
 *
 * @param field  Human-readable field name shown in the error (default: "ID")
 */
export function objectIdError(field = "ID"): NextResponse {
  return NextResponse.json(
    { success: false, error: `Invalid ${field} format` },
    { status: 400 }
  );
}
