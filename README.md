# Haulbook

Business management and invoicing for a logistics company that subcontracts loads to other trucking companies. It replaces a general accounting package with one flow built around the job:

**Book a load → sub it out → invoice the customer → receive payment → pay the subcontractor.**

Mobile-first, so the whole business can be run from a phone.

| | |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions), React 19, TypeScript |
| Styling | Tailwind CSS 4, lucide-react icons |
| Database | TiDB (MySQL-compatible) via Prisma 7 |
| PDF | @react-pdf/renderer (server-side) |
| Auth | Email + password, bcrypt, signed HTTP-only session cookie |

## Documentation

- [Project documentation](docs/PROJECT.md): system description, phases, deliverables, user flow, data model, future features
- [User guide](docs/USER_GUIDE.md): how to use the system day to day
- [Deployment guide](docs/DEPLOYMENT.md): going live with TiDB

## Quick start

```bash
npm install
cp .env.example .env      # then fill in DATABASE_URL and AUTH_SECRET
npm run db:deploy         # creates the tables (or run database/create-database.sql in TiDB)
npm run db:check          # confirms the app can reach the database
npm run dev
```

Open http://localhost:3000. The first visit shows a one-time setup screen where you create the owner account and company. The app ships with **no sample data**.

## Running it for real work

`npm run dev` is for changing the code. It watches every file in the project and reloads the page when something changes, which can wipe what you are typing. To use the system day to day, run:

```bash
npm run prod
```

Then open http://localhost:3000. It is much faster and never reloads by itself.

**Windows tip:** keep the project outside OneDrive-synced folders such as `Documents` (for example `C:\dev\logistics-app`). OneDrive and antivirus scans touch files constantly, which makes the dev server reload and slows everything down.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Generate the Prisma client and build for production |
| `npm start` | Run the production build |
| `npm run prod` | Build and start in one step (use this for day-to-day work on your own PC) |
| `npm run db:deploy` | Apply database migrations (safe to run repeatedly) |
| `npm run db:check` | Test the database connection and explain any problem |
| `npm run lint` / `npm run typecheck` | Code checks |

## Project layout

```
prisma/schema.prisma        Data model
prisma/migrations/          SQL migrations
src/app/(auth)/             Sign in and first-run setup
src/app/(app)/              The application screens
src/app/api/                PDF, attachments and CSV export endpoints
src/actions/                Server actions (all writes go through here)
src/components/             UI components
src/lib/                    Database, auth, business rules, formatting, PDF
src/proxy.ts                Redirects signed-out visitors to /login
docs/                       Documentation
```
