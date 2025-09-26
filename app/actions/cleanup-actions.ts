"use server";

import { createClient } from "@/lib/supabase/server";

export async function cleanupOrphanedImages() {
  const supabase = await createClient();
  
  try {
    console.log("🧹 [CLEANUP] Début du nettoyage des images orphelines...");
    
    // 1. Récupérer toutes les images du bucket
    const { data: allImages, error: listError } = await supabase.storage
      .from('quiz-images')
      .list('', { limit: 1000 });
    
    if (listError) {
      console.error("❌ [CLEANUP] Erreur lors de la récupération des images:", listError);
      return { success: false, error: "Erreur lors de la récupération des images" };
    }
    
    // 2. Récupérer les images utilisées
    const { data: optionImages } = await supabase
      .from('question_option_images')
      .select('image_url');
    
    const { data: questionImages } = await supabase
      .from('questions')
      .select('question_image_url')
      .not('question_image_url', 'is', null);
    
    // 3. Créer un Set des chemins utilisés
    const usedPaths = new Set();
    
    optionImages?.forEach(img => {
      if (img.image_url && img.image_url.includes('quiz-images/')) {
        const path = img.image_url.split('quiz-images/')[1];
        usedPaths.add(path);
      }
    });
    
    questionImages?.forEach(q => {
      if (q.question_image_url && q.question_image_url.includes('quiz-images/')) {
        const path = q.question_image_url.split('quiz-images/')[1];
        usedPaths.add(path);
      }
    });
    
    // 4. Identifier les images orphelines
    const orphanedImages = allImages.filter(img => !usedPaths.has(img.name));
    
    console.log(`🗑️ [CLEANUP] ${orphanedImages.length} images orphelines trouvées`);
    
    if (orphanedImages.length === 0) {
      return { success: true, message: "Aucune image orpheline à nettoyer", deletedCount: 0 };
    }
    
    // 5. Supprimer les images orphelines
    const pathsToDelete = orphanedImages.map(img => img.name);
    const { error: deleteError } = await supabase.storage
      .from('quiz-images')
      .remove(pathsToDelete);
    
    if (deleteError) {
      console.error("❌ [CLEANUP] Erreur lors de la suppression:", deleteError);
      return { success: false, error: "Erreur lors de la suppression des images" };
    }
    
    console.log(`✅ [CLEANUP] ${orphanedImages.length} images orphelines supprimées`);
    
    return { 
      success: true, 
      message: `${orphanedImages.length} images orphelines supprimées`,
      deletedCount: orphanedImages.length
    };
    
  } catch (error) {
    console.error("❌ [CLEANUP] Erreur générale:", error);
    return { success: false, error: "Erreur lors du nettoyage" };
  }
}
