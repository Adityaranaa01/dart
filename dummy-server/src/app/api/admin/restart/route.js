

import { state, addLog } from "@/lib/state";

export async function POST() {
  state.blockedIPs = [];
  state.rateLimit = 100;
  state.status = "ok";
  state.requestsPerMinute = 0;

  const restoredAt = new Date().toISOString();

  addLog("INFO", "Server restored by DART playbook");
  console.log(`[admin] Server state restored at ${restoredAt}`);

  return Response.json({
    success: true,
    restoredAt,
  });
}
