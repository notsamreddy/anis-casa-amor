import { HubPicker } from "@/components/hub-picker";
import { APP_NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return (
    <div className="min-w-0 space-y-8">
      <section className="min-w-0 space-y-3">
        <div className="space-y-1.5">
          <h1 className="text-balance text-xl font-bold tracking-tight sm:text-2xl">
            What would you like to do?
          </h1>
        </div>
        <HubPicker />
      </section>
    </div>
  );
}
