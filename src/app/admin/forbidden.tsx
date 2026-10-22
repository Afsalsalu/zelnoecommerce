import Link from "next/link";

export default function AdminForbidden() {
  return (
    <section className="mx-auto grid min-h-[55vh] max-w-2xl place-items-center px-5 py-16 text-center">
      <div>
        <span className="eyebrow">ZELNO · Studio</span>
        <h1 className="mt-4 font-display text-5xl">Access reserved.</h1>
        <p className="mt-4 text-sm leading-7 text-muted">Your account is signed in, but it does not have administrator access.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/account" className="button-primary">Back to account</Link>
          <Link href="/" className="button-secondary">View storefront</Link>
        </div>
      </div>
    </section>
  );
}
