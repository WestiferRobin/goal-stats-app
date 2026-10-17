import Link from "next/link";
import ViewNavigation from "@/components/view-navigation";

export default function LandingView() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12 sm:px-12">
      <ViewNavigation currentPath="/" />
      <h1 className="text-4xl font-semibold">GoalStats</h1>
      <p className="mt-4">Football analytics and predictions.</p>
      <Link href="/demo" className="mt-6 inline-block">Open the football demo</Link>
    </main>
  );
}
