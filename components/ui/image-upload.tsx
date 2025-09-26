"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Upload, Image as ImageIcon } from "lucide-react";
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

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("L'image doit faire moins de 5MB");
      return;
    }

    setIsUploading(true);

    try {
      // Upload to Supabase Storage
      const result = await uploadImageToStorage(file, path);
      onChange(result.url);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Erreur lors de l'upload de l'image");
    } finally {
      setIsUploading(false);
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-20 h-20 p-0 flex flex-col items-center justify-center border-dashed">
          {isUploading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
          ) : (
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
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
