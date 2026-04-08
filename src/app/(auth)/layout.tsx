import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Minimal header */}
      <header className="py-5 px-6">
        <Link
          href="/"
          className="flex items-center gap-2 w-fit font-bold text-lg tracking-tight"
        >
          <span className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-white text-xs font-black">
            N
          </span>
          <span className="text-text-primary">Nudg</span>
        </Link>
      </header>

      {/* Centered content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-5 px-6 text-center text-xs text-text-muted">
        © {new Date().getFullYear()} Nudg. All rights reserved.
      </footer>
    </div>
  );
}
