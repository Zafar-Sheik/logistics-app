# Deployment guide

Haulbook is a standard Next.js 16 application. It runs on Vercel or any Node.js 20.19+ host, with TiDB as the database.

## 1. Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Your TiDB connection string, e.g. `mysql://USER:PASSWORD@HOST:4000/DATABASE?sslaccept=strict` |
| `AUTH_SECRET` | Yes | Random string of 32+ characters used to sign login sessions. Generate with `openssl rand -base64 32` |
| `APP_TIMEZONE` | No | Time zone for "today" and overdue checks. Default `Africa/Johannesburg` |

Notes on the connection string:

- In TiDB Cloud, click **Connect**, choose **Prisma** (or General) and copy the URL. Replace the password placeholder.
- TLS is enabled automatically for `*.tidbcloud.com` hosts. For any other host that requires TLS, add `?sslaccept=strict` to the URL.
- If the username or password contains special characters (`@ : / ? #`), URL-encode them.
- Create the database first if it does not exist (`CREATE DATABASE haulbook;`), or use the default one in your cluster.

Never commit `.env`. It is git-ignored.

## 2. Create the tables

Run once, from your computer, with `DATABASE_URL` set in `.env`:

```bash
npm install
```

```bash
npm run db:deploy
```

This applies the SQL in `prisma/migrations`. It is safe to run again; it only applies what is new. Run it again after pulling an update that includes a new migration.

### Alternative: paste a SQL script into TiDB

If you would rather create the database by hand, open `database/create-database.sql`, paste it into the TiDB Cloud SQL Editor (or any MySQL client) and run it. It creates a database called `haulbook` and all ten tables, so your `DATABASE_URL` must end in `/haulbook`.

If you use the script, skip `npm run db:deploy`. Instead run this once, so future updates know the tables already exist:

```bash
npx prisma migrate resolve --applied 20261112000000_init
```

### Check the connection

```bash
npm run db:check
```

This connects with the `DATABASE_URL` in `.env`, confirms all ten tables exist, and if anything is wrong it shows the real error and what to do about it (wrong password, missing `prefix.` in the TiDB Serverless username, unknown database, blocked port 4000, TLS problems).

## 3. Deploy

### Vercel (recommended)

1. Import the GitHub repository in Vercel.
2. Add `DATABASE_URL`, `AUTH_SECRET` and (optionally) `APP_TIMEZONE` under Project → Settings → Environment Variables.
3. Deploy. The build command (`npm run build`) generates the Prisma client automatically.
4. Pick a Vercel region close to your TiDB cluster for the fastest pages.

### Any Node.js server

```bash
npm ci
```

```bash
npm run build
```

```bash
npm start
```

Serve it behind HTTPS (the session cookie is marked `Secure` in production).

## 4. First run

1. Open your site. You are taken to **/setup**.
2. Create the owner account and company. Do this straight after deploying: the setup page is open to whoever reaches it first, and closes permanently once the first account exists.
3. Follow the Getting started checklist on the Home screen: logo, banking details, first customer.

## 5. Install on phones

Open the site on the phone, then:

- **iPhone (Safari):** Share → Add to Home Screen
- **Android (Chrome):** ⋮ → Add to Home screen / Install app

## Backups

Your data lives in TiDB. TiDB Cloud takes automatic backups; check the retention period for your tier under Cluster → Backup. You can also export every list to CSV from Reports → Export your data.

## Troubleshooting

**`pool failed to retrieve a connection from pool (pool connections: active=0 idle=0 limit=5)`**
The app could not open any connection to TiDB. Run `npm run db:check` to see the underlying reason. Common causes:

- Username missing its prefix. TiDB Cloud Serverless usernames look like `4abcXYZ.root`.
- Special characters in the password not URL-encoded.
- The database name at the end of the URL does not exist.
- Port 4000 blocked by an office, school or mobile network, or a VPN.
- Your IP not allowed in the cluster's Networking settings (dedicated clusters).

Connections time out after 20 seconds and the pool waits up to 30 seconds. To change these, add `connect_timeout` or `pool_timeout` (in seconds) to the URL, e.g. `...?sslaccept=strict&connect_timeout=30`.

## Technical notes

- `relationMode = "prisma"` is used, so no database foreign keys are required and the schema works on every TiDB tier.
- Logos and load attachments (PODs) are stored in the database, so no separate file storage is needed. Attachments are limited to 4 MB each and photos are compressed in the browser before upload.
- All pages render on demand; nothing business-related is cached or statically generated.
- This build was tested end-to-end against a local MySQL-compatible database (MariaDB). It has not yet been run against your TiDB cluster, so do a quick pass through the flow after your first deploy.
