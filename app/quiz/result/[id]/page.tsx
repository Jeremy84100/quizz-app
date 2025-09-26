import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QuizResultDetail } from "@/components/quiz/quiz-result-detail";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

interface QuizResultDetailPageProps {
  params: {
    id: string;
  };
}

export default async function QuizResultDetailPage({
  params,
}: QuizResultDetailPageProps) {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    redirect("/auth/login");
  }

  // Await params before using them
  const { id } = await params;

  // Fetch the specific quiz result
  const { data: result, error: resultError } = await supabase
    .from("quiz_results")
    .select(
      `
      *,
      quizzes (
        id,
        title,
        description,
        questions (
          id,
          question_text,
          options,
          correct_answer,
          order_index
        )
      )
    `
    )
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .single();

  if (resultError || !result) {
    redirect("/dashboard");
  }

  // Sort questions by order_index
  const sortedQuestions =
    result.quizzes?.questions?.sort(
      (a: any, b: any) => a.order_index - b.order_index
    ) || [];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={userData.user} />

      <main className="container mx-auto px-4 py-4 sm:py-8 pb-8">
        <QuizResultDetail
          result={{
            ...result,
            quizzes: {
              ...result.quizzes,
              questions: sortedQuestions,
            },
          }}
        />
      </main>
    </div>
  );
}
