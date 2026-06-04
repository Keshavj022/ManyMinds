import WelcomeBlock from "@/components/dashboard/WelcomeBlock";
import QuickStartGrid from "@/components/dashboard/QuickStartGrid";
import InsightsPanel from "@/components/dashboard/InsightsPanel";
import ObservationsCard from "@/components/dashboard/ObservationsCard";
import ScenePreview from "@/components/dashboard/ScenePreview";

export default function DashboardPage() {
  return (
    <div className="space-y-10 pb-8">
      <WelcomeBlock />
      <QuickStartGrid />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <InsightsPanel />
        </div>
        <div>
          <ObservationsCard />
        </div>
      </div>
      <ScenePreview />
    </div>
  );
}
