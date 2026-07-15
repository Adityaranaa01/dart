

const fs = require("fs/promises");
const path = require("path");




const DATA_DIR = path.resolve(process.cwd(), "src", "data");
const ALERTS_FILE = path.join(DATA_DIR, "alerts.json");


console.log(`[store] Alerts file path: ${ALERTS_FILE}`);


let locked = false;

async function acquireLock() {
  while (locked) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  locked = true;
}

function releaseLock() {
  locked = false;
}


async function ensureFile() {
  try {
    await fs.access(ALERTS_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(ALERTS_FILE, "[]", "utf-8");
  }
}


async function getAlerts() {
  await ensureFile();
  try {
    const raw = await fs.readFile(ALERTS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    console.error(`[store] Error reading alerts: ${err.message}`);
    return [];
  }
}


async function appendAlert(alert) {
  await acquireLock();
  try {
    await ensureFile();
    const raw = await fs.readFile(ALERTS_FILE, "utf-8");
    const alerts = JSON.parse(raw);
    alerts.push(alert);
    await fs.writeFile(ALERTS_FILE, JSON.stringify(alerts, null, 2), "utf-8");
    console.log(`[store] Alert ${alert.id} saved. Total: ${alerts.length}`);
  } catch (err) {
    console.error(`[store] Error writing alert: ${err.message}`);
  } finally {
    releaseLock();
  }
}

module.exports = { getAlerts, appendAlert };
