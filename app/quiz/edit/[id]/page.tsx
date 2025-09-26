import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QuizEditForm } from "@/components/quiz/quiz-edit-form";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

interface QuizEditPageProps {
  params: {
    id: string;
  };
}

export default async function QuizEditPage({ params }: QuizEditPageProps) {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    redirect("/auth/login");
  }

  // Await params before using them
  const { id } = await params;

  // Fetch quiz with questions
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select(
      `
      *,
      questions (*)
    `
    )
    .eq("id", id)
    .eq("user_id", userData.user.id) // Ensure user owns the quiz
    .single();

  if (quizError || !quiz) {
    redirect("/dashboard");
  }

  // Sort questions by order_index
  const sortedQuestions =
    quiz.questions?.sort((a: any, b: any) => a.order_index - b.order_index) ||
    [];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={userData.user} />

      <main className="container mx-auto px-4 py-4 sm:py-8 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Modifier le quiz
            </h1>
            <p className="text-muted-foreground">
              Modifiez les questions et réponses de votre quiz.
            </p>
          </div>

          <QuizEditForm
            quiz={{
              ...quiz,
              questions: sortedQuestions,
            }}
            userId={userData.user.id}
          />
        </div>
      </main>

      <MobileBottomNav user={userData.user} />
    </div>
  );
}
