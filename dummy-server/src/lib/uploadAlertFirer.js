

import { state, addLog } from "./state.js";

const firedHashes = new Set();

export async function fireUploadAlert(sourceIP, uploadRecord) {
  if (firedHashes.has(uploadRecord.sha256)) return;
  firedHashes.add(uploadRecord.sha256);

  const DART_BACKEND_URL =
    process.env.DART_BACKEND_URL || "http://localhost:3001";

  const payload = {
    source_ip: sourceIP,
    alert_type: "malicious_upload",
    request_rate: state.requestsPerMinute,
    anomaly_detected: true,
    file_name: uploadRecord.file_name,
    file_size: uploadRecord.file_size,
    sha256: uploadRecord.sha256,
    eicar_detected: uploadRecord.eicar_detected,
    upload_id: uploadRecord.id,
    raw_logs: state.logs.slice(-20),
  };

  try {
    addLog("INFO",
      `Firing malicious upload alert to DART for IP: ${sourceIP} file: ${uploadRecord.file_name}`
    );
    const res = await fetch(
      `${DART_BACKEND_URL}/api/alerts/ingest`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    addLog("INFO", `DART alert response: ${res.status}`);
  } catch (err) {
    addLog("ERROR",
      `Failed to send upload alert to DART: ${err.message}`
    );
  }

  
  setTimeout(() => {
    firedHashes.delete(uploadRecord.sha256);
  }, 300000);
}
