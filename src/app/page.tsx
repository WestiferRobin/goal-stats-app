import { connection } from "next/server";
import HomeView from "@/features/home/components/home-view";
import { isIdentity } from "@/features/home/domain/types";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ item?: string | string[] }> }) {
  await connection();
  const { item } = await searchParams;
  return <HomeView selectedId={isIdentity(item) ? item.toLowerCase() : undefined}
    invalidSelection={item !== undefined && !isIdentity(item)} />;
}
