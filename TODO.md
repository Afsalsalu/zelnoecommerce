# ZELNO Kitchen — Delivery Outcomes

Criteria below preserve the requested product behavior. An outcome stays open until the behavior is implemented; no item implies that an external service has been configured or tested without credentials.

## 1. Database foundation and development data
- [ ] Provide normalized Supabase PostgreSQL migrations for `profiles`, `user_roles`, `categories`, `products`, `product_images`, `product_variants`, `product_content_blocks`, `tags`/product-tag mapping, `homepage_sections`, `homepage_banners`, `testimonials`, `faqs`, `site_pages`, `site_settings`, `addresses`, `carts`, `cart_items`, `orders`, `order_items`, `order_status_history`, `coupons`, `coupon_usages`, `reviews`, and `contact_enquiries`.
- [ ] Use UUID primary keys where suitable and consistent `created_at`/`updated_at`; human-readable unique order number distinct from UUID; order-item snapshots of product title, SKU, variant, unit price, discount and image; constraints/indexes for frequent queries; enum/check constraints for roles, payment states, order states, content-block types and visibility; development/demo-only seed data that is clearly removable.
- [ ] Include strict RLS: public visitors read only published products, active categories, public homepage content, public policies and approved reviews; customers read/update only their profile and addresses and read only their own orders/items; only admins mutate products, categories, coupons, orders, settings, content blocks and dashboard data; customer checkout/order creation is through validated protected server logic; service-role access stays server-only.

## 2. Authentication, accounts and access control
- [ ] Implement Supabase Auth email/password customer registration, login, logout and password reset; customer profile/address ownership; merge a guest cart into the signed-in customer's cart where practical.
- [ ] Protect admin routes and data operations by server-verified `admin` role, never by merely hiding UI; role assignment is not available through a public browser request.
- [ ] Document and provide a safe trusted-operator method to bootstrap the first admin user. Customer A cannot read Customer B's orders or order items.

## 3. Storefront routes and editable public content
- [ ] Implement `/`, `/shop`, `/shop/[slug]`, `/collections/[slug]`, `/about`, `/contact`, `/cart`, `/checkout`, `/order-success/[orderNumber]`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/account`, `/account/orders/[orderNumber]`, `/track-order`, `/shipping-policy`, `/return-refund-policy`, `/privacy-policy`, `/terms-conditions`, plus custom not-found and error states.
- [ ] All product/catalog, homepage, FAQ, testimonial, policy and other editable visible content is read from admin-managed data, not a hard-coded product/content list. Dynamic routes return appropriate missing-item/not-found behavior.
- [ ] The homepage includes an announcement bar; sticky responsive navigation; hero heading, description, CTA and desktop/mobile imagery; featured collections; new arrivals; bestsellers; offer/coupon promotion; lifestyle story/image; Why ZELNO quality-checked/secure-payment/support/easy-returns trust icons; testimonials/reviews; FAQ preview; newsletter/WhatsApp CTA; and full footer with policies, social links and contact details. Admin can edit, reorder and hide/show each homepage section.
- [ ] Shop supports search by product name/tags/category; filters for category, price range and availability; sorts newest, price low-to-high, price high-to-low and bestseller; pagination or load-more; responsive mobile filter drawer; product cards with image, optional badge, title, sale/original price, discount and applicable quick add; empty-search and loading/skeleton states.
- [ ] Product detail supports title, short and rich long descriptions, price/original price/discount, multiple Cloudinary images, image zoom/lightbox, URL/embed demo video, size/colour/pack/capacity variants each with price/SKU/stock, quantity selector, add-to-cart and buy-now, COD note, delivery/shipping and return summaries, sharing, reviews/rating, related and recently viewed products, and SEO metadata.
- [ ] Product descriptions use an admin-managed sortable visual content-block builder, not only one textarea. Supported types: heading, rich text, full-width image, two-image gallery, image with text, video embed, feature icons/list, specification table, comparison block, FAQ accordion, divider/spacer. Admin can add/edit/reorder/hide/show/delete; storefront renders saved visible blocks between product overview and reviews.
- [ ] About/contact and all shipping, returns/refund, privacy and terms policy pages are editable through content management; contact form submissions are stored for admin follow-up.

## 4. Cart, checkout, orders and payment safety
- [ ] Guest cart persists in browser storage; users can update quantity/remove items; server validates current product/variant price and availability before checkout; coupon apply/remove and shipping calculation produce subtotal, discount, shipping and total.
- [ ] Guest checkout is allowed and login optional; collect customer name, email, phone, Indian shipping address (house/address, area, city, state, pincode), order notes and shipping method; COD can be enabled/disabled; generate readable order number and show a clear success/tracking summary.
- [ ] COD creates orders through trusted server validation and preserves immutable line-item snapshots. Order details are visible only to their customer or an admin.
- [ ] Support payment statuses `pending`, `payment_pending`, `paid`, `failed`, `cancelled`, `refunded`. Razorpay architecture is safe/test-mode-ready without live keys: server-side payment-order creation, signature verification and webhook verification; keys server-only; never mark an order paid solely because the browser reports success; never initiate a live payment in local testing.

## 5. Custom admin dashboard and content operations
- [ ] Provide a protected, custom-designed `/admin` or `/dashboard/admin` with overview: total sales, orders by status, recent orders, top products, low/out-of-stock products, customers and revenue summary.
- [ ] Product management: add/edit/delete; draft/published; slug, SKU, categories, tags, price/compare-at price, image upload, video URL, variants, stock, SEO, visual content blocks and related-product selection.
- [ ] Category/collection management: name, slug, image, description, sort order, active/inactive and featured-on-homepage toggle.
- [ ] Order management: filter/search by order number/customer/phone/status; line items/address/payment state; transitions `new → confirmed → packed → shipped → delivered` plus `cancelled`, `returned`, `refunded`; tracking courier/number, admin notes, timeline/audit history.
- [ ] Customer management: customer profile, addresses, order history and total spend.
- [ ] Coupon management: percentage/fixed discount, minimum amount, start/end dates, usage limit, active/inactive and one-time-per-customer option.
- [ ] Homepage manager: announcement bar, hero banners, section visibility/order, featured products, trust points, testimonials, FAQs and newsletter/WhatsApp.
- [ ] Content-page manager: About, contact information, shipping policy, return/refund policy, privacy, terms and FAQs.
- [ ] Settings: logo, brand colours, store name, contact email/phone, WhatsApp, social links, shipping-fee rules, free-shipping minimum, COD toggle, INR currency and SEO defaults.
- [ ] Contact enquiry inbox stores site form submissions and allows marking new/read/replied; no secrets are returned to the client.

## 6. Cloudinary media and video handling
- [ ] Implement admin-only signed uploads or a secure server-side upload route; Cloudinary API secret never reaches browser code. Store public ID, URL, alt text, sort order, width and height in the database; use optimized responsive images and WebP/AVIF where supported; handle replacement/deletion cautiously to avoid orphan assets.
- [ ] Product demo video uses an external URL or YouTube unlisted embed initially, without assuming unlimited Cloudinary video. README explains Cloudinary free-plan monthly credits are shared among storage, delivery bandwidth and transformations.

## 7. SEO, accessibility, performance and deployment readiness
- [ ] Implement dynamic route metadata, Open Graph, canonical URLs, sitemap.xml, robots.txt and practical Product JSON-LD; images optimized/lazy-loaded; meaningful public content appears in server-rendered initial HTML; private content is not indexed or leaked.
- [ ] Provide appropriate loading, error and empty states; friendly form validation and success/failure toast messages; keyboard navigation, visible focus, labels, adequate contrast and image alt text; mobile and desktop responsive layouts; no broken links or console errors in the verified local paths.
- [ ] Provide `.env.example` with placeholders only for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `NEXT_PUBLIC_SITE_URL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`; ignore secrets/local env files in Git.
- [ ] README documents local setup, Supabase project setup, migration execution, first-admin bootstrap, Cloudinary setup and free-plan credit note, Vercel environment variables/deployment using a free `*.vercel.app` host, GitHub-to-Vercel main-branch flow and Razorpay test-mode setup. Prepare source for GitHub/Vercel, but do not push or deploy without explicit authorization and credentials.
- [ ] Verify `npm run build` and TypeScript checks; inspect server admin authorization, customer order isolation, server authority for price/totals, guest cart/checkout, COD flow and saved block ordering. Report any integration path that cannot be end-to-end tested without external credentials rather than claiming it works.
