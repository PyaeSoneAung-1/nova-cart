import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";

const app = createApp();

async function main() {
  // Listen immediately so container/serverless boot stays fast; Prisma
  // connects lazily on the first query (and reports here in the background).
  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 NovaCart API listening on http://localhost:${env.PORT}/api/v1`);
    prisma
      .$connect()
      .then(() => {
        // eslint-disable-next-line no-console
        console.log(`✅ Connected to PostgreSQL`);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("❌ Failed to connect to PostgreSQL:", err);
      });
  });
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
