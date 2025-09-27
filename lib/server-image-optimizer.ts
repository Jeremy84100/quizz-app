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
    // Vérifier d'abord si l'image est valide
    let metadata;
    try {
      metadata = await sharp(buffer).metadata();
    } catch (error) {
      // Si l'image est corrompue, essayer de la réparer
      try {
        // Essayer de réparer l'image en la re-encodant
        const repairedBuffer = await sharp(buffer)
          .jpeg({ quality: 90, progressive: false })
          .toBuffer();
        metadata = await sharp(repairedBuffer).metadata();
        buffer = repairedBuffer; // Utiliser l'image réparée
      } catch (repairError) {
        throw new Error('Image corrompue et impossible à réparer. Veuillez utiliser une autre image.');
      }
    }

    const { width: originalWidth, height: originalHeight } = metadata;

    if (!originalWidth || !originalHeight) {
      throw new Error('Impossible de lire les métadonnées de l\'image');
    }

    // Détecter si c'est une image 4K ou très haute résolution
    const isHighRes = originalWidth > 3000 || originalHeight > 3000;
    const isVeryLarge = buffer.length > 10 * 1024 * 1024; // Plus de 10MB

    // Ajuster les paramètres pour les images 4K
    let adjustedMaxWidth = maxWidth;
    let adjustedMaxHeight = maxHeight;
    let adjustedQuality = quality;

    if (isHighRes || isVeryLarge) {
      // Pour les images 4K, on peut garder une résolution plus élevée
      adjustedMaxWidth = Math.max(maxWidth, 2000);
      adjustedMaxHeight = Math.max(maxHeight, 2000);
      // Réduire légèrement la qualité pour compenser la taille
      adjustedQuality = Math.max(quality - 5, 75);
    }

    // Calculer les nouvelles dimensions
    let { width, height } = metadata;
    
    if (width! > adjustedMaxWidth || height! > adjustedMaxHeight) {
      const ratio = Math.min(adjustedMaxWidth / width!, adjustedMaxHeight / height!);
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
        sharpInstance = sharpInstance.jpeg({ quality: adjustedQuality });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({ quality: adjustedQuality });
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality: adjustedQuality });
        break;
      case 'avif':
        sharpInstance = sharpInstance.avif({ quality: adjustedQuality });
        break;
      default:
        sharpInstance = sharpInstance.webp({ quality: adjustedQuality });
    }

    // Optimiser l'image
    let optimizedBuffer;
    let optimizedMetadata;
    
    try {
      optimizedBuffer = await sharpInstance.toBuffer();
      optimizedMetadata = await sharp(optimizedBuffer).metadata();
    } catch (sharpError) {
      // Essayer une approche alternative pour les JPEG corrompus
      if (sharpError instanceof Error && sharpError.message.includes('VipsJpeg')) {
        try {
          // Essayer de traiter l'image avec des paramètres plus conservateurs
          const alternativeInstance = sharp(buffer)
            .resize(width, height, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ 
              quality: Math.max(adjustedQuality - 10, 60),
              progressive: false,
              mozjpeg: false
            });
          
          optimizedBuffer = await alternativeInstance.toBuffer();
          optimizedMetadata = await sharp(optimizedBuffer).metadata();
        } catch (repairError) {
          try {
            // Dernière tentative avec des paramètres ultra-conservateurs
            const ultraConservativeInstance = sharp(buffer)
              .resize(width, height, {
                fit: 'inside',
                withoutEnlargement: true
              })
              .jpeg({ 
                quality: 50,
                progressive: false,
                mozjpeg: false,
                force: true
              });
            
            optimizedBuffer = await ultraConservativeInstance.toBuffer();
            optimizedMetadata = await sharp(optimizedBuffer).metadata();
          } catch (ultraError) {
            try {
              // Dernière chance : convertir en PNG puis en WebP
              const pngInstance = sharp(buffer)
                .resize(width, height, {
                  fit: 'inside',
                  withoutEnlargement: true
                })
                .png({ 
                  quality: 80,
                  force: true
                });
              
              const pngBuffer = await pngInstance.toBuffer();
              const webpInstance = sharp(pngBuffer).webp({ quality: 80 });
              optimizedBuffer = await webpInstance.toBuffer();
              optimizedMetadata = await sharp(optimizedBuffer).metadata();
            } catch (pngError) {
              throw new Error('Image JPEG corrompue et impossible à réparer. Veuillez utiliser une autre image ou la re-sauvegarder avec un autre logiciel.');
            }
          }
        }
      } else {
        throw sharpError;
      }
    }

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
