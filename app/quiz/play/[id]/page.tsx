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

  // Try to get user data, but don't redirect if not authenticated
  const { data: userData } = await supabase.auth.getUser();

  // Await params before using them
  const { id } = await params;

  // Fetch quiz with questions and option images
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select(
      `
      *,
      questions (
        *,
        question_option_images (*)
      )
    `
    )
    .eq("id", id)
    .single();

  if (quizError || !quiz) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-4">
            Quiz non trouvé
          </h2>
          <p className="text-muted-foreground mb-6">
            Ce quiz n'existe pas ou a été supprimé.
          </p>
          <a href="/" className="text-primary hover:underline">
            Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  // Sort questions by order_index and transform option images
  const sortedQuestions =
    quiz.questions
      ?.sort((a: any, b: any) => a.order_index - b.order_index)
      .map((question: any) => {
        // Transform option images from database format to component format
        const optionImages: (string | null)[] = [];

        if (
          question.question_option_images &&
          question.question_option_images.length > 0
        ) {
          // Initialize array with null values for all options
          for (let i = 0; i < question.options.length; i++) {
            optionImages[i] = null;
          }

          // Fill in the actual image URLs
          question.question_option_images.forEach((img: any) => {
            if (img.option_index < question.options.length) {
              optionImages[img.option_index] = img.image_url;
            }
          });
        }

        return {
          ...question,
          option_images: optionImages.length > 0 ? optionImages : undefined,
        };
      }) || [];

  return (
    <div className="min-h-screen bg-background">
      {userData?.user ? (
        <DashboardHeader user={userData.user} />
      ) : (
        <div className="border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-foreground">Quiz</h1>
              <a
                href="/auth/login"
                className="text-primary hover:underline text-sm">
                Se connecter
              </a>
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-4 sm:py-8 pb-24 md:pb-8">
        <QuizPlayer
          quiz={{
            ...quiz,
            questions: sortedQuestions,
          }}
          userId={userData?.user?.id || "anonymous"}
        />
      </main>
    </div>
  );
}
