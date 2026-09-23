export default function HomeView() {
  return (
    <main className="flex min-h-svh flex-1 items-center bg-zinc-50 px-6 py-16 font-sans text-zinc-950 sm:px-12 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto w-full max-w-4xl">
        <div aria-hidden="true" className="mb-10 h-1 w-12 rounded-full bg-emerald-600 dark:bg-emerald-400" />
        <h1 className="text-5xl font-semibold tracking-tight sm:text-7xl">
          GoalStats
        </h1>
        <p className="mt-6 max-w-2xl text-2xl leading-relaxed text-zinc-700 sm:text-3xl dark:text-zinc-300">
          A football analytics and prediction project.
        </p>
        <section aria-labelledby="development-heading" className="mt-12 max-w-2xl border-t border-zinc-300 pt-8 dark:border-zinc-700">
          <h2 id="development-heading" className="text-sm font-semibold uppercase tracking-widest text-emerald-800 dark:text-emerald-300">
            Development foundation
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
            This is the starting point for the GoalStats interface. Product
            features and backend integration are not available yet.
          </p>
        </section>
      </div>
    </main>
  );
}
