import { SignUp } from "@clerk/nextjs";
import { LayoutGrid } from "lucide-react";

import { APP_DESCRIPTION, APP_NAME } from "@/lib/brand";

export default function SignUpPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 py-6">
      <div className="space-y-3 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <LayoutGrid className="size-7" />
        </span>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Join {APP_NAME}</h1>
          <p className="text-sm text-muted-foreground">{APP_DESCRIPTION}</p>
        </div>
      </div>
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </div>
  );
}
