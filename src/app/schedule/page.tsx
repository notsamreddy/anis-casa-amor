import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ArrowLeft } from "lucide-react";

import { ScheduleImporter } from "@/components/schedule-importer";
import { buttonVariants } from "@/components/ui/button";
import { getScheduleEventsForWeek } from "@/lib/queries";
import { addDays, getWeekMonday } from "@/lib/schedule-types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SchedulePageProps = {
  searchParams: Promise<{ week?: string }>;
};

export default async function SchedulePage({ searchParams }: SchedulePageProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const params = await searchParams;
  const weekStart = params.week
    ? getWeekMonday(new Date(`${params.week}T12:00:00`))
    : getWeekMonday();
  const weekEnd = addDays(weekStart, 6);
  const events = await getScheduleEventsForWeek(weekStart, weekEnd);

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

      <ScheduleImporter weekStart={weekStart} events={events} />
    </div>
  );
}
