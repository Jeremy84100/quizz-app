import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QuizResults } from "@/components/quiz/quiz-results";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

interface QuizResultsPageProps {
  params: {
    id: string;
  };
}

export default async function QuizResultsPage({
  params,
}: QuizResultsPageProps) {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    redirect("/auth/login");
  }

  // Await params before using them
  const { id } = await params;

  // Fetch quiz to ensure user owns it
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .single();

  if (quizError || !quiz) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={userData.user} />

      <main className="container mx-auto px-4 py-4 sm:py-8 pb-32 md:pb-8">
        <QuizResults quiz={quiz} />
      </main>

      <MobileBottomNav user={userData.user} />
    </div>
  );
}
