import { NextRequest, NextResponse } from 'next/server';
import { optimizeImageServer, createThumbnailServer, getImageMetadata } from '@/lib/server-image-optimizer';

// Configuration pour les gros fichiers
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
  maxDuration: 60, // 60 secondes pour les gros fichiers
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const options = formData.get('options') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    // Valider le type de fichier
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Le fichier doit être une image' },
        { status: 400 }
      );
    }

    // Valider la taille du fichier (20MB max)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Le fichier est trop volumineux (max 20MB)' },
        { status: 413 }
      );
    }

    // Validation supplémentaire pour les images corrompues
    if (file.size === 0) {
      return NextResponse.json(
        { error: 'Le fichier est vide' },
        { status: 400 }
      );
    }

    
    // Parser les options d'optimisation
    let optimizationOptions = {};
    if (options) {
      try {
        optimizationOptions = JSON.parse(options);
      } catch (e) {
        console.warn('Options d\'optimisation invalides, utilisation des valeurs par défaut');
      }
    }

    // Convertir le fichier en buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Obtenir les métadonnées originales
    const originalMetadata = await getImageMetadata(buffer);

    // Optimiser l'image
    const optimizedImage = await optimizeImageServer(buffer, optimizationOptions);

    // Créer une miniature si demandé
    const createThumbnail = formData.get('createThumbnail') === 'true';
    let thumbnail = null;
    
    if (createThumbnail) {
      const thumbnailSize = parseInt(formData.get('thumbnailSize') as string) || 300;
      thumbnail = await createThumbnailServer(buffer, thumbnailSize);
    }

    // Calculer la réduction de taille
    const sizeReduction = ((1 - optimizedImage.size / originalMetadata.size) * 100).toFixed(1);

    return NextResponse.json({
      success: true,
      original: {
        width: originalMetadata.width,
        height: originalMetadata.height,
        size: originalMetadata.size,
        format: originalMetadata.format
      },
      optimized: {
        width: optimizedImage.width,
        height: optimizedImage.height,
        size: optimizedImage.size,
        format: optimizedImage.format,
        buffer: optimizedImage.buffer.toString('base64')
      },
      thumbnail: thumbnail ? {
        width: thumbnail.width,
        height: thumbnail.height,
        size: thumbnail.size,
        format: thumbnail.format,
        buffer: thumbnail.buffer.toString('base64')
      } : null,
      reduction: `${sizeReduction}%`
    });

  } catch (error) {
    console.error('Erreur lors de l\'optimisation de l\'image:', error);
    
    // Gestion spécifique des erreurs
    let errorMessage = 'Erreur lors de l\'optimisation de l\'image';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('Input file is missing')) {
        errorMessage = 'Fichier image corrompu ou illisible';
        statusCode = 400;
      } else if (error.message.includes('unsupported image format')) {
        errorMessage = 'Format d\'image non supporté';
        statusCode = 400;
      } else if (error.message.includes('VipsJpeg') || error.message.includes('Invalid SOS parameters')) {
        errorMessage = 'Image JPEG corrompue. Veuillez utiliser une autre image ou la re-sauvegarder.';
        statusCode = 400;
      } else if (error.message.includes('Image corrompue et impossible à réparer')) {
        errorMessage = 'Image corrompue et impossible à réparer. Veuillez utiliser une autre image.';
        statusCode = 400;
      } else if (error.message.includes('memory')) {
        errorMessage = 'Image trop volumineuse pour être traitée';
        statusCode = 413;
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Traitement de l\'image trop long';
        statusCode = 408;
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: statusCode }
    );
  }
}

// Endpoint pour obtenir uniquement les métadonnées
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');
    
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'URL de l\'image requise' },
        { status: 400 }
      );
    }

    // Télécharger l'image depuis l'URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error('Impossible de télécharger l\'image');
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const metadata = await getImageMetadata(buffer);

    return NextResponse.json({
      success: true,
      metadata
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Erreur lors de la lecture des métadonnées',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
