/**
 * Captures a full-page screenshot of the current Chrome tab via CDP.
 * Usage: node capture.mjs <output-file> [quality]
 */
import { writeFileSync } from "fs";

const OUT = process.argv[2];
const QUALITY = Number(process.argv[3] ?? 80);

const targets = await (await fetch("http://127.0.0.1:9222/json")).json();
const page = targets.find((t) => t.type === "page");
if (!page) throw new Error("No page target found");

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});

let id = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
};

function send(method, params = {}) {
  return new Promise((resolve) => {
    const msgId = ++id;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}

// Full-page capture: get layout metrics, resize, capture, restore.
await send("Page.enable");
const { result: metrics } = await send("Page.getLayoutMetrics");
const { width, height } = metrics.cssVisualViewport;
const fullHeight = Math.max(metrics.cssContentSize.height, height);

await send("Emulation.setDeviceMetricsOverride", {
  width,
  height: Math.ceil(fullHeight),
  deviceScaleFactor: 1,
  mobile: false,
});
await new Promise((r) => setTimeout(r, 600));

const { result } = await send("Page.captureScreenshot", { format: "jpeg", quality: QUALITY, captureBeyondViewport: true });
await send("Emulation.clearDeviceMetricsOverride");

writeFileSync(OUT, Buffer.from(result.data, "base64"));
console.log(`saved ${OUT} (${width}x${Math.ceil(fullHeight)})`);
ws.close();
