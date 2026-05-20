import { connectDB } from "@/lib/db/mongoose";
import CommissionConfigModel from "@/lib/db/models/commission-config.model";
import VendorModel from "@/lib/db/models/vendor.model";
import type { CommissionConfig } from "@/types";

export async function getConfig(): Promise<CommissionConfig> {
  await connectDB();

  const doc = await CommissionConfigModel.findById("singleton").lean();
  if (doc) {
    return {
      defaultRate: doc.defaultRate,
      vendorRates: (doc.vendorRates ?? []).map((r) => ({
        vendorId: String(r.vendorId),
        rate:     r.rate,
      })),
    };
  }

  // Bootstrap singleton on first call
  await CommissionConfigModel.create({ _id: "singleton", defaultRate: 10, vendorRates: [] });
  return { defaultRate: 10, vendorRates: [] };
}

export function getRateForVendor(vendorId: string | null | undefined, config: CommissionConfig): number {
  if (!vendorId) return 0;
  const override = config.vendorRates.find((r) => r.vendorId === vendorId);
  return override ? override.rate : config.defaultRate;
}

export async function updateConfig(data: {
  defaultRate?: number;
  vendorRates?: Array<{ vendorId: string; rate: number }>;
}): Promise<CommissionConfig> {
  await connectDB();

  const update: Record<string, unknown> = {};
  if (typeof data.defaultRate === "number") update.defaultRate = data.defaultRate;
  if (Array.isArray(data.vendorRates))        update.vendorRates = data.vendorRates;

  const doc = await CommissionConfigModel.findByIdAndUpdate(
    "singleton",
    { $set: update },
    { new: true, upsert: true, runValidators: true }
  ).lean();

  return {
    defaultRate: doc!.defaultRate,
    vendorRates: (doc!.vendorRates ?? []).map((r) => ({
      vendorId: String(r.vendorId),
      rate:     r.rate,
    })),
  };
}

export interface CommissionConfigWithNames {
  defaultRate:  number;
  vendorRates:  Array<{ vendorId: string; vendorName: string; rate: number }>;
  allVendors:   Array<{ vendorId: string; vendorName: string }>;
}

export async function getConfigWithVendorNames(): Promise<CommissionConfigWithNames> {
  await connectDB();

  const [config, vendors] = await Promise.all([
    getConfig(),
    VendorModel.find({ status: "active" }).select("_id name").lean<{ _id: { toString(): string }; name: string }[]>(),
  ]);

  const rateMap = new Map(config.vendorRates.map((r) => [r.vendorId, r.rate]));

  return {
    defaultRate: config.defaultRate,
    vendorRates: config.vendorRates.map((r) => {
      const vendor = vendors.find((v) => v._id.toString() === r.vendorId);
      return { vendorId: r.vendorId, vendorName: vendor?.name ?? r.vendorId, rate: r.rate };
    }),
    allVendors: vendors.map((v) => ({
      vendorId:   v._id.toString(),
      vendorName: v.name,
      hasOverride: rateMap.has(v._id.toString()),
    } as { vendorId: string; vendorName: string })),
  };
}
