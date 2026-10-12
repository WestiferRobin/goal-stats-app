"use client";

import Link from "next/link";
import ViewNavigation from "@/components/view-navigation";

type HomeViewProps = {
  selectedId?: string;
  invalidSelection?: boolean;
};

const featureCards = [
  {
    title: "Match Analysis",
    text: "Select teams, enter match states, and analyze the current scenario.",
    href: "/matches",
  },
  {
    title: "AI Predictions",
    text: "View win probabilities, likely scores, and prediction insights.",
    href: "/predictions",
  },
  {
    title: "Team Exploration",
    text: "Compare teams, rankings, ratings, and available team data.",
    href: "/teams",
  },
  {
    title: "Analytics",
    text: "Explore momentum, possession, and deeper match statistics.",
    href: "/analytics",
  },
];

export default function HomeView(_props: HomeViewProps = {}) {
  return (
    <main
      className="min-h-screen bg-cover bg-center bg-fixed text-white"
      style={{
        backgroundImage:
          "linear-gradient(rgba(3,10,18,0.82), rgba(3,10,18,0.94)), url('/images/soccer-field-bg.jpg')",
      }}
    >
      <div className="mx-auto w-full max-w-7xl px-6 py-6">
        <ViewNavigation currentPath="/" />

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b1724]/95 shadow-2xl">
          <div className="grid min-h-[520px] lg:grid-cols-2">
            <div className="flex flex-col justify-center px-8 py-12 lg:px-14">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-pink-400">
                Women&apos;s World Cup Predictions & Analysis
              </p>

              <h1 className="text-5xl font-bold leading-tight sm:text-6xl">
                Goal Stats
                <span className="mt-2 block text-pink-500">
                  Women&apos;s World Cup
                </span>
              </h1>

              <p className="mt-5 text-xl font-semibold text-zinc-200">
                Data. Predictions. Insights. The Road to the Final.
              </p>

              <p className="mt-5 max-w-xl text-base leading-7 text-zinc-400">
                Explore matches, compare teams, and view football predictions
                built around the women&apos;s game.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/matches"
                  className="rounded-xl bg-pink-500 px-6 py-3 font-semibold text-white transition hover:bg-pink-600"
                >
                  Explore Matches
                </Link>

                <Link
                  href="/predictions"
                  className="rounded-xl border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
                >
                  View Predictions
                </Link>
              </div>
            </div>

            <div className="relative min-h-[420px] overflow-hidden">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage:
                    "linear-gradient(to left, rgba(0,0,0,0.08), rgba(6,17,28,0.60)), url('/images/womens-soccer-hero.png')",
                }}
              />

              <div className="absolute bottom-8 right-8 max-w-sm rounded-2xl border border-white/10 bg-black/55 p-5 backdrop-blur">
                <p className="text-sm uppercase tracking-widest text-pink-400">
                  2027 Direction
                </p>

                <p className="mt-2 text-xl font-semibold">
                  Built around the FIFA Women&apos;s World Cup.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featureCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="rounded-2xl border border-white/10 bg-[#0b1724]/95 p-6 shadow-lg transition hover:-translate-y-1 hover:border-pink-500/40"
            >
              <h2 className="text-xl font-semibold">{card.title}</h2>

              <p className="mt-3 text-sm leading-6 text-zinc-400">
                {card.text}
              </p>

              <p className="mt-5 text-sm font-semibold text-pink-400">
                Explore →
              </p>
            </Link>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#0b1724]/95 p-6 shadow-lg lg:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
                  Featured Match
                </p>

                <h2 className="mt-2 text-3xl font-bold">
                  USA vs Mexico
                </h2>

                <p className="mt-2 text-zinc-400">
                  Women&apos;s international match analysis
                </p>
              </div>

              <Link
                href="/matches"
                className="text-sm font-semibold text-pink-400"
              >
                View Match →
              </Link>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-[#101d2a] p-5">
                <p className="text-sm text-zinc-400">USA Win</p>
                <p className="mt-2 text-3xl font-bold text-blue-400">--</p>
              </div>

              <div className="rounded-xl bg-[#101d2a] p-5">
                <p className="text-sm text-zinc-400">Draw</p>
                <p className="mt-2 text-3xl font-bold">--</p>
              </div>

              <div className="rounded-xl bg-[#101d2a] p-5">
                <p className="text-sm text-zinc-400">Mexico Win</p>
                <p className="mt-2 text-3xl font-bold text-pink-400">--</p>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/predictions"
                className="inline-block rounded-lg border border-blue-500 px-5 py-3 font-semibold text-blue-400 hover:bg-blue-500/10"
              >
                View Prediction
              </Link>
            </div>
          </div>

          <div className="relative min-h-[320px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b1724]/95 shadow-lg">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(6,17,28,0.42), rgba(6,17,28,0.88)), url('/images/womens-soccer-hero.png')",
              }}
            />

            <div className="relative flex h-full flex-col justify-end p-6">
              <p className="text-sm font-semibold uppercase tracking-widest text-pink-400">
                Goal Stats
              </p>

              <h2 className="mt-3 text-3xl font-bold">
                More Than a Tournament
              </h2>

              <p className="mt-4 text-sm leading-6 text-zinc-200">
                Explore the women&apos;s game through match data, team
                comparisons, predictions, and analytics.
              </p>

              <Link
                href="/about"
                className="mt-6 w-fit rounded-lg bg-pink-500 px-5 py-3 font-semibold hover:bg-pink-600"
              >
                Learn More
              </Link>
            </div>
          </div>
        </section>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 py-6 text-sm text-zinc-400">
          <p>
            Goal Stats | Women&apos;s World Cup Predictions & Analysis
          </p>

          <div className="flex gap-4">
            <Link href="/about" className="hover:text-white">
              About
            </Link>

            <Link href="/blog" className="hover:text-white">
              Blog
            </Link>

            <Link href="/project" className="hover:text-white">
              Project
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}