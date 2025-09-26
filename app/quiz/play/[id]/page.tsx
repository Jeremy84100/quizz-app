import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QuizPlayer } from "@/components/quiz/quiz-player";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

interface QuizPlayPageProps {
  params: {
    id: string;
  };
}

export default async function QuizPlayPage({ params }: QuizPlayPageProps) {
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
        <QuizPlayer
          quiz={{
            ...quiz,
            questions: sortedQuestions,
          }}
          userId={userData.user.id}
        />
      </main>
    </div>
  );
}
