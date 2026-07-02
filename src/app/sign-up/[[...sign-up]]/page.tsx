import { SignUp } from "@clerk/nextjs";

import { AppLogo } from "@/components/app-logo";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/brand";

export default function SignUpPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 py-6">
      <div className="space-y-3 text-center">
        <AppLogo size="lg" className="mx-auto" />
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Join {APP_NAME}</h1>
          <p className="text-sm text-muted-foreground">{APP_DESCRIPTION}</p>
        </div>
      </div>
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </div>
  );
}
