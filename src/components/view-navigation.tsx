import Link from "next/link";

const views = [
  ["/", "Road to the Final"],
  ["/matches", "Matches"],
  ["/predictions", "Predictions"],
  ["/teams", "Teams"],
  ["/analytics", "Analytics"],
  ["/about", "About"],
  ["/blog", "Blog"],
  ["/project", "Project"],
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
