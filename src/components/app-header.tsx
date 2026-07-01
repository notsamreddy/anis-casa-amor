import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { LayoutGrid, Settings } from "lucide-react";

import { isAdmin } from "@/lib/admin";
import { APP_NAME } from "@/lib/brand";
import { buttonVariants } from "@/components/ui/button";

export async function AppHeader() {
  const showAdmin = await isAdmin();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-sm shadow-violet-600/30">
            <LayoutGrid className="size-5" />
          </span>
          <span className="text-base tracking-tight">{APP_NAME}</span>
        </Link>

        <div className="flex items-center gap-2">
          {showAdmin && (
            <Link
              href="/admin"
              aria-label="Admin settings"
              className={buttonVariants({ variant: "ghost", size: "icon" })}
            >
              <Settings className="size-5" />
            </Link>
          )}
          <UserButton />
        </div>
      </div>
    </header>
  );
}
