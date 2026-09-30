import Link from "next/link";
import ViewNavigation from "@/components/view-navigation";

export default function MatchesView() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12 sm:px-12">
      <ViewNavigation currentPath="/matches" />
      <h1 className="text-4xl font-semibold">Matches</h1>
      <p className="mt-4">Choose two teams and enter the match details used to generate a prediction.</p>
      <p className="mt-6">This React view is under construction.</p>
      <Link href="/demo" className="mt-4 inline-block">Open the working football demo</Link>
    </main>
  );
}
