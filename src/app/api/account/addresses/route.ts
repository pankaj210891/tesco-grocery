import { getAuthUser } from "@/lib/utils/apiAuth";
import { getAddresses, createAddress } from "@/services/address.service";
import type { Address } from "@/types";

export async function GET(req: Request) {
  const authUser = getAuthUser(req);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const addresses = await getAddresses(authUser.userId);
    return Response.json({ data: addresses });
  } catch (err) {
    console.error("[GET /api/account/addresses]", err);
    return Response.json({ error: "Failed to fetch addresses." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authUser = getAuthUser(req);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json() as Omit<Address, "_id" | "userId" | "createdAt">;
    const address = await createAddress(authUser.userId, body);
    return Response.json({ data: address }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/account/addresses]", err);
    return Response.json({ error: "Failed to create address." }, { status: 500 });
  }
}
