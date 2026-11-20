// Local database tooling.
//   npm run db:setup   create .env + database if missing, apply migrations, seed if empty
//   npm run db:migrate apply pending migrations
//   npm run db:seed    insert sample events
//   npm run db:reset   drop + recreate the database, migrate, seed
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(serverRoot, ".env");

function ensureEnvFile() {
  if (fs.existsSync(envPath)) return;
  const template = fs.readFileSync(path.join(serverRoot, ".env.example"), "utf8");
  const secret = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(envPath, template.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`));
  console.log("Created server/.env (edit ADMIN_PASSWORD and scraping keys there)");
}

const command = process.argv[2] ?? "setup";
if (command === "setup" || command === "reset") ensureEnvFile();

// Imported after .env exists so config picks it up.
const { config } = await import("../src/config.ts");

const dbUrl = new URL(config.databaseUrl);
const dbName = decodeURIComponent(dbUrl.pathname.slice(1));
const adminUrl = new URL(config.databaseUrl);
adminUrl.pathname = "/postgres";

async function withClient<T>(url: string, fn: (c: pg.Client) => Promise<T>) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

const ident = (name: string) => `"${name.replace(/"/g, '""')}"`;

async function createDatabase() {
  await withClient(adminUrl.toString(), async (c) => {
    const { rowCount } = await c.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (!rowCount) {
      await c.query(`CREATE DATABASE ${ident(dbName)}`);
      console.log(`Created database ${dbName}`);
    }
  });
}

async function dropDatabase() {
  await withClient(adminUrl.toString(), async (c) => {
    await c.query(`DROP DATABASE IF EXISTS ${ident(dbName)} WITH (FORCE)`);
    console.log(`Dropped database ${dbName}`);
  });
}

async function migrate() {
  const dir = path.join(serverRoot, "db/migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  await withClient(config.databaseUrl, async (c) => {
    await c.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
    );
    const { rows } = await c.query<{ name: string }>("SELECT name FROM schema_migrations");
    const applied = new Set(rows.map((r) => r.name));
    for (const file of files.filter((f) => !applied.has(f))) {
      await c.query("BEGIN");
      try {
        await c.query(fs.readFileSync(path.join(dir, file), "utf8"));
        await c.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await c.query("COMMIT");
        console.log(`Applied ${file}`);
      } catch (e) {
        await c.query("ROLLBACK");
        throw new Error(`Migration ${file} failed: ${(e as Error).message}`);
      }
    }
  });
}

async function seed({ onlyIfEmpty }: { onlyIfEmpty: boolean }) {
  await withClient(config.databaseUrl, async (c) => {
    if (onlyIfEmpty) {
      const { rows } = await c.query("SELECT count(*)::int AS n FROM events");
      if (rows[0].n > 0) return;
    }
    await c.query(fs.readFileSync(path.join(serverRoot, "db/seed.sql"), "utf8"));
    console.log("Seeded sample events");
  });
}

try {
  switch (command) {
    case "setup":
      await createDatabase();
      await migrate();
      await seed({ onlyIfEmpty: true });
      break;
    case "migrate":
      await migrate();
      break;
    case "seed":
      await seed({ onlyIfEmpty: false });
      break;
    case "reset":
      await dropDatabase();
      await createDatabase();
      await migrate();
      await seed({ onlyIfEmpty: false });
      break;
    default:
      throw new Error(`Unknown command "${command}" (use setup | migrate | seed | reset)`);
  }
  console.log(`Database ${dbName} is ready.`);
} catch (e) {
  const err = e as NodeJS.ErrnoException;
  if (err.code === "ECONNREFUSED") {
    console.error(`Could not connect to Postgres at ${dbUrl.host}. Is it running? (brew services start postgresql@14)`);
  } else {
    console.error(err.message);
  }
  process.exit(1);
}
