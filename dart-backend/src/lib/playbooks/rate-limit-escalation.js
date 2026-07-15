

const DUMMY_SERVER_URL =
  process.env.DUMMY_SERVER_URL || "http://localhost:3002";


async function execute(alert) {
  const stepsExecuted = [];
  let success = true;
  const notes = [];

  try {
    
    const rateRes = await fetch(
      `${DUMMY_SERVER_URL}/api/admin/set-rate-limit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 50 }),
      }
    );
    stepsExecuted.push("set_rate_limit");
    if (!rateRes.ok) {
      notes.push(`set-rate-limit returned status ${rateRes.status}`);
    }
  } catch (err) {
    stepsExecuted.push("set_rate_limit");
    notes.push(`set-rate-limit failed: ${err.message}`);
    success = false;
  }

  
  stepsExecuted.push("flag_for_review");
  notes.push("Alert flagged for analyst review.");

  return {
    playbook_id: "rate-limit-escalation",
    steps_executed: stepsExecuted,
    success,
    restored_at: new Date().toISOString(),
    notes: notes.join("; "),
  };
}

module.exports = { execute };
