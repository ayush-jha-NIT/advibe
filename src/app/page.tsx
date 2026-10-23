export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-12">
        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
          PART 0 · FRONTEND FOUNDATION
        </span>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          AdVibe frontend initialized
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
          The mobile-first Next.js foundation is in place. The client-approved
          designs, official logo, public website and three role-based portals
          will be implemented in subsequent parts.
        </p>
        <div className="mt-7 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
          <p className="rounded-lg bg-slate-50 p-3">Next.js App Router</p>
          <p className="rounded-lg bg-slate-50 p-3">TypeScript · strict mode</p>
          <p className="rounded-lg bg-slate-50 p-3">Tailwind CSS 4</p>
          <p className="rounded-lg bg-slate-50 p-3">Mobile-first foundation</p>
        </div>
        <p className="mt-7 text-xs text-slate-500">
          Placeholder only. Not a production landing page or payment interface.
        </p>
      </section>
    </main>
  );
}
