import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ArrowLeft } from "lucide-react";

import { RecipeList } from "@/components/recipe-list";
import { buttonVariants } from "@/components/ui/button";
import { getAllRecipeVideos } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const recipes = await getAllRecipeVideos();

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

      <RecipeList recipes={recipes} />
    </div>
  );
}
