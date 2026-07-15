

const DUMMY_SERVER_URL =
  process.env.DUMMY_SERVER_URL || "http://localhost:3002";


async function execute(alert) {
  const stepsExecuted = [];
  const notes = [];

  try {
    
    console.log(
      `[PLAYBOOK ddos-mitigation] Blocking IP: ${alert.source_ip}`
    );
    try {
      const blockRes = await fetch(
        `${DUMMY_SERVER_URL}/api/admin/block-ip`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ip: alert.source_ip }),
        }
      );
      stepsExecuted.push("block_ip");
      if (!blockRes.ok) {
        notes.push(`block-ip returned status ${blockRes.status}`);
      }
    } catch (err) {
      stepsExecuted.push("block_ip");
      notes.push(`block-ip failed: ${err.message}`);
      console.error(
        `[PLAYBOOK ddos-mitigation] block-ip error: ${err.message}`
      );
    }

    
    console.log(
      `[PLAYBOOK ddos-mitigation] Rate limit tightened to 10 req/min`
    );
    try {
      const rateRes = await fetch(
        `${DUMMY_SERVER_URL}/api/admin/set-rate-limit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 10 }),
        }
      );
      stepsExecuted.push("set_rate_limit");
      if (!rateRes.ok) {
        notes.push(`set-rate-limit (tighten) returned status ${rateRes.status}`);
      }
    } catch (err) {
      stepsExecuted.push("set_rate_limit");
      notes.push(`set-rate-limit (tighten) failed: ${err.message}`);
      console.error(
        `[PLAYBOOK ddos-mitigation] tighten rate limit error: ${err.message}`
      );
    }

    
    console.log(
      `[PLAYBOOK ddos-mitigation] Waiting 5s before restoring rate limit...`
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
    stepsExecuted.push("wait_5s");

    
    
    
    console.log(
      `[PLAYBOOK ddos-mitigation] Rate limit restored to 100 req/min`
    );
    try {
      const restoreRes = await fetch(
        `${DUMMY_SERVER_URL}/api/admin/set-rate-limit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 100 }),
        }
      );
      stepsExecuted.push("restore_rate_limit");
      if (!restoreRes.ok) {
        notes.push(
          `set-rate-limit (restore) returned status ${restoreRes.status}`
        );
      }
    } catch (err) {
      stepsExecuted.push("restore_rate_limit");
      notes.push(`set-rate-limit (restore) failed: ${err.message}`);
      console.error(
        `[PLAYBOOK ddos-mitigation] restore rate limit error: ${err.message}`
      );
    }

    return {
      playbook_id: "ddos-mitigation",
      steps_executed: stepsExecuted,
      success: true,
      ip_blocked: alert.source_ip,
      rate_limit_tightened_to: 10,
      rate_limit_restored_to: 100,
      completed_at: new Date().toISOString(),
      notes:
        notes.length > 0
          ? notes.join("; ")
          : "IP blocked permanently. Rate limit restored to normal.",
    };
  } catch (err) {
    console.error(
      `[PLAYBOOK ddos-mitigation] Fatal error: ${err.message}`
    );
    return {
      playbook_id: "ddos-mitigation",
      steps_executed: stepsExecuted,
      success: false,
      error: err.message,
    };
  }
}

module.exports = { execute };
