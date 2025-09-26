import { createClient } from './client';

export interface UploadImageResult {
  url: string;
  path: string;
}

export async function uploadImageToStorage(
  file: File,
  path: string
): Promise<UploadImageResult> {
  const supabase = createClient();
  
  // Generate unique filename
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const fileExtension = file.name.split('.').pop();
  const fileName = `${timestamp}-${randomString}.${fileExtension}`;
  const fullPath = `${path}/${fileName}`;

  // Upload file to Supabase Storage
  const { data, error } = await supabase.storage
    .from('quiz-images')
    .upload(fullPath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error(`Erreur lors de l'upload: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('quiz-images')
    .getPublicUrl(fullPath);

  return {
    url: urlData.publicUrl,
    path: fullPath
  };
}

export async function deleteImageFromStorage(path: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase.storage
    .from('quiz-images')
    .remove([path]);

  if (error) {
    console.error('Erreur lors de la suppression:', error);
    // Don't throw error for deletion failures
  }
}

export function getImageUrl(path: string): string {
  const supabase = createClient();
  
  const { data } = supabase.storage
    .from('quiz-images')
    .getPublicUrl(path);

  return data.publicUrl;
}
