

export async function register() {
  
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startDetector } = await import("./src/lib/anomalyDetector");
    startDetector();
    console.log("[instrumentation] Anomaly detector started.");
  }
}
