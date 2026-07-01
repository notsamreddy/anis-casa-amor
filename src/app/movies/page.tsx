import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ArrowLeft, Film } from "lucide-react";

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
    <div className="space-y-6">
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

      <section className="space-y-1.5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/30">
            <Film className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Watchlist</h1>
            <p className="text-muted-foreground">Movies and series to watch</p>
          </div>
        </div>
      </section>

      <MovieList movies={movies} />
    </div>
  );
}
