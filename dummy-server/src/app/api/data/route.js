

import { state, addLog } from "@/lib/state";
import { checkRequest } from "@/lib/middleware";
import { detectLog4Shell, extractJNDIUrl } from "@/lib/log4shellDetector";
import { fireLog4ShellAlert } from "@/lib/log4shellAlertFirer";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const sourceIP =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  
  const log4shellResult = detectLog4Shell(req.headers);

  if (log4shellResult.detected) {
    state.log4shellAttempts++;
    state.log4shellAttemptsByIP[sourceIP] =
      (state.log4shellAttemptsByIP[sourceIP] || 0) + 1;

    const jndiUrl = extractJNDIUrl(
      log4shellResult.matches[0]?.value || ""
    );

    addLog("ERROR",
      `LOG4SHELL ATTEMPT from ${sourceIP} | ` +
      `header: ${log4shellResult.matches[0]?.header} | ` +
      `payload: ${log4shellResult.matches[0]?.value?.substring(0, 100)} | ` +
      `jndi_url: ${jndiUrl || 'unknown'}`
    );

    
    
    if (state.log4shellAttemptsByIP[sourceIP] === 1) {
      fireLog4ShellAlert(sourceIP, log4shellResult, jndiUrl);
    }

    
    return Response.json(
      {
        error: "request blocked",
        reason: "malicious payload detected in headers"
      },
      { status: 400 }
    );
  }

  
  const blocked = checkRequest(req);
  if (blocked) return blocked;

  return Response.json({
    message: "ok",
    timestamp: new Date().toISOString(),
    requestsServed: state.totalRequests,
  });
}
