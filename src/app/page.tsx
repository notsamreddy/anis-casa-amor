import { HubPicker } from "@/components/hub-picker";
import { APP_NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight">What would you like to do?</h1>
        </div>
        <HubPicker />
      </section>
    </div>
  );
}
