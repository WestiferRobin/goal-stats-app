import Link from "next/link";
import ViewNavigation from "@/components/view-navigation";

export default function PredictionsView() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12 sm:px-12">
      <ViewNavigation currentPath="/predictions" />
      <h1 className="text-4xl font-semibold">Predictions</h1>
      <p className="mt-4">View match predictions, likely scores, confidence, and saved results.</p>
      <p className="mt-6">This React view is under construction.</p>
      <Link href="/demo" className="mt-4 inline-block">Open the working football demo</Link>
    </main>
  );
}
