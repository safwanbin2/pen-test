import "dotenv/config";
import { db } from "../src/lib/db";

async function main() {
  const rows = await db.$queryRaw<{ db: string }[]>`select current_database() as db`;
  console.log("connected to", rows[0].db);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
