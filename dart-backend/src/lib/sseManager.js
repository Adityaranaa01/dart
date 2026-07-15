


const sseClients = [];


function addClient(controller) {
  sseClients.push(controller);
  console.log(`[SSE] Client connected. Total clients: ${sseClients.length}`);
}


function removeClient(controller) {
  const index = sseClients.indexOf(controller);
  if (index !== -1) {
    sseClients.splice(index, 1);
  }
  console.log(`[SSE] Client disconnected. Total clients: ${sseClients.length}`);
}


function broadcastAlert(alert) {
  const payload = `data: ${JSON.stringify(alert)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(payload);

  for (const controller of sseClients) {
    try {
      controller.enqueue(encoded);
    } catch (err) {
      
      console.error("[SSE] Failed to send to client:", err.message);
      removeClient(controller);
    }
  }
}


function getClientCount() {
  return sseClients.length;
}

module.exports = { addClient, removeClient, broadcastAlert, getClientCount };
