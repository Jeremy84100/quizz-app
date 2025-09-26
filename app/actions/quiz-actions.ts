"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface QuizFormData {
  title: string;
  description: string;
  questions: Array<{
    id: string;
    question_text: string;
    options: string[];
    correct_answers: number[];
    question_image_url?: string | null;
    option_images?: (string | null)[];
    isNew?: boolean;
    toDelete?: boolean;
  }>;
}

export interface QuizUpdateData extends QuizFormData {
  id: string;
}

export async function createQuiz(data: QuizFormData, userId: string) {
  const supabase = await createClient();

  try {
    // Create quiz
    const { data: quizData, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        title: data.title,
        description: data.description,
        user_id: userId,
      })
      .select()
      .single();

    if (quizError) throw quizError;

    // Create questions
    const questionsToInsert = data.questions
      .filter((q) => q.question_text.trim())
      .map((question, index) => ({
        quiz_id: quizData.id,
        question_text: question.question_text.trim(),
        options: question.options,
        correct_answer: question.correct_answers[0] || 0,
        correct_answers: question.correct_answers,
        order_index: index,
        question_image_url: question.question_image_url,
      }));

    const { data: insertedQuestions, error: questionsError } = await supabase
      .from("questions")
      .insert(questionsToInsert)
      .select();

    if (questionsError) throw questionsError;

    // Handle option images
    for (let i = 0; i < insertedQuestions.length; i++) {
      const insertedQuestion = insertedQuestions[i];
      const originalQuestion = data.questions[i];

      if (originalQuestion.option_images && originalQuestion.option_images.some((img) => img)) {
        const optionImagesData = originalQuestion.option_images
          .map((imageUrl, index) => ({
            question_id: insertedQuestion.id,
            option_index: index,
            image_url: imageUrl,
          }))
          .filter((item) => item.image_url);

        if (optionImagesData.length > 0) {
          const { error: imagesError } = await supabase
            .from("question_option_images")
            .insert(optionImagesData);

          if (imagesError) throw imagesError;
        }
      }
    }

    revalidatePath("/dashboard");
    return { success: true, message: "Quiz créé avec succès" };
  } catch (error) {
    console.error("Error creating quiz:", error);
    throw new Error("Erreur lors de la création du quiz");
  }
}

export async function updateQuiz(data: QuizUpdateData, userId: string) {
  const supabase = await createClient();

  try {
    console.log("🔄 [SERVER] Début de la mise à jour du quiz:", {
      quizId: data.id,
      userId,
      title: data.title,
      questionsCount: data.questions.length
    });

    // Update quiz
    const { error: quizError } = await supabase
      .from("quizzes")
      .update({
        title: data.title,
        description: data.description,
      })
      .eq("id", data.id)
      .eq("user_id", userId);

    if (quizError) {
      console.error("❌ [SERVER] Erreur lors de la mise à jour du quiz:", quizError);
      throw quizError;
    }

    console.log("✅ [SERVER] Quiz mis à jour avec succès");

    // Handle questions
    const activeQuestions = data.questions.filter((q) => !q.toDelete);
    const questionsToUpdate = activeQuestions.filter((q) => !q.isNew);
    const questionsToInsert = activeQuestions.filter((q) => q.isNew);

    // Update existing questions
    for (const question of questionsToUpdate) {
      const { error: updateError } = await supabase
        .from("questions")
        .update({
          question_text: question.question_text,
          options: question.options,
          correct_answer: question.correct_answers[0] || 0,
          correct_answers: question.correct_answers,
          question_image_url: question.question_image_url,
        })
        .eq("id", question.id);

      if (updateError) throw updateError;

      // Handle option images for updated questions
      if (question.option_images && question.option_images.some((img) => img)) {
        // Delete existing option images
        await supabase
          .from("question_option_images")
          .delete()
          .eq("question_id", question.id);

        // Insert new option images
        const optionImagesData = question.option_images
          .map((imageUrl, index) => ({
            question_id: question.id,
            option_index: index,
            image_url: imageUrl,
          }))
          .filter((item) => item.image_url);

        if (optionImagesData.length > 0) {
          const { error: imagesError } = await supabase
            .from("question_option_images")
            .insert(optionImagesData);

          if (imagesError) throw imagesError;
        }
      }
    }

    // Insert new questions
    if (questionsToInsert.length > 0) {
      const questionsData = questionsToInsert.map((question, index) => ({
        quiz_id: data.id,
        question_text: question.question_text,
        options: question.options,
        correct_answer: question.correct_answers[0] || 0,
        correct_answers: question.correct_answers,
        order_index: questionsToUpdate.length + index,
        question_image_url: question.question_image_url,
      }));

      const { data: insertedQuestions, error: insertError } = await supabase
        .from("questions")
        .insert(questionsData)
        .select();

      if (insertError) throw insertError;

      // Handle option images for new questions
      for (let i = 0; i < insertedQuestions.length; i++) {
        const insertedQuestion = insertedQuestions[i];
        const originalQuestion = questionsToInsert[i];

        if (originalQuestion.option_images && originalQuestion.option_images.some((img) => img)) {
          const optionImagesData = originalQuestion.option_images
            .map((imageUrl, index) => ({
              question_id: insertedQuestion.id,
              option_index: index,
              image_url: imageUrl,
            }))
            .filter((item) => item.image_url);

          if (optionImagesData.length > 0) {
            const { error: imagesError } = await supabase
              .from("question_option_images")
              .insert(optionImagesData);

            if (imagesError) throw imagesError;
          }
        }
      }
    }

    // Delete questions marked for deletion
    const questionsToDelete = data.questions.filter((q) => q.toDelete && !q.isNew);
    for (const question of questionsToDelete) {
      const { error: deleteError } = await supabase
        .from("questions")
        .delete()
        .eq("id", question.id);

      if (deleteError) throw deleteError;
    }

    revalidatePath("/dashboard");
    return { success: true, message: "Quiz mis à jour avec succès" };
  } catch (error) {
    console.error("Error updating quiz:", error);
    throw new Error("Erreur lors de la mise à jour du quiz");
  }
}
