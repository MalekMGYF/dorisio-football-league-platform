import { getSessionUser } from "@/lib/auth";
import { jsonError, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();
    return ok({ user });
  } catch (error) {
    return jsonError(error);
  }
}
