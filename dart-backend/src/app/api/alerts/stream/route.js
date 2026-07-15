

import { addClient, removeClient } from "@/lib/sseManager";

export const dynamic = "force-dynamic";

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      
      addClient(controller);

      
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(": connected\n\n"));
    },
    cancel(controller) {
      
      removeClient(controller);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
