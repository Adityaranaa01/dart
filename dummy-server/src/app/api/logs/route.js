

import { state } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET() {
  const recentLogs = state.logs.slice(-100);
  return Response.json(recentLogs);
}
