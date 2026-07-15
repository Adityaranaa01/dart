

import { state, addLog, addSourceIP } from "./state";


let windowStart = Date.now();
let windowCount = 0;


setInterval(() => {
  state.requestsPerMinute = windowCount;
  windowCount = 0;
  windowStart = Date.now();
}, 60_000);


setInterval(() => {
  const elapsed = (Date.now() - windowStart) / 1000;
  if (elapsed > 0) {
    state.requestsPerMinute = Math.round((windowCount / elapsed) * 60);
  }
}, 5_000);


export function getClientIP(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}


export function checkRequest(request) {
  const ip = getClientIP(request);

  
  if (state.blockedIPs.includes(ip)) {
    addLog("ERROR", `Blocked request from banned IP: ${ip}`);
    return Response.json(
      { error: "Forbidden — IP is blocked", ip },
      { status: 403 }
    );
  }

  
  windowCount++;
  state.totalRequests++;
  addSourceIP(ip);

  
  const elapsed = (Date.now() - windowStart) / 1000;
  const currentRPM = elapsed > 2 ? Math.round((windowCount / elapsed) * 60) : windowCount;
  state.requestsPerMinute = currentRPM;

  if (currentRPM > state.rateLimit) {
    state.status = "degraded";
    addLog("WARN", `Rate limit exceeded: ${currentRPM} req/min (limit: ${state.rateLimit}) from ${ip}`);
    return Response.json(
      { error: "Too Many Requests", requestsPerMinute: currentRPM, rateLimit: state.rateLimit },
      { status: 429 }
    );
  }

  
  addLog("INFO", `Request from ${ip} — ${request.method} ${new URL(request.url).pathname}`);
  return null;
}
