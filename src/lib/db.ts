import "server-only";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";
import { connectionConfig } from "./db-config";

function createClient() {
  const cfg = connectionConfig();
  return new PrismaClient({
    adapter: new PrismaMariaDb(cfg),
    // Prisma's defaults (2s to get a connection, 5s to finish) are too tight for a
    // cloud database in another region: opening a TLS connection alone can take longer.
    transactionOptions: { maxWait: cfg.acquireTimeout, timeout: 60_000 },
  });
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
