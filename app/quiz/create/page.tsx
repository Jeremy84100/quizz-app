import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QuizCreationForm } from "@/components/quiz/quiz-creation-form";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

export default async function CreateQuizPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={data.user} />

      <main className="container mx-auto px-4 py-4 sm:py-8 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Créer un nouveau quiz
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Ajoutez vos questions et réponses personnalisées. Le système
              mélangera automatiquement les options.
            </p>
          </div>

          <QuizCreationForm userId={data.user.id} />
        </div>
      </main>

      <MobileBottomNav user={data.user} />
    </div>
  );
}
