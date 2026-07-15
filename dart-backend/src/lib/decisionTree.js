


function selectPlaybook(alert) {
  const requestRate = alert.raw_alert?.request_rate || 0;
  const anomalyDetected = alert.raw_alert?.anomaly_detected || false;
  const abuseScore = alert.enrichment?.abuseipdb?.abuseConfidenceScore || 0;
  const gnClassification = alert.enrichment?.greynoise?.classification || "unknown";

  if (alert.alert_type === "log4shell_attempt") {
    
    
    
    return "log4shell-patch-isolate";
  }

  
  if (alert.alert_type === "malicious_upload") {
    const vtFile = alert.enrichment?.virustotal_file || {};
    if (
      vtFile.detection_rate > 50 ||
      vtFile.malicious > 10 ||
      alert.eicar_detected
    ) {
      return "file-quarantine";
    }
    if (vtFile.malicious > 0 || vtFile.suspicious > 5) {
      return "file-quarantine";
    }
    
    return null;
  }

  
  if (requestRate > 500 && (abuseScore > 50 || gnClassification === "malicious")) {
    return "ddos-mitigation";
  }

  
  if (abuseScore > 30 && gnClassification === "malicious") {
    return "ip-block";
  }

  
  if (requestRate > 200 && anomalyDetected === true) {
    return "rate-limit-escalation";
  }

  
  return null;
}

module.exports = { selectPlaybook };
