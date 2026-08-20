/**
 * One-off script: re-hash the demo accounts' passwords at the current
 * SALT_ROUNDS (cost 10). bcrypt.compare uses the cost embedded in the
 * stored hash, so users created while SALT_ROUNDS was 12 still pay the
 * slow cost-12 verify until their hash is refreshed.
 *
 * Usage:
 *   DATABASE_URL="postgres://..." npx tsx scripts/rehash-demo-passwords.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_ACCOUNTS = [
  { email: "admin@novacart.dev", password: "Admin@1234" },
  { email: "customer@novacart.dev", password: "Customer@1234" },
  { email: "aung@example.com", password: "Customer@1234" },
];

async function main() {
  for (const account of DEMO_ACCOUNTS) {
    const hash = await bcrypt.hash(account.password, 10);
    const result = await prisma.user.updateMany({
      where: { email: account.email },
      data: { password: hash },
    });
    console.log(
      `${account.email}: ${result.count > 0 ? "re-hashed at cost 10" : "NOT FOUND"}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
