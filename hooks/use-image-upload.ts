"use client";

import { useState, useCallback } from "react";
import { uploadQuizImage } from "@/app/actions/image-actions";
import { optimizeImage, optimizedImageToFile } from "@/lib/image-optimizer";

interface UseImageUploadOptions {
  quizId: string;
  onSuccess?: (url: string) => void;
  onError?: (error: string) => void;
}

export function useImageUpload({ quizId, onSuccess, onError }: UseImageUploadOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadImage = useCallback(async (
    file: File,
    questionId: string,
    type: "question" | "option",
    optionIndex?: number
  ) => {
    if (!file) return null;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      console.log("🖼️ [CLIENT] Début de l'upload d'image:", {
        fileName: file.name,
        fileSize: file.size,
        type,
        questionId,
        optionIndex
      });

      // Optimize image client-side first
      console.log("🔧 [CLIENT] Optimisation de l'image en WebP...");
      const optimizedImage = await optimizeImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.85,
        format: "webp",
      });

      console.log("✅ [CLIENT] Image optimisée:", {
        width: optimizedImage.width,
        height: optimizedImage.height,
        size: optimizedImage.size,
        reduction: ((1 - optimizedImage.size / file.size) * 100).toFixed(1) + "%"
      });

      // Convert to File with .webp extension
      const webpFileName = file.name.replace(/\.[^/.]+$/, ".webp");
      const optimizedFile = optimizedImageToFile(optimizedImage, webpFileName);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const result = await uploadQuizImage({
        file: optimizedFile,
        quizId,
        questionId,
        type,
        optionIndex
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success) {
        console.log("✅ [CLIENT] Upload réussi:", result.url);
        onSuccess?.(result.url);
        return result.url;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("❌ [CLIENT] Erreur d'upload:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur d'upload";
      onError?.(errorMessage);
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [quizId, onSuccess, onError]);

  return {
    uploadImage,
    isUploading,
    uploadProgress
  };
}
