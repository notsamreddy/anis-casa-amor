import { SignUp } from "@clerk/nextjs";
import { Dumbbell } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 py-6">
      <div className="space-y-3 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30">
          <Dumbbell className="size-7" />
        </span>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Create an account to track your Push / Pull / Legs sessions.
          </p>
        </div>
      </div>
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </div>
  );
}
