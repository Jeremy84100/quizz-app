"use server";

import { createClient } from "@/lib/supabase/server";
import { uploadImageToStorage } from "@/lib/supabase/storage";

export interface ImageUploadData {
  file: File;
  quizId: string;
  questionId: string;
  type: "question" | "option";
  optionIndex?: number;
}

export async function uploadQuizImage(data: ImageUploadData) {
  try {
    console.log("🚀 [SERVER] Début de l'upload d'image:", {
      quizId: data.quizId,
      questionId: data.questionId,
      type: data.type,
      optionIndex: data.optionIndex,
      fileName: data.file.name,
      fileSize: data.file.size
    });

    // Determine upload path
    const path = data.type === "question" 
      ? `quiz-questions/${data.quizId}/${data.questionId}`
      : `quiz-options/${data.quizId}/${data.questionId}`;

    console.log("📁 [SERVER] Chemin d'upload:", path);

    // Upload directly to Supabase Storage (optimization will be done client-side)
    const result = await uploadImageToStorage(data.file, path);

    console.log("✅ [SERVER] Image uploadée avec succès:", result.url);

    return {
      success: true,
      url: result.url,
      path: result.path
    };
  } catch (error) {
    console.error("❌ [SERVER] Erreur lors de l'upload:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    };
  }
}

export async function deleteQuizImage(imageUrl: string) {
  try {
    console.log("🗑️ [SERVER] Suppression de l'image:", imageUrl);

    const supabase = createClient();
    
    // Extract path from URL
    const urlParts = imageUrl.split("/");
    const bucketIndex = urlParts.indexOf("quiz-images");
    if (bucketIndex === -1 || bucketIndex + 1 >= urlParts.length) {
      throw new Error("URL d'image invalide");
    }
    
    const path = urlParts.slice(bucketIndex + 1).join("/");
    
    // Delete from storage
    const { error } = await supabase.storage
      .from("quiz-images")
      .remove([path]);

    if (error) throw error;

    console.log("✅ [SERVER] Image supprimée avec succès");

    return { success: true };
  } catch (error) {
    console.error("❌ [SERVER] Erreur lors de la suppression:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    };
  }
}
