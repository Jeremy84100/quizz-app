# Configuration du stockage d'images

Ce guide explique comment configurer le bucket Supabase pour stocker les images des quiz.

## Prérequis

1. Un projet Supabase configuré
2. Les variables d'environnement suivantes dans votre fichier `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Configuration automatique

### 1. Créer le bucket

Exécutez la commande suivante pour créer le bucket automatiquement :

```bash
npm run setup-storage
```

### 2. Exécuter les scripts SQL

**Option A : Script complet (Recommandé)**
```sql
-- Voir le fichier: scripts/010_complete_storage_setup.sql
```

**Option B : Script simple (bucket seulement)**
```sql
-- Voir le fichier: scripts/009_create_bucket_only.sql
```

**Option C : Script original**
```sql
-- Voir le fichier: scripts/005_create_images_bucket.sql
```

## Configuration manuelle (si erreur de permissions)

Si vous obtenez l'erreur `42501: must be owner of table objects`, vous avez plusieurs options :

### Option 1 : Guide détaillé (Recommandé)
📖 **Voir le fichier : `scripts/006_manual_bucket_setup.md`**

### Option 2 : Script SQL simple
Exécutez le script SQL suivant pour vérifier la configuration :

```sql
-- Voir le fichier: scripts/008_simple_storage_setup.sql
```

### Option 3 : Configuration via l'interface Supabase
1. **Créez le bucket manuellement** dans Storage
2. **Configurez les politiques RLS** dans Authentication > Policies
3. **Suivez les instructions** dans le script `008_simple_storage_setup.sql`

## Configuration manuelle

Si la configuration automatique ne fonctionne pas, vous pouvez configurer manuellement :

### 1. Créer le bucket dans Supabase

1. Allez dans votre dashboard Supabase
2. Naviguez vers "Storage" dans le menu de gauche
3. Cliquez sur "Create a new bucket"
4. Nom : `quiz-images`
5. Public : ✅ Activé
6. File size limit : `5242880` (5MB)
7. Allowed MIME types : `image/jpeg,image/png,image/gif,image/webp`

### 2. Configurer les politiques RLS

Exécutez le script SQL `scripts/005_create_images_bucket.sql` dans l'éditeur SQL de Supabase.

## Vérification

Pour vérifier que tout fonctionne :

1. Redémarrez votre application : `npm run dev`
2. Créez un nouveau quiz
3. Essayez d'ajouter une image à une question ou une réponse
4. Vérifiez que l'image s'affiche correctement

## Structure des fichiers

Les images sont organisées dans le bucket comme suit :

```
quiz-images/
├── quiz-questions/
│   └── [quiz-id]/
│       └── [question-id]/
│           └── [timestamp]-[random].jpg
└── quiz-options/
    └── [quiz-id]/
        └── [question-id]/
            └── [timestamp]-[random].jpg
```

### Avantages de cette organisation :

- **Isolation par quiz** : Chaque quiz a ses propres dossiers
- **Facilité de suppression** : Supprimer un quiz supprime toutes ses images
- **Meilleure organisation** : Structure claire et logique
- **Sécurité** : Isolation des données entre les quiz

## Dépannage

### Erreur "Bucket not found"
- Vérifiez que le bucket `quiz-images` existe dans Supabase Storage
- Vérifiez que les politiques RLS sont correctement configurées

### Erreur "Permission denied"
- Vérifiez que l'utilisateur est authentifié
- Vérifiez les politiques RLS pour l'upload

### Images ne s'affichent pas
- Vérifiez que le bucket est public
- Vérifiez que les URLs générées sont correctes
- Vérifiez la console du navigateur pour les erreurs CORS

## Support

Si vous rencontrez des problèmes, vérifiez :

1. Les logs de la console du navigateur
2. Les logs de Supabase dans le dashboard
3. La configuration des variables d'environnement
4. Les politiques RLS dans Supabase
