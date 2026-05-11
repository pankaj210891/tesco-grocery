import mongoose, { Schema, type Document } from "mongoose";

const OpeningHoursSchema = new Schema(
  {
    open:   { type: String, required: true },
    close:  { type: String, required: true },
    closed: { type: Boolean, default: false },
  },
  { _id: false }
);

const StoreSchema = new Schema(
  {
    name:     { type: String, required: true },
    address:  { type: String, required: true },
    city:     { type: String, required: true },
    postcode: { type: String, required: true },
    phone:    { type: String, required: true },
    email:    String,
    openingHours: {
      monday:    OpeningHoursSchema,
      tuesday:   OpeningHoursSchema,
      wednesday: OpeningHoursSchema,
      thursday:  OpeningHoursSchema,
      friday:    OpeningHoursSchema,
      saturday:  OpeningHoursSchema,
      sunday:    OpeningHoursSchema,
    },
    amenities: [{ type: String }],
    isActive:  { type: Boolean, default: true },
    lat:       Number,
    lng:       Number,
  },
  { timestamps: true }
);

export interface IDayHours {
  open:   string;
  close:  string;
  closed: boolean;
}

export interface IStore extends Document {
  name:     string;
  address:  string;
  city:     string;
  postcode: string;
  phone:    string;
  email?:   string;
  openingHours: {
    monday:    IDayHours;
    tuesday:   IDayHours;
    wednesday: IDayHours;
    thursday:  IDayHours;
    friday:    IDayHours;
    saturday:  IDayHours;
    sunday:    IDayHours;
  };
  amenities: string[];
  isActive:  boolean;
  lat?:      number;
  lng?:      number;
}

const Store =
  (mongoose.models.Store as mongoose.Model<IStore>) ??
  mongoose.model<IStore>("Store", StoreSchema);

export default Store;
