import "server-only";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Builds driver options from DATABASE_URL.
 *
 * TiDB Cloud requires TLS, so it is switched on automatically for
 * *.tidbcloud.com hosts, or whenever the URL carries `sslaccept=strict`,
 * `ssl=true` or `sslmode=require|verify-*`.
 */
function connectionConfig() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set. Add it to your environment (see .env.example).");
  const url = new URL(raw);
  const p = url.searchParams;
  const sslAccept = p.get("sslaccept");
  const sslMode = p.get("sslmode") ?? p.get("ssl-mode");
  const wantsTls =
    url.hostname.endsWith("tidbcloud.com") ||
    p.get("ssl") === "true" ||
    !!sslAccept ||
    (!!sslMode && !["disable", "disabled"].includes(sslMode.toLowerCase()));
  const relaxed = sslAccept === "accept_invalid_certs";
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 4000,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    connectionLimit: Number(p.get("connection_limit") ?? 5),
    ssl: wantsTls ? { rejectUnauthorized: !relaxed, minVersion: "TLSv1.2" as const } : undefined,
  };
}

function createClient() {
  return new PrismaClient({ adapter: new PrismaMariaDb(connectionConfig()) });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function client() {
  return (globalForPrisma.prisma ??= createClient());
}

/** Lazily-created Prisma client, so builds do not need a live database. */
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const c = client();
    const value = Reflect.get(c, prop, c);
    return typeof value === "function" ? value.bind(c) : value;
  },
});

export type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
