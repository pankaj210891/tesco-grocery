import { clearAuthCookie } from "@/lib/utils/authCookie";

export async function POST(): Promise<Response> {
  const res = Response.json({ success: true });
  clearAuthCookie(res);
  return res;
}
