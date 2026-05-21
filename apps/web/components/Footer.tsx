import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mx-auto flex w-full max-w-4xl flex-col items-center justify-between gap-3.5 pt-5 text-[0.84rem] sm:flex-row sm:items-end sm:gap-5 lg:pt-7">
      <p className="landing-text-muted text-center sm:text-left">
        © 2026 DIU Lens.
      </p>
      <nav
        id="support"
        aria-label="Footer links"
        className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 sm:justify-end sm:gap-6"
      >
        <Link
          href="/faq"
          className="landing-link"
        >
          FAQ
        </Link>
        <Link
          href="/admin/login"
          className="landing-link"
        >
          Admin
        </Link>
      </nav>
    </footer>
  );
}
