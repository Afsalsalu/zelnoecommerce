# ZELNO Kitchen

ZELNO Kitchen is a premium, mobile-first single-vendor D2C storefront built with Next.js 16, TypeScript, Supabase, Cloudinary, and optional Razorpay payments. The existing warm lifestyle design is kept in the App Router source and can expand beyond kitchen products later.

## Prerequisites

- Node.js 24 or newer
- pnpm 11 or newer
- A Supabase project for real catalogue, account, admin, and order data

## Local setup without Supabase

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy `.env.example` to `.env.local` and replace the placeholders with the credentials for your environment. Keep service-role, Cloudinary secret, and payment secret values server-side only.

3. Start the development server:

   ```bash
   pnpm dev
   ```

The storefront is available at `http://localhost:3000`.

Without real Supabase credentials, public pages use safe empty/fallback states. Account, admin, checkout, catalog writes, Cloudinary uploads, and payment actions reject safely until their required configuration is present.

## Supabase setup

1. Create a Supabase project and copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the server-only `SUPABASE_SERVICE_ROLE_KEY`. Keep the service-role key out of browser code and never put it in a `NEXT_PUBLIC_*` variable.
3. Run the migrations in order, without editing an already-applied migration:

   ```text
   supabase/migrations/0001_initial_schema.sql
   supabase/migrations/20261017120000_phase2_security_and_money.sql
   ```

   The second migration preserves existing data, converts monetary columns from rupees to integer paise, hardens RLS, and replaces the checkout function with the locked server-side version.

4. In Supabase Authentication settings, set Site URL to `http://localhost:3000` for local work (or the deployed origin later), and add these redirect URLs:

   ```text
   http://localhost:3000/account
   http://localhost:3000/reset-password
   ```

5. Create a normal account through `/register`. Create a second normal account if you want to run the full customer-isolation SQL test suite.
6. Bootstrap the explicitly chosen administrator from the repository root:

   ```bash
   pnpm admin:bootstrap -- admin@example.com
   ```

   The command requires the matching Auth user to exist, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`. It grants only the `admin` role to that exact email and never prints secret values.

7. Run `supabase/tests/rls_tests.sql` in the Supabase SQL editor as a database owner/postgres role. The script requires two normal Auth users and one bootstrapped admin, uses a transaction, and rolls back its test rows.

The existing `supabase/seed.sql` is optional and only updates store copy; it does not create fake products, customers, or orders.

## Verification commands

```bash
pnpm typecheck
pnpm build
```

## Bootstrap an administrator

Create the user in Supabase Auth first, then run the following from the repository root with `.env.local` configured:

```bash
pnpm admin:bootstrap -- admin@example.com
```

The command requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, looks up only the explicitly supplied email, and grants that user the `admin` role. It refuses to run without service-role configuration and never prints secret values.

## Credentials and external services

The storefront can render its connection-safe empty states without live credentials. Real Supabase reads and writes, Cloudinary uploads, and Razorpay checkout/webhook actions require valid credentials and the corresponding database schema/configuration. Do not place service-role, Cloudinary API secret, or Razorpay secret values in client-side code or `NEXT_PUBLIC_*` variables.
