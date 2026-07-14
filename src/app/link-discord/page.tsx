import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ArrowLeft } from "lucide-react";

import { LinkDiscordForm } from "@/components/link-discord-form";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LinkDiscordPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

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

      <Card>
        <CardHeader>
          <CardTitle>Link Discord</CardTitle>
        </CardHeader>
        <CardContent>
          <LinkDiscordForm />
        </CardContent>
      </Card>
    </div>
  );
}
