"use client";
export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return <main className="p-8"><h1>Home could not be displayed</h1>
    <p>An unexpected problem occurred. Please try again.</p><button onClick={reset}>Try again</button></main>;
}
