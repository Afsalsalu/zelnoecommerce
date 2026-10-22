# ZELNO Kitchen — Implementation Plan

## Repository and starting point
The initialized workspace `/home/ubuntu/zelno` contained no application source or package manifest; only its managed Git metadata was present. Therefore the project will start clean rather than replace or migrate an existing app. The managed runtime provides server capability and port 3000, while its database is disabled. This project will use the explicitly requested external Supabase PostgreSQL/Auth/RLS stack, not a Manus database. No Supabase, Cloudinary, or Razorpay production credentials are present or assumed.

## Product approach
Build a custom, server-rendered Next.js App Router store with TypeScript and Tailwind. Public catalog and content reads go through typed server-side Supabase modules; customer authentication and ownership checks use Supabase Auth plus RLS; all privileged admin writes, order creation, price/stock validation, upload signing, and payment verification stay server-side. SQL migrations establish the normalized schema and policies before application features. A development-only SQL seed supplies editable starter content; the UI itself never substitutes hard-coded product/catalog, homepage, FAQ, testimonial or policy lists for database content.

The frontend is split into reusable customer and admin components and route-level pages. Cart state is guest-persistent and reconciled on sign-in where practical. Checkout re-prices and checks inventory on the server, supports COD end-to-end, and keeps Razorpay in a server-only, test-mode-capable path that cannot trust browser callbacks. Cloudinary signing requires an authenticated admin and its API secret remains server-only. Missing external credentials must produce clear setup/empty states rather than fabricated success or insecure fallback behavior.

## Proposed project structure
- `src/app/`: App Router public pages, account/admin route groups, route handlers, metadata, error/loading/not-found boundaries.
- `src/components/`: accessible shared shell, product/catalog components, cart/checkout forms, content-block renderers, and custom admin navigation/editors.
- `src/lib/`: environment validation, Supabase browser/server clients, authorization, typed database/domain queries, cart/checkout/order logic, Cloudinary signing, Razorpay verification, schemas and utilities.
- `supabase/migrations/`: ordered PostgreSQL schema, constraints, indexes, helper functions, grants and RLS policies.
- `supabase/seed.sql`: removable development/demo-only editable starter data.
- `scripts/`: trusted operator-only admin bootstrap utility; never callable as a public role-assignment endpoint.
- `public/`: route manifest and project-owned visual assets.
- Root config and docs: Tailwind/Next/TypeScript, `.env.example`, `.gitignore`, README, this plan and `TODO.md`.

## Implementation order
1. Establish the Next.js/TypeScript/Tailwind toolchain, diagnostics, environment validation and route manifest; finalize migrations and strict RLS before feature work.
2. Implement Supabase Auth flows and authorization primitives, a protected custom admin shell, and safe first-admin bootstrap instructions.
3. Build normalized catalog/content operations and management UI, including category, product, variant, media metadata, SEO and sortable product description blocks.
4. Build the database-driven public storefront and content routes, with mobile-responsive premium layouts, loading/empty/error states and SEO metadata.
5. Implement guest/customer cart behavior, coupons/shipping calculations, trusted server-side checkout, COD order creation, status history, account/order visibility, and isolated Razorpay test architecture.
6. Add authenticated Cloudinary signing, responsive image delivery, documentation and Vercel/GitHub-ready configuration without publishing or pushing without authorization.
7. Validate using diagnostics, TypeScript/build, and focused checks/read-only review; record unverified external integrations honestly where credentials are absent.

## Design direction
- **Design Movement:** Contemporary quiet luxury informed by Japanese editorial product catalogs and warm European home-living magazines.
- **Core Principles:** Let material and photography lead; keep hierarchy calm and deliberate; make commerce details transparent; provide restrained, accessible interaction.
- **Color Philosophy:** Warm ivory grounds the canvas, charcoal carries legible information, and a distinctive muted olive signals considered natural materials without resorting to generic gold luxury tropes.
- **Layout Paradigm:** Editorial, asymmetrical split compositions with generous margins, full-bleed image moments and narrow text measures; product grids are used only where shopping convention benefits discovery.
- **Signature Elements:** Fine olive rules and small uppercase wayfinding; warm-toned image frames with subtle corners; an abstract “Z” leaf/threshold wordmark motif.
- **Interaction Philosophy:** Direct and quiet controls with clear labels, substantial hit areas and visible focus; no surprise motion or obstructive dialogs.
- **Animation:** Short 160–220 ms opacity/transform transitions for hover and drawers; restrained reveal only where it preserves reduced-motion preferences; never animate layout continuously.
- **Typography System:** Manrope for UI/body clarity with Cormorant Garamond for editorial display headings; consistent size/line-height tokens, tabular numerals for prices.
- **Brand Essence:** Considered home essentials for people who value useful objects and calm spaces; **considered, tactile, dependable**.
- **Brand Voice:** Assured, warm, precise, and never shouty. Examples: “Everyday essentials, elevated.” / “Useful by nature. Thoughtful in every detail.”
- **Wordmark & Logo:** Custom-spaced ZELNO wordmark paired with a minimal open-frame/leaf-shaped Z glyph; use a crafted vector mark rather than default-font text as the identity asset.
- **Signature Brand Color:** Deep muted olive `#626B4F`, balanced against ivory `#F7F5F0` and charcoal `#252623`.

## Scope boundaries and dependencies
Supabase, Cloudinary, Razorpay, GitHub and Vercel remain external services chosen by the brief. This work will provide integration code, migrations, docs, environment placeholders and a runnable local/Preview app, but will not invent credentials, write to live customer data, push to a personal GitHub repository, or deploy to production. COD and non-credential-dependent behavior can be implemented locally; full hosted Auth/database/media/payment integration requires the user to configure the documented service credentials. Razorpay remains optional and test-mode-ready; no live charges are initiated.
