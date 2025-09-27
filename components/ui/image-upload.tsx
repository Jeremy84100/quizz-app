"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import { ImageZoom } from "@/components/ui/image-zoom";
import {
  uploadImageToStorage,
  deleteImageFromStorage,
} from "@/lib/supabase/storage";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string | null) => void;
  placeholder?: string;
  className?: string;
  path?: string; // Path in storage bucket
}

export function ImageUpload({
  value,
  onChange,
  placeholder = "Ajouter une image",
  className = "",
  path = "uploads",
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Veuillez sélectionner un fichier image");
      return;
    }

    // Validate file size (max 20MB - plus généreux car l'optimisation se fait côté serveur)
    if (file.size > 20 * 1024 * 1024) {
      alert("L'image doit faire moins de 20MB");
      return;
    }

    // Validation supplémentaire
    if (file.size === 0) {
      alert("Le fichier est vide");
      return;
    }

    // Vérifier que le fichier n'est pas corrompu en essayant de le lire
    try {
      const testUrl = URL.createObjectURL(file);
      const testImg = new window.Image();

      const imageCheck = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          URL.revokeObjectURL(testUrl);
          reject(new Error("Timeout lors de la validation"));
        }, 5000); // 5 secondes de timeout

        testImg.onload = () => {
          clearTimeout(timeout);
          URL.revokeObjectURL(testUrl);
          resolve(true);
        };
        testImg.onerror = () => {
          clearTimeout(timeout);
          URL.revokeObjectURL(testUrl);
          reject(new Error("Image corrompue"));
        };
        testImg.src = testUrl;
      });

      await imageCheck;
    } catch (error) {
      alert(
        "L'image semble corrompue. Veuillez utiliser une autre image ou la re-sauvegarder avec un autre logiciel (comme GIMP, Photoshop, ou un convertisseur en ligne)."
      );
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simuler la progression pour les gros fichiers
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 5, 90));
      }, 200);

      // Optimiser l'image côté serveur avant l'upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "options",
        JSON.stringify({
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 85,
          format: "webp",
        })
      );
      formData.append("createThumbnail", "true");
      formData.append("thumbnailSize", "300");

      const optimizeResponse = await fetch("/api/optimize-image", {
        method: "POST",
        body: formData,
      });

      if (!optimizeResponse.ok) {
        const errorData = await optimizeResponse.json().catch(() => ({}));
        const errorMessage =
          errorData.error || "Erreur lors de l'optimisation de l'image";
        throw new Error(errorMessage);
      }

      const optimizeResult = await optimizeResponse.json();

      if (!optimizeResult.success) {
        throw new Error(optimizeResult.error || "Erreur d'optimisation");
      }

      // Convertir le buffer optimisé en File
      const optimizedBuffer = Buffer.from(
        optimizeResult.optimized.buffer,
        "base64"
      );
      const optimizedFile = new File(
        [optimizedBuffer],
        file.name.replace(/\.[^/.]+$/, ".webp"),
        {
          type: "image/webp",
        }
      );

      // Upload de l'image optimisée vers Supabase Storage
      const result = await uploadImageToStorage(optimizedFile, path);

      // Finaliser la progression
      clearInterval(progressInterval);
      setUploadProgress(100);

      onChange(result.url);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Erreur lors de l'upload de l'image";
      alert(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveImage = () => {
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`${className}`}>
      {value ? (
        <div className="relative inline-block">
          <div className="relative w-20 h-20 border rounded-lg overflow-hidden">
            <ImageZoom>
              <img
                src={value}
                alt="Image"
                className="w-full h-full object-cover cursor-zoom-in"
                onClick={(e) => e.stopPropagation()}
              />
            </ImageZoom>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleRemoveImage}
            className="absolute -top-2 -right-2 h-6 w-6 p-0">
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-20 h-20 p-0 flex flex-col items-center justify-center border-dashed">
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          {isUploading && (
            <div className="absolute -bottom-8 left-0 right-0 text-xs text-center text-muted-foreground">
              <div className="flex items-center justify-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Optimisation...</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                <div
                  className="bg-primary h-1 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
