"use client";

import { useState, useCallback } from "react";
import { uploadQuizImage } from "@/app/actions/image-actions";

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
      // Optimiser l'image côté serveur
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('options', JSON.stringify({
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 85,
        format: 'webp'
      }));
      formData.append('createThumbnail', 'true');
      formData.append('thumbnailSize', '300');

      const optimizeResponse = await fetch('/api/optimize-image', {
        method: 'POST',
        body: formData,
      });

      if (!optimizeResponse.ok) {
        throw new Error('Erreur lors de l\'optimisation de l\'image');
      }

      const optimizeResult = await optimizeResponse.json();
      
      if (!optimizeResult.success) {
        throw new Error(optimizeResult.error || 'Erreur d\'optimisation');
      }


      // Convertir le buffer optimisé en File
      const optimizedBuffer = Buffer.from(optimizeResult.optimized.buffer, 'base64');
      const webpFileName = file.name.replace(/\.[^/.]+$/, ".webp");
      const optimizedFile = new File([optimizedBuffer], webpFileName, {
        type: 'image/webp'
      });

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
        onSuccess?.(result.url);
        return result.url;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
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
