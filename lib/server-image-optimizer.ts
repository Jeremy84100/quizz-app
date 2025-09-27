import sharp from 'sharp';

export interface ServerOptimizedImage {
  buffer: Buffer;
  width: number;
  height: number;
  size: number;
  format: string;
}

export interface ServerImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
}

/**
 * Optimise une image côté serveur avec Sharp
 */
export async function optimizeImageServer(
  buffer: Buffer,
  options: ServerImageOptimizationOptions = {}
): Promise<ServerOptimizedImage> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 85,
    format = 'webp'
  } = options;

  try {
    // Obtenir les métadonnées de l'image originale
    const metadata = await sharp(buffer).metadata();
    const { width: originalWidth, height: originalHeight } = metadata;

    if (!originalWidth || !originalHeight) {
      throw new Error('Impossible de lire les métadonnées de l\'image');
    }

    // Calculer les nouvelles dimensions
    let { width, height } = metadata;
    
    if (width! > maxWidth || height! > maxHeight) {
      const ratio = Math.min(maxWidth / width!, maxHeight / height!);
      width = Math.round(width! * ratio);
      height = Math.round(height! * ratio);
    }

    // Créer l'instance Sharp avec redimensionnement
    let sharpInstance = sharp(buffer)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      });

    // Appliquer le format et la qualité
    switch (format) {
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg({ quality });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({ quality });
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality });
        break;
      case 'avif':
        sharpInstance = sharpInstance.avif({ quality });
        break;
      default:
        sharpInstance = sharpInstance.webp({ quality });
    }

    // Optimiser l'image
    const optimizedBuffer = await sharpInstance.toBuffer();
    const optimizedMetadata = await sharp(optimizedBuffer).metadata();

    return {
      buffer: optimizedBuffer,
      width: optimizedMetadata.width!,
      height: optimizedMetadata.height!,
      size: optimizedBuffer.length,
      format
    };
  } catch (error) {
    throw new Error(`Échec de l'optimisation de l'image: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}

/**
 * Créer une miniature d'image côté serveur
 */
export async function createThumbnailServer(
  buffer: Buffer,
  size: number = 300
): Promise<ServerOptimizedImage> {
  try {
    const metadata = await sharp(buffer).metadata();
    const { width: originalWidth, height: originalHeight } = metadata;

    if (!originalWidth || !originalHeight) {
      throw new Error('Impossible de lire les métadonnées de l\'image');
    }

    // Calculer les dimensions pour un crop centré
    const sourceSize = Math.min(originalWidth, originalHeight);
    const sourceX = Math.round((originalWidth - sourceSize) / 2);
    const sourceY = Math.round((originalHeight - sourceSize) / 2);

    // Créer la miniature avec crop centré
    const thumbnailBuffer = await sharp(buffer)
      .extract({
        left: sourceX,
        top: sourceY,
        width: sourceSize,
        height: sourceSize
      })
      .resize(size, size, {
        fit: 'cover'
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    const thumbnailMetadata = await sharp(thumbnailBuffer).metadata();

    return {
      buffer: thumbnailBuffer,
      width: thumbnailMetadata.width!,
      height: thumbnailMetadata.height!,
      size: thumbnailBuffer.length,
      format: 'jpeg'
    };
  } catch (error) {
    throw new Error(`Échec de la création de la miniature: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}

/**
 * Obtenir les métadonnées d'une image
 */
export async function getImageMetadata(buffer: Buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: buffer.length,
      hasAlpha: metadata.hasAlpha,
      channels: metadata.channels
    };
  } catch (error) {
    throw new Error(`Impossible de lire les métadonnées de l'image: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}
