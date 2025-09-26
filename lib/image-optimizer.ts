export interface OptimizedImage {
  blob: Blob;
  width: number;
  height: number;
  size: number;
  format: string;
}

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

/**
 * Optimise une image avec Canvas (côté client)
 */
export async function optimizeImage(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImage> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.85,
    format = 'jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      // Calculer les nouvelles dimensions
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      // Configurer le canvas
      canvas.width = width;
      canvas.height = height;

      // Dessiner l'image redimensionnée
      ctx.drawImage(img, 0, 0, width, height);

      // Convertir en blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }

          resolve({
            blob,
            width: Math.round(width),
            height: Math.round(height),
            size: blob.size,
            format
          });
        },
        `image/${format}`,
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Charger l'image
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Créer une miniature d'image
 */
export async function createThumbnail(
  file: File,
  size: number = 300
): Promise<OptimizedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      // Configurer le canvas pour une miniature carrée
      canvas.width = size;
      canvas.height = size;

      // Calculer les dimensions pour un crop centré
      const sourceSize = Math.min(img.width, img.height);
      const sourceX = (img.width - sourceSize) / 2;
      const sourceY = (img.height - sourceSize) / 2;

      // Dessiner l'image croppée
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceSize, sourceSize,
        0, 0, size, size
      );

      // Convertir en blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }

          resolve({
            blob,
            width: size,
            height: size,
            size: blob.size,
            format: 'jpeg'
          });
        },
        'image/jpeg',
        0.8
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Charger l'image
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Convertir une image optimisée en File
 */
export function optimizedImageToFile(
  optimizedImage: OptimizedImage,
  originalFileName: string
): File {
  // Générer un nom de fichier unique
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = optimizedImage.format;
  const fileName = `${timestamp}-${randomString}.${extension}`;
  
  return new File([optimizedImage.blob], fileName, {
    type: `image/${optimizedImage.format}`
  });
}
