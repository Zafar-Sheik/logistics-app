# Haulbook: project documentation

## 1. Background

The business is a logistics company that takes on freight for customers and subcontracts the work it cannot carry itself to other trucking companies. The cycle for each job is:

1. Accept a job from a customer.
2. Give it to a subcontractor.
3. Invoice the customer.
4. Receive the customer's payment.
5. Pay the subcontractor.

A general accounting package (Sage) can record these transactions, but it treats them as unrelated documents. It does not know that a customer invoice and a supplier invoice belong to the same job, so it cannot show the margin on a job or tell you whether the customer has paid before you pay the subcontractor. Haulbook is built around the job (a **load**) so that those links are the centre of the system.

## 2. Goals

| Goal | How it is met |
|---|---|
| Replace Sage for day-to-day operations | Quotes, invoices, payments, supplier bills, expenses, statements, VAT and profit reports |
| Run the business from a phone | Mobile-first layout, bottom navigation, large touch targets, camera upload for PODs, native share for PDFs, installable to the home screen |
| Short learning curve | One flow, a "Next step" on every load, a to-do list on Home, plain language, a welcome tour, a getting-started checklist, in-app help |
| Professional documents | Clean invoice with logo, company details, VAT number and banking details, as PDF and print |
| Production ready | Authentication, roles, validation, transactional writes, no sample data, migrations, deployment guide |

## 3. System description

### 3.1 Modules

| Module | Purpose |
|---|---|
| **Home** | Money owed to you, money you owe, profit this month, active loads, a to-do list, 6-month cash flow chart, getting-started checklist |
| **Loads** | Jobs: customer, subcontractor, route, dates, cargo, truck and driver, both rates, margin, status, POD and other attachments |
| **Quotes** | Price a job; convert an accepted quote to an invoice |
| **Invoices** | Tax invoices with multiple lines and VAT; created from one or many loads or from scratch; PDF, print, share; part and full payments; void |
| **Subcontractor bills** | The subcontractor's invoice, linked to a load; shows whether the customer has paid; part and full payments |
| **Expenses** | Other running costs by category, with VAT |
| **Payments** | Ledger of all money in and out |
| **Customers / Subcontractors** | Contact details, terms, banking details, balances, history, customer statements |
| **Reports** | Profit & loss, load profitability, aged receivables, aged payables, VAT report, CSV exports |
| **Settings** | Company profile and logo, banking details, tax, numbering, terms, invoice colour, team and roles |
| **Help** | In-app guide and replayable tour |

### 3.2 Feature benchmark

The feature set was chosen by comparing what small-business accounting systems commonly offer (Sage Business Cloud Accounting, Xero, QuickBooks Online, Zoho Books) and what freight-broker tools add on top. This comparison is drawn from general knowledge of those products rather than a fresh feature-by-feature audit.

| Common in accounting systems | In Haulbook |
|---|---|
| Customer and supplier records | ✓ Customers, subcontractors |
| Quotes that convert to invoices | ✓ |
| Branded invoices with logo and banking details, PDF | ✓ |
| Invoice statuses, due dates, overdue tracking | ✓ |
| Part payments, payment history | ✓ |
| Supplier bills and payments | ✓ Subcontractor bills |
| Expense capture with categories and tax | ✓ |
| Customer statements | ✓ |
| Aged receivables / payables | ✓ |
| Profit & loss | ✓ (operational, see 3.4) |
| VAT report | ✓ |
| Dashboard with cash flow | ✓ |
| Multi-user with roles | ✓ Owner, admin, staff |
| Data export | ✓ CSV |
| Mobile use | ✓ Mobile-first, installable |
| Bank feeds, online payment links, recurring invoices, credit notes, emailing from the system, multi-currency, full general ledger | Planned: see section 8 |

| Specific to freight brokering | In Haulbook |
|---|---|
| Job record linking customer and carrier | ✓ Load |
| Margin per job | ✓ |
| POD capture | ✓ Photo or PDF on the load |
| Job-to-invoice in one step, multi-job invoices | ✓ |
| Pay-when-paid visibility | ✓ "Ready to pay" |

### 3.3 Business rules

- Load, invoice and quote numbers are issued in sequence inside a database transaction, so they never clash.
- Load rates exclude tax. Tax is applied per line on invoices and per bill.
- A load can be on only one live invoice. Voiding the invoice frees the load.
- A draft invoice does not count as income or as money owed.
- A payment cannot exceed the balance. A full payment marks the document Paid; deleting a payment reopens it.
- An invoice or bill with payments cannot be edited or voided until the payments are removed.
- Sent invoices cannot be deleted, only voided, so the number sequence stays complete.
- "Ready to pay" means the bill is open and the invoice for its load is paid. Paying earlier is allowed, with a warning.
- Contacts with history cannot be deleted, only archived. Loads with documents cannot be deleted, only cancelled.
- "Today" and overdue checks use the business time zone (`APP_TIMEZONE`).

### 3.4 Scope note on accounting

Haulbook is an operational system. Its Profit & loss and VAT reports are calculated from invoices, bills and expenses on the invoice basis. It does not keep a double-entry general ledger, balance sheet or bank reconciliation. For year-end accounts and tax submissions, export the data for your accountant. A ledger is on the roadmap (section 8).

### 3.5 Architecture

```
Browser (phone / desktop, installable)
        │
Next.js 16 App Router
  ├─ proxy.ts              session gate → /login
  ├─ Server Components     read data, render pages
  ├─ Server Actions        validate (zod) → authorise → write in a transaction
  └─ Route Handlers        PDF, attachments, CSV
        │
Prisma 7 (MariaDB driver adapter, TLS)
        │
TiDB
```

- All pages are rendered on the server per request; nothing sensitive is cached.
- Every server action re-checks the signed-in user against the database and validates input on the server.
- Passwords are hashed with bcrypt. Sessions are signed JWTs in an HTTP-only, same-site cookie. Eight failed sign-ins lock an account for 15 minutes.
- Logos and attachments are stored in the database, so no file storage service is needed.

### 3.6 Data model

| Table | Holds |
|---|---|
| `User` | Sign-in, role, tutorial state |
| `Company` | One row: profile, logo, banking details, tax, numbering, defaults |
| `Contact` | Customers and subcontractors |
| `Load` | Jobs |
| `Document` + `DocumentLine` | Invoices and quotes with their lines; a line may link to a load |
| `Bill` | Subcontractor invoices; may link to a load |
| `Payment` | Money in (against an invoice) or out (against a bill) |
| `Expense` | Running costs |
| `Attachment` | Files on a load |

## 4. User flow

### 4.1 First run

```
Open site → Setup (your sign-in + company) → Welcome tour → Home
          → Checklist: logo & address → banking → customer → subcontractor → load → invoice → payment
```

### 4.2 Core flow

```
           ┌──────────── optional ────────────┐
           │  Quote → sent → accepted          │
           └──────────────┬───────────────────┘
                          ▼
  New load ─► In transit ─► Delivered (+POD) ─► Invoice (draft) ─► Sent
                                                                    │
                                              customer pays         ▼
  Subcontractor paid ◄─ Record payment ◄─ Bill "ready to pay" ◄─ Record payment
        │                                       ▲
        ▼                              Capture subcontractor bill
  Load complete                        (any time after booking)
```

At each stage the load screen shows the next action, and the Home to-do list collects the same prompts across all loads:

| Situation | Prompt on Home |
|---|---|
| Delivered, not invoiced | "N delivered loads to invoice" |
| Invoice still a draft | "N draft invoices to send" |
| Invoice past due | "N overdue invoices" |
| Customer paid, bill open | "N subcontractors ready to pay" |
| Delivered, no bill captured | "N loads awaiting a subcontractor bill" |
| Delivered, no POD | "N delivered loads without a POD" |

### 4.3 Supporting flows

- **Expense:** + → Expense → category, amount, VAT → save.
- **Statement:** Customer → Statement → period → print.
- **Month end:** Reports → VAT report and Profit & loss for the period → export CSVs for the accountant.
- **Team:** Settings → Team → Add person → share temporary password.

## 5. Phases

| Phase | Scope | Status |
|---|---|---|
| **1. Foundation** | Project setup, data model and migration, authentication, first-run setup, roles, app shell with mobile and desktop navigation | Delivered |
| **2. Operations** | Customers, subcontractors, loads, status pipeline, attachments / POD | Delivered |
| **3. Money in** | Quotes, invoices, numbering, VAT, invoice PDF and print, sharing, customer payments | Delivered |
| **4. Money out** | Subcontractor bills, pay-when-paid indicator, bill payments, expenses, payments ledger | Delivered |
| **5. Insight** | Home dashboard and to-do list, profit & loss, load profitability, aged receivables and payables, VAT report, statements, CSV export | Delivered |
| **6. Ease of use** | Welcome tour, getting-started checklist, in-app help, empty states, installable web app, user guide | Delivered |
| **7. Go-live** | Deploy against production TiDB, smoke test, enter opening balances, train staff | To do (see section 7) |
| **8. Enhancements** | Future features (section 8) | Planned |

## 6. Deliverables

| # | Deliverable | Location |
|---|---|---|
| 1 | Application source code | this repository |
| 2 | Database schema and migration | `prisma/` |
| 3 | Project documentation (this document) | `docs/PROJECT.md` |
| 4 | User guide | `docs/USER_GUIDE.md` and in-app Help |
| 5 | Deployment guide | `docs/DEPLOYMENT.md` |
| 6 | First-run tutorial | In-app, replayable from Help |
| 7 | Environment template | `.env.example` |

## 7. Go-live checklist

1. Set `DATABASE_URL` and `AUTH_SECRET`; run `npm run db:deploy`.
2. Deploy and complete setup immediately.
3. Upload the logo; enter address, VAT number and banking details.
4. Under Invoice settings, set the next invoice number to follow on from Sage.
5. Add customers and subcontractors.
6. Enter opening balances: create one invoice per unpaid Sage invoice (use the original date and reference) and one bill per unpaid subcontractor invoice.
7. Run one load through the full flow and check the invoice PDF.
8. Add staff under Settings → Team.

## 8. Future features

**Near term**

- Send invoices and statements by email from the system (SMTP or an email service), with automatic overdue reminders
- Credit notes
- Recurring invoices for contract work
- Remittance advice PDF for subcontractor payments
- Batch payment: pay several bills at once and export a bank payment file
- Receipt photos on expenses
- Password reset by email and two-factor sign-in
- Activity log (who changed what, when)

**Medium term**

- Bank statement import and reconciliation
- Online payment link on invoices
- Customer portal to view invoices and statements
- Subcontractor portal: accept loads, upload PODs and invoices
- Rate cards per customer and lane; fuel surcharge
- Multi-stop loads; own-fleet trip costing (fuel, tolls, driver)
- Subcontractor compliance documents with expiry alerts (licences, insurance, GIT cover)
- Importers for Sage customers, suppliers and open invoices
- Push notifications and offline capture

**Longer term**

- Double-entry general ledger, balance sheet, trial balance
- Multi-currency and cross-border documents
- Live tracking integration and customer-facing delivery status
- Multiple companies / branches
- Cash flow forecasting
