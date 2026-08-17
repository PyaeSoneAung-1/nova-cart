import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";

const app = createApp();

async function main() {
  try {
    await prisma.$connect();
    // eslint-disable-next-line no-console
    console.log(`✅ Connected to PostgreSQL`);

    app.listen(env.PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`🚀 NovaCart API listening on http://localhost:${env.PORT}/api/v1`);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

main();

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
