import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { QuizGrid } from "@/components/dashboard/quiz-grid";
import { CreateQuizButton } from "@/components/dashboard/create-quiz-button";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={data.user} />

      <main className="container mx-auto px-4 py-4 sm:py-8 pb-20 md:pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Mes Quiz
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Créez, gérez et jouez à vos quiz personnalisés
            </p>
          </div>
          <CreateQuizButton />
        </div>

        <QuizGrid userId={data.user.id} />
      </main>

      <MobileBottomNav user={data.user} />
    </div>
  );
}
