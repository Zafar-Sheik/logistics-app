/**
 * Tests the DATABASE_URL in .env and explains what is wrong if it fails.
 * Run with:  npm run db:check
 */
import "dotenv/config";
import mariadb, { type Connection } from "mariadb";
import { connectionConfig } from "../src/lib/db-config";

const HINTS: [RegExp, string][] = [
  [/ER_ACCESS_DENIED|Access denied/i, "Wrong username or password. On TiDB Cloud Serverless the username includes a prefix, e.g. 4abcXYZ.root, copied from the Connect dialog. If the password has @ : / ? # or %, URL-encode those characters."],
  [/ER_BAD_DB_ERROR|Unknown database/i, "The database name at the end of DATABASE_URL does not exist. Create it (CREATE DATABASE haulbook;) or run database/create-database.sql."],
  [/ER_NO_SUCH_TABLE|doesn't exist/i, "Connected, but the tables are missing. Run database/create-database.sql in TiDB, or run: npm run db:deploy"],
  [/ETIMEDOUT|ER_CONNECTION_TIMEOUT|timeout/i, "Could not reach the server in time. Check the host and port (TiDB Cloud uses 4000), that your cluster is running, and that a firewall or VPN is not blocking port 4000. Some office and mobile networks block it."],
  [/ENOTFOUND|EAI_AGAIN/i, "The host name could not be found. Copy the host exactly from TiDB Cloud's Connect dialog."],
  [/ECONNREFUSED/i, "The server refused the connection. Check the host and port."],
  [/ECONNRESET|socket hang up/i, "The connection was dropped. On TiDB Cloud, check the IP access list under Networking allows your IP (or 0.0.0.0/0 for testing)."],
  [/certificate|self.signed|CERT_|SSL|TLS/i, "TLS problem. For TiDB Cloud keep ?sslaccept=strict on the URL. If you use a corporate proxy that intercepts TLS, try another network."],
  [/insecure transport|require.*secure/i, "The server requires TLS. Add ?sslaccept=strict to the end of DATABASE_URL."],
];

async function main() {
  let cfg: ReturnType<typeof connectionConfig>;
  try {
    cfg = connectionConfig();
  } catch (e) {
    console.error(`\n✖ ${(e as Error).message}\n`);
    process.exit(1);
  }
  console.log(`\nConnecting to ${cfg.host}:${cfg.port} as "${cfg.user}", database "${cfg.database || "(none)"}", TLS ${cfg.ssl ? "on" : "off"}…`);
  const started = Date.now();
  let conn: Connection | undefined;
  try {
    conn = await mariadb.createConnection({ host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password, database: cfg.database, connectTimeout: cfg.connectTimeout, ssl: cfg.ssl });
    console.log(`✔ Connected in ${Date.now() - started} ms`);
    const [v] = await conn.query("SELECT VERSION() AS v");
    console.log(`  Server: ${v.v}`);
    const trips: number[] = [];
    for (let i = 0; i < 5; i++) {
      const t = performance.now();
      await conn.query("SELECT 1");
      trips.push(performance.now() - t);
    }
    const rtt = Math.round(trips.sort((a, b) => a - b)[2]);
    console.log(`  Round trip: ${rtt} ms per query`);
    if (rtt > 120) {
      console.log(`  Note: each page needs about one round trip, so pages will take roughly ${rtt + 50}–${rtt * 2 + 50} ms.`);
      console.log("        For faster pages, create your TiDB cluster in the region closest to you.");
    }
    const tables: { t: string }[] = await conn.query("SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE()");
    const names = tables.map((r) => r.t);
    const needed = ["User", "Company", "Contact", "Load", "Document", "DocumentLine", "Bill", "Payment", "Expense", "Attachment"];
    const missing = needed.filter((n) => !names.includes(n));
    if (missing.length) {
      console.log(`✖ Missing tables: ${missing.join(", ")}`);
      console.log("  Run database/create-database.sql in TiDB, or run: npm run db:deploy\n");
      process.exitCode = 1;
    } else {
      const [u] = await conn.query("SELECT COUNT(*) AS n FROM `User`");
      console.log(`✔ All ${needed.length} tables found (${u.n} user${Number(u.n) === 1 ? "" : "s"}). The database is ready.\n`);
    }
  } catch (e) {
    const err = e as { message?: string; code?: string; errno?: number };
    const text = `${err.code ?? ""} ${err.message ?? e}`;
    console.error(`✖ Failed after ${Date.now() - started} ms`);
    console.error(`  ${err.code ? `[${err.code}] ` : ""}${err.message ?? e}`);
    const hint = HINTS.find(([re]) => re.test(text));
    if (hint) console.error(`\n  What to do: ${hint[1]}\n`);
    process.exitCode = 1;
  } finally {
    await conn?.end().catch(() => {});
  }
}

main();
