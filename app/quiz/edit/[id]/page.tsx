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
    .eq("user_id", userData.user.id) // Ensure user owns the quiz
    .single();

  if (quizError || !quiz) {
    redirect("/dashboard");
  }

  // Sort questions by order_index and transform option images
  const sortedQuestions =
    quiz.questions
      ?.sort((a: any, b: any) => a.order_index - b.order_index)
      .map((question: any) => {
        console.log("🔍 [DEBUG] Question:", question.question_text);
        console.log(
          "🔍 [DEBUG] Question image URL:",
          question.question_image_url
        );
        console.log(
          "🔍 [DEBUG] Option images from DB:",
          question.question_option_images
        );

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
            console.log("🔍 [DEBUG] Processing image:", img);
            if (img.option_index < question.options.length) {
              optionImages[img.option_index] = img.image_url;
            }
          });
        }

        console.log("🔍 [DEBUG] Final option_images array:", optionImages);

        return {
          ...question,
          option_images: optionImages.length > 0 ? optionImages : undefined,
        };
      }) || [];

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
