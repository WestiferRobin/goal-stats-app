import Link from "next/link";

const views = [
  ["/", "Home"],
  ["/matches", "Matches"],
  ["/predictions", "Predictions"],
  ["/teams", "Teams"],
  ["/analytics", "Analytics"],
] as const;

export default function ViewNavigation({ currentPath }: { currentPath: string }) {
  return (
    <nav aria-label="Product views" className="mb-10 flex flex-wrap gap-4">
      {views.map(([href, label]) => (
        <Link key={href} href={href} aria-current={href === currentPath ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
