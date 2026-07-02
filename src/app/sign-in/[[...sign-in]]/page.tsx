import { SignIn } from "@clerk/nextjs";

import { AppLogo } from "@/components/app-logo";
import { APP_DESCRIPTION } from "@/lib/brand";

export default function SignInPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 py-6">
      <div className="space-y-3 text-center">
        <AppLogo size="lg" className="mx-auto" />
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to continue.
          </p>
          <p className="text-xs text-muted-foreground">{APP_DESCRIPTION}</p>
        </div>
      </div>
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </div>
  );
}
