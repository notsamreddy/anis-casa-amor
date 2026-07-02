import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ArrowLeft } from "lucide-react";

import { MovieList } from "@/components/movie-list";
import { buttonVariants } from "@/components/ui/button";
import { getMoviesByUserId } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MoviesPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const movies = await getMoviesByUserId(userId);

  return (
    <div className="space-y-4">
      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "-ml-2",
        )}
      >
        <ArrowLeft className="size-4" />
        Back
      </Link>

      <MovieList movies={movies} />
    </div>
  );
}
