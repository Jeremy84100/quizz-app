"use client";

import type React from "react";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUpload } from "@/components/ui/image-upload";
import { uploadImageToStorage } from "@/lib/supabase/storage";
import { optimizeImage, optimizedImageToFile } from "@/lib/image-optimizer";
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Sparkles,
  Shuffle,
  Image as ImageIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ImageZoom } from "@/components/ui/image-zoom";

interface Question {
  id: string;
  question_text: string;
  question_image_url?: string;
  options: string[];
  option_images?: (string | null)[];
  correct_answer: number; // Keep for backward compatibility
  correct_answers: number[]; // New field for multiple correct answers
}

interface QuizCreationFormProps {
  userId: string;
}

export function QuizCreationForm({ userId }: QuizCreationFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: crypto.randomUUID(),
      question_text: "",
      question_image_url: undefined,
      options: ["", "", "", ""],
      option_images: [null, null, null, null],
      correct_answer: 0,
      correct_answers: [0],
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: crypto.randomUUID(),
        question_text: "",
        question_image_url: undefined,
        options: ["", "", "", ""],
        option_images: [null, null, null, null],
        correct_answer: 0,
        correct_answers: [0],
      },
    ]);
  };

  const removeQuestion = (questionId: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((q) => q.id !== questionId));
    }
  };

  const updateQuestion = (
    questionId: string,
    field: keyof Question,
    value: any
  ) => {
    setQuestions(
      questions.map((q) => (q.id === questionId ? { ...q, [field]: value } : q))
    );
  };

  const updateOption = (
    questionId: string,
    optionIndex: number,
    value: string
  ) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((opt, idx) =>
                idx === optionIndex ? value : opt
              ),
            }
          : q
      )
    );
  };

  const updateQuestionImage = (questionId: string, imageUrl: string | null) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? { ...q, question_image_url: imageUrl || undefined }
          : q
      )
    );
  };

  const updateOptionImage = (
    questionId: string,
    optionIndex: number,
    imageUrl: string | null
  ) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              option_images:
                q.option_images?.map((img, idx) =>
                  idx === optionIndex ? imageUrl : img
                ) || [],
            }
          : q
      )
    );
  };

  const [currentUpload, setCurrentUpload] = useState<{
    questionId: string;
    optionIndex?: number;
    type: "question" | "option";
  } | null>(null);

  // Stockage temporaire des images optimisées
  const [tempImages, setTempImages] = useState<Map<string, File>>(new Map());

  const handleImageUpload = (questionId: string, optionIndex: number) => {
    setCurrentUpload({ questionId, optionIndex, type: "option" });
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleQuestionImageUpload = (questionId: string) => {
    setCurrentUpload({ questionId, type: "question" });
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const uploadImagesToStorage = async (quizId: string) => {
    console.log(
      "🚀 [UPLOAD] Début de l'upload des images pour le quiz:",
      quizId
    );
    console.log("📸 [UPLOAD] Nombre d'images à uploader:", tempImages.size);

    const uploadPromises: Promise<void>[] = [];

    for (const [imageKey, imageFile] of tempImages) {
      console.log(`📁 [UPLOAD] Traitement de l'image: ${imageKey}`);
      console.log(
        `📊 [UPLOAD] Taille du fichier: ${(imageFile.size / 1024).toFixed(
          2
        )} KB`
      );

      const uploadPromise = (async () => {
        try {
          let result;
          if (imageKey.startsWith("question-")) {
            const questionId = imageKey.replace("question-", "");
            console.log(`❓ [UPLOAD] Upload image de question: ${questionId}`);

            result = await uploadImageToStorage(
              imageFile,
              `quiz-questions/${quizId}/${questionId}`
            );

            console.log(`✅ [UPLOAD] Image de question uploadée:`, result.url);
            console.log(
              `📁 [UPLOAD] Chemin dans le bucket: quiz-questions/${quizId}/${questionId}`
            );

            // Mettre à jour l'URL de l'image de question
            updateQuestionImage(questionId, result.url);
            console.log(
              `🔄 [UPLOAD] URL mise à jour dans l'état pour la question: ${questionId}`
            );
          } else if (imageKey.startsWith("option-")) {
            // Parse option-{questionId}-{optionIndex}
            const parts = imageKey.split("-");
            const optionIndex = parts[parts.length - 1]; // Last part is option index
            const questionId = parts.slice(1, -1).join("-"); // Everything between "option" and last part
            console.log(
              `🔘 [UPLOAD] Upload image d'option: question ${questionId}, option ${optionIndex}`
            );

            result = await uploadImageToStorage(
              imageFile,
              `quiz-options/${quizId}/${questionId}`
            );

            console.log(`✅ [UPLOAD] Image d'option uploadée:`, result.url);
            console.log(
              `📁 [UPLOAD] Chemin dans le bucket: quiz-options/${quizId}/${questionId}`
            );

            // Mettre à jour l'URL de l'image d'option
            updateOptionImage(questionId, parseInt(optionIndex), result.url);
            console.log(
              `🔄 [UPLOAD] URL mise à jour dans l'état pour l'option ${optionIndex} de la question ${questionId}`
            );
          }
        } catch (error) {
          console.error(
            `❌ [UPLOAD] Erreur lors de l'upload de l'image ${imageKey}:`,
            error
          );
        }
      })();

      uploadPromises.push(uploadPromise);
    }

    console.log("⏳ [UPLOAD] Attente de la fin de tous les uploads...");

    // Attendre que tous les uploads soient terminés
    await Promise.all(uploadPromises);

    console.log("✅ [UPLOAD] Tous les uploads terminés avec succès!");
    console.log("🧹 [UPLOAD] Nettoyage des images temporaires...");

    // Nettoyer les images temporaires
    setTempImages(new Map());

    console.log("🎉 [UPLOAD] Processus d'upload terminé!");
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !currentUpload) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Veuillez sélectionner un fichier image");
      return;
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      alert("L'image doit faire moins de 20MB");
      return;
    }

    try {
      console.log("🖼️ [OPTIMIZE] Début de l'optimisation de l'image");
      console.log(
        "📊 [OPTIMIZE] Taille originale:",
        (file.size / 1024).toFixed(2),
        "KB"
      );
      console.log("📝 [OPTIMIZE] Nom du fichier:", file.name);
      console.log("🎯 [OPTIMIZE] Type d'upload:", currentUpload.type);

      // Optimiser l'image avec Canvas
      const optimizedImage = await optimizeImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.85,
        format: "jpeg",
      });

      console.log("✅ [OPTIMIZE] Image optimisée:");
      console.log(
        "📏 [OPTIMIZE] Dimensions:",
        optimizedImage.width,
        "x",
        optimizedImage.height
      );
      console.log(
        "📊 [OPTIMIZE] Taille optimisée:",
        (optimizedImage.size / 1024).toFixed(2),
        "KB"
      );
      console.log(
        "📈 [OPTIMIZE] Réduction:",
        ((1 - optimizedImage.size / file.size) * 100).toFixed(1),
        "%"
      );

      // Convertir en File optimisé
      const optimizedFile = optimizedImageToFile(optimizedImage, file.name);

      // Générer une clé unique pour le stockage temporaire
      const imageKey =
        currentUpload.type === "question"
          ? `question-${currentUpload.questionId}`
          : `option-${currentUpload.questionId}-${currentUpload.optionIndex}`;

      console.log("🔑 [OPTIMIZE] Clé de stockage temporaire:", imageKey);

      // Stocker l'image optimisée temporairement
      setTempImages((prev) => new Map(prev.set(imageKey, optimizedFile)));
      console.log("💾 [OPTIMIZE] Image stockée temporairement");

      // Créer une URL temporaire pour l'aperçu
      const tempUrl = URL.createObjectURL(optimizedFile);
      console.log("🔗 [OPTIMIZE] URL temporaire créée:", tempUrl);

      // Mettre à jour l'état avec l'URL temporaire
      if (currentUpload.type === "question") {
        updateQuestionImage(currentUpload.questionId, tempUrl);
        console.log(
          "🔄 [OPTIMIZE] URL mise à jour pour la question:",
          currentUpload.questionId
        );
      } else {
        updateOptionImage(
          currentUpload.questionId,
          currentUpload.optionIndex!,
          tempUrl
        );
        console.log(
          "🔄 [OPTIMIZE] URL mise à jour pour l'option:",
          currentUpload.optionIndex,
          "de la question:",
          currentUpload.questionId
        );
      }

      setCurrentUpload(null);
      console.log("🎉 [OPTIMIZE] Optimisation terminée avec succès!");
    } catch (error) {
      console.error(
        "❌ [OPTIMIZE] Erreur lors de l'optimisation de l'image:",
        error
      );
      alert("Erreur lors de l'optimisation de l'image");
      setCurrentUpload(null);
    }
  };

  const addOption = (questionId: string) => {
    console.log("Adding option for question:", questionId);
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const currentOptionImages = q.option_images || [];
          const newQuestion = {
            ...q,
            options: [...q.options, ""],
            option_images: [...currentOptionImages, null],
          };
          console.log("New question:", newQuestion);
          return newQuestion;
        }
        return q;
      })
    );
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const newOptions = q.options.filter((_, idx) => idx !== optionIndex);
          const newOptionImages = (q.option_images || []).filter(
            (_, idx) => idx !== optionIndex
          );

          // Adjust correct_answers indices
          const newCorrectAnswers = (q.correct_answers || [])
            .map((idx) => {
              if (idx > optionIndex) return idx - 1;
              if (idx === optionIndex) return -1; // Remove this answer
              return idx;
            })
            .filter((idx) => idx !== -1);

          return {
            ...q,
            options: newOptions,
            option_images: newOptionImages,
            correct_answers:
              newCorrectAnswers.length > 0 ? newCorrectAnswers : [0],
            correct_answer: newCorrectAnswers[0] || 0,
          };
        }
        return q;
      })
    );
  };

  const toggleCorrectAnswer = (questionId: string, optionIndex: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const currentCorrectAnswers = q.correct_answers || [];
          const isCurrentlyCorrect =
            currentCorrectAnswers.includes(optionIndex);

          let newCorrectAnswers;
          if (isCurrentlyCorrect) {
            // Remove from correct answers
            newCorrectAnswers = currentCorrectAnswers.filter(
              (idx) => idx !== optionIndex
            );
          } else {
            // Add to correct answers
            newCorrectAnswers = [...currentCorrectAnswers, optionIndex];
          }

          // Ensure at least one correct answer
          if (newCorrectAnswers.length === 0) {
            newCorrectAnswers = [optionIndex];
          }

          return {
            ...q,
            correct_answers: newCorrectAnswers,
            correct_answer: newCorrectAnswers[0], // Keep first one for backward compatibility
          };
        }
        return q;
      })
    );
  };

  const generateDistractors = async (questionId: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (
      !question ||
      !question.question_text.trim() ||
      !question.options[question.correct_answer]?.trim()
    ) {
      setError("Veuillez d'abord remplir la question et la réponse correcte");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-distractors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questions: [
            {
              question: question.question_text.trim(),
              correctAnswer: question.options[question.correct_answer].trim(),
            },
          ],
          count: 3,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la génération des fausses réponses");
      }

      const data = await response.json();
      const distractors = data.results[0]?.distractors || [];

      if (distractors.length > 0) {
        // Remplacer les options vides par les distracteurs générés
        const newOptions = [...question.options];
        let distractorIndex = 0;

        for (
          let i = 0;
          i < newOptions.length && distractorIndex < distractors.length;
          i++
        ) {
          if (
            i !== question.correct_answer &&
            (!newOptions[i] || newOptions[i].trim() === "")
          ) {
            newOptions[i] = distractors[distractorIndex];
            distractorIndex++;
          }
        }

        updateQuestion(questionId, "options", newOptions);
      }
    } catch (error) {
      console.error("Erreur génération distracteurs:", error);
      setError("Erreur lors de la génération des fausses réponses");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateRandomAnswers = (questionId: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    // Vérifier qu'il y a au moins 4 questions dans le quiz
    if (questions.length < 4) {
      setError(
        "Il faut au moins 4 questions dans le quiz pour utiliser cette fonctionnalité"
      );
      return;
    }

    // Récupérer toutes les réponses correctes des autres questions
    const otherQuestions = questions.filter((q) => q.id !== questionId);
    const availableAnswers = otherQuestions
      .map((q) => q.options[q.correct_answer])
      .filter((answer) => answer && answer.trim() !== "");

    if (availableAnswers.length === 0) {
      setError("Aucune réponse correcte trouvée dans les autres questions");
      return;
    }

    // Mélanger les réponses disponibles
    const shuffledAnswers = [...availableAnswers].sort(
      () => Math.random() - 0.5
    );

    // Remplacer les options vides par les réponses aléatoires
    const newOptions = [...question.options];
    let answerIndex = 0;

    for (
      let i = 0;
      i < newOptions.length && answerIndex < shuffledAnswers.length;
      i++
    ) {
      if (
        i !== question.correct_answer &&
        (!newOptions[i] || newOptions[i].trim() === "")
      ) {
        newOptions[i] = shuffledAnswers[answerIndex];
        answerIndex++;
      }
    }

    updateQuestion(questionId, "options", newOptions);
  };

  const validateForm = () => {
    if (!title.trim()) {
      setError("Le titre du quiz est requis");
      return false;
    }

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      if (!question.question_text.trim()) {
        setError(`La question ${i + 1} ne peut pas être vide`);
        return false;
      }

      // Check if options have either text or image
      const validOptions = question.options.filter(
        (opt, index) => opt.trim() || question.option_images?.[index]
      );
      if (validOptions.length < 2) {
        setError(`La question ${i + 1} doit avoir au moins 2 réponses`);
        return false;
      }

      const correctAnswers = question.correct_answers || [];
      if (correctAnswers.length === 0) {
        setError(
          `La question ${i + 1} doit avoir au moins une réponse correcte`
        );
        return false;
      }

      const hasValidCorrectAnswers = correctAnswers.every(
        (answerIndex) =>
          question.options[answerIndex]?.trim() ||
          question.option_images?.[answerIndex]
      );
      if (!hasValidCorrectAnswers) {
        setError(
          `Toutes les réponses correctes de la question ${
            i + 1
          } doivent être remplies`
        );
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    try {
      // Create quiz
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          user_id: userId,
        })
        .select()
        .single();

      if (quizError) throw quizError;

      // Upload images to Supabase Storage BEFORE saving option images
      console.log(
        "📤 [SAVE] Début de l'upload des images avant sauvegarde des options"
      );
      await uploadImagesToStorage(quizData.id);
      console.log(
        "✅ [SAVE] Upload des images terminé, maintenant sauvegarde des URLs Supabase"
      );

      // Recalculate questions after image upload to get updated state
      const updatedQuestions = questions;
      console.log("🔄 [SAVE] Recalcul des questions après upload des images");

      // Log the updated state to verify URLs are correct
      updatedQuestions.forEach((question, index) => {
        console.log(`📝 [SAVE] Question ${index + 1} après upload:`, {
          id: question.id,
          option_images: question.option_images,
        });
      });

      // Create questions
      const questionsToInsert = updatedQuestions
        .filter(
          (q) =>
            q.question_text.trim() &&
            q.options.filter(
              (opt, index) => opt.trim() || q.option_images?.[index]
            ).length >= 2
        )
        .map((question, index) => {
          // Filter out empty options and adjust correct_answers indices
          const nonEmptyOptions = question.options.filter(
            (opt, index) =>
              (opt && opt.trim() !== "") || question.option_images?.[index]
          );
          const optionMapping = question.options.map((opt, idx) =>
            (opt && opt.trim() !== "") || question.option_images?.[idx]
              ? nonEmptyOptions.indexOf(opt)
              : -1
          );

          // Adjust correct_answers to new indices
          const adjustedCorrectAnswers = (
            question.correct_answers || [question.correct_answer]
          )
            .map((originalIdx) => optionMapping[originalIdx])
            .filter((newIdx) => newIdx !== -1);

          console.log(
            "📝 [SAVE] Préparation de la question:",
            question.question_text.substring(0, 50) + "..."
          );
          console.log(
            "🖼️ [SAVE] Image de question URL:",
            question.question_image_url
          );
          console.log("🔘 [SAVE] Images d'options:", question.option_images);

          return {
            quiz_id: quizData.id,
            question_text: question.question_text.trim(),
            options: nonEmptyOptions, // Only save non-empty options
            correct_answer: adjustedCorrectAnswers[0] || 0,
            correct_answers: adjustedCorrectAnswers,
            order_index: index,
            question_image_url: question.question_image_url,
          };
        });

      const { data: insertedQuestions, error: questionsError } = await supabase
        .from("questions")
        .insert(questionsToInsert)
        .select();

      if (questionsError) throw questionsError;

      // Handle option images for all questions
      console.log("🔘 [SAVE] Début de la sauvegarde des images d'options");
      for (let i = 0; i < insertedQuestions.length; i++) {
        const insertedQuestion = insertedQuestions[i];
        const originalQuestion = updatedQuestions[i];

        console.log(
          "📝 [SAVE] Traitement des images pour la question:",
          insertedQuestion.question_text.substring(0, 30) + "..."
        );
        console.log(
          "🖼️ [SAVE] Images d'options de la question:",
          originalQuestion.option_images
        );

        if (
          originalQuestion.option_images &&
          originalQuestion.option_images.some((img: string | null) => img)
        ) {
          console.log(
            "✅ [SAVE] Images d'options trouvées, insertion en base..."
          );

          // Insert option images
          const optionImagesData = originalQuestion.option_images
            .map((imageUrl: string | null, index: number) => {
              console.log(
                `🔘 [SAVE] Option ${index}:`,
                imageUrl ? "Image présente" : "Pas d'image"
              );
              if (imageUrl) {
                console.log(`🔗 [SAVE] URL à sauvegarder:`, imageUrl);
                console.log(
                  `🔍 [SAVE] Type d'URL:`,
                  imageUrl.startsWith("blob:")
                    ? "BLOB (temporaire)"
                    : "SUPABASE (permanente)"
                );
              }
              return {
                question_id: insertedQuestion.id,
                option_index: index,
                image_url: imageUrl,
              };
            })
            .filter((item: any) => item.image_url);

          console.log(
            "📊 [SAVE] Nombre d'images d'options à insérer:",
            optionImagesData.length
          );

          if (optionImagesData.length > 0) {
            const { error: imagesError } = await supabase
              .from("question_option_images")
              .insert(optionImagesData);

            if (imagesError) {
              console.error(
                "❌ [SAVE] Erreur lors de l'insertion des images d'options:",
                imagesError
              );
              throw imagesError;
            }

            console.log("✅ [SAVE] Images d'options insérées avec succès!");
          }
        } else {
          console.log("ℹ️ [SAVE] Aucune image d'option pour cette question");
        }
      }

      console.log("🎉 [SAVE] Sauvegarde du quiz terminée avec succès!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Error creating quiz:", error);
      setError(
        error instanceof Error ? error.message : "Une erreur s'est produite"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Hidden file input for image uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Quiz Info */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">
              Informations du quiz
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Donnez un titre et une description à votre quiz
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-card-foreground">
                Titre du quiz *
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Quiz de géographie"
                className="bg-input border-border text-foreground"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-card-foreground">
                Description (optionnel)
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez votre quiz..."
                className="bg-input border-border text-foreground"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-foreground">Questions</h2>
            <Button
              type="button"
              onClick={addQuestion}
              variant="outline"
              className="w-full sm:w-auto border-border text-foreground hover:bg-accent bg-transparent">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une question
            </Button>
          </div>

          {questions.map((question, questionIndex) => (
            <Card key={question.id} className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-card-foreground">
                    Question {questionIndex + 1}
                  </CardTitle>
                  {questions.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeQuestion(question.id)}
                      className="border-border text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-card-foreground">Question *</Label>
                  <Textarea
                    value={question.question_text}
                    onChange={(e) =>
                      updateQuestion(
                        question.id,
                        "question_text",
                        e.target.value
                      )
                    }
                    placeholder="Tapez votre question ici..."
                    className="bg-input border-border text-foreground"
                    rows={2}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Image:</span>
                  <ImageUpload
                    value={question.question_image_url}
                    onChange={(url) => updateQuestionImage(question.id, url)}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <Label className="text-card-foreground">
                      Réponses (au moins 2 requises) *
                    </Label>
                    <Button
                      type="button"
                      onClick={() => addOption(question.id)}
                      variant="outline"
                      size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center gap-3">
                      <Checkbox
                        checked={(question.correct_answers || []).includes(
                          optionIndex
                        )}
                        onCheckedChange={() =>
                          toggleCorrectAnswer(question.id, optionIndex)
                        }
                      />
                      {question.option_images?.[optionIndex] &&
                      question.option_images[optionIndex]?.trim() !== "" ? (
                        <div className="flex-1 flex items-center gap-2 p-2 border border-border rounded-md bg-input">
                          <ImageZoom>
                            <img
                              src={question.option_images[optionIndex]}
                              alt={`Option ${optionIndex + 1}`}
                              className="w-12 h-12 object-cover rounded cursor-zoom-in"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </ImageZoom>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="w-8 h-8 p-0 rounded-md"
                            onClick={() =>
                              updateOptionImage(question.id, optionIndex, null)
                            }>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Input
                          value={option}
                          onChange={(e) =>
                            updateOption(
                              question.id,
                              optionIndex,
                              e.target.value
                            )
                          }
                          placeholder={`Réponse ${optionIndex + 1}`}
                          className="bg-input border-border text-foreground flex-1"
                        />
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-8 h-8 p-0 border-border text-foreground hover:bg-accent bg-transparent rounded-md"
                        onClick={() =>
                          handleImageUpload(question.id, optionIndex)
                        }>
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                      {question.options.length > 2 && (
                        <Button
                          type="button"
                          onClick={() => removeOption(question.id, optionIndex)}
                          variant="outline"
                          size="sm"
                          className="w-8 h-8 p-0 border-destructive text-destructive hover:bg-destructive/10 rounded-md">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Cochez toutes les réponses correctes (au moins une doit être
                    cochée)
                  </p>
                </div>

                {/* Generate Distractors Buttons */}
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <Button
                        type="button"
                        onClick={() => generateDistractors(question.id)}
                        disabled={
                          isGenerating ||
                          !question.question_text.trim() ||
                          !question.options[question.correct_answer]?.trim()
                        }
                        className="border-border text-foreground hover:bg-accent bg-transparent">
                        <Sparkles className="h-4 w-4 mr-2" />
                        {isGenerating ? "Génération..." : "Générer avec l'IA"}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        L'IA générera automatiquement des fausses réponses
                        plausibles
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <Button
                        type="button"
                        onClick={() => generateRandomAnswers(question.id)}
                        disabled={
                          questions.length < 4 ||
                          !question.question_text.trim() ||
                          !question.options[question.correct_answer]?.trim()
                        }
                        variant="outline"
                        className="border-border text-foreground hover:bg-accent bg-transparent">
                        <Shuffle className="h-4 w-4 mr-2" />
                        Réponses du quiz
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Utilise les réponses correctes des autres questions
                        {questions.length < 4 && " (min. 4 questions requises)"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {error && (
          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent>
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-6">
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto border-border text-foreground hover:bg-accent bg-transparent">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Annuler
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Création..." : "Créer le quiz"}
          </Button>
        </div>
      </form>

      {/* Floating Add Question Button */}
      <div className="fixed bottom-28 right-4 z-50 md:hidden">
        <Button
          type="button"
          onClick={addQuestion}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg rounded-full w-14 h-14">
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Desktop Floating Add Question Button */}
      <div className="fixed bottom-8 right-8 z-50 hidden md:block">
        <Button
          type="button"
          onClick={addQuestion}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg rounded-lg px-4 py-2">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une question
        </Button>
      </div>
    </>
  );
}
