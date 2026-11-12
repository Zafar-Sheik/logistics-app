/**
 * Turns DATABASE_URL into options for the MariaDB/MySQL driver used with TiDB.
 * Kept free of server-only imports so `npm run db:check` can reuse it.
 *
 * TLS: TiDB Cloud requires it, so it is switched on automatically for
 * *.tidbcloud.com hosts, or whenever the URL carries `sslaccept=strict`,
 * `ssl=true` or `sslmode=require|verify-*`.
 */
export function connectionConfig(raw = process.env.DATABASE_URL) {
  if (!raw) throw new Error("DATABASE_URL is not set. Add it to your .env file (see .env.example).");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL. If your password contains @ : / ? # or %, URL-encode those characters.");
  }
  const p = url.searchParams;
  const sslAccept = p.get("sslaccept");
  const sslMode = p.get("sslmode") ?? p.get("ssl-mode");
  const wantsTls =
    url.hostname.endsWith("tidbcloud.com") ||
    p.get("ssl") === "true" ||
    !!sslAccept ||
    (!!sslMode && !["disable", "disabled"].includes(sslMode.toLowerCase()));
  const relaxed = sslAccept === "accept_invalid_certs";
  const seconds = (key: string, fallback: number) => {
    const v = Number(p.get(key));
    return Number.isFinite(v) && v > 0 ? v * 1000 : fallback;
  };

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 4000,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    connectionLimit: Number(p.get("connection_limit") ?? 5),
    // The driver's default connect timeout is 1 second, which is too short for a
    // TLS handshake with a cloud database in another region.
    connectTimeout: seconds("connect_timeout", 20_000),
    acquireTimeout: seconds("pool_timeout", 30_000),
    // Drop idle connections before TiDB's gateway closes them on its side.
    idleTimeout: 240,
    ssl: wantsTls ? { rejectUnauthorized: !relaxed, minVersion: "TLSv1.2" as const } : undefined,
  };
}
