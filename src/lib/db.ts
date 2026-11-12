import "server-only";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";
import { connectionConfig } from "./db-config";

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
