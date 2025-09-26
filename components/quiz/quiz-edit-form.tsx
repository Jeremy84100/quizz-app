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
import type { QuizWithQuestions, Question } from "@/lib/types";
import { useImageUpload } from "@/hooks/use-image-upload";
import { updateQuiz } from "@/app/actions/quiz-actions";
import { ImageZoom } from "@/components/ui/image-zoom";
import { ImageUpload } from "@/components/ui/image-upload";

interface QuizEditFormProps {
  quiz: QuizWithQuestions;
  userId: string;
}

interface EditableQuestion
  extends Omit<
    Question,
    "correct_answers" | "option_images" | "question_image_url"
  > {
  isNew?: boolean;
  toDelete?: boolean;
  correct_answers: number[];
  question_image_url?: string | null;
  option_images?: (string | null)[];
}

export function QuizEditForm({ quiz, userId }: QuizEditFormProps) {
  const [title, setTitle] = useState(quiz.title);
  const [description, setDescription] = useState(quiz.description || "");
  const [questions, setQuestions] = useState<EditableQuestion[]>(
    quiz.questions.map((q) => {
      console.log("🔍 [DEBUG] Initializing question:", q.question_text);
      console.log("🔍 [DEBUG] Question option_images:", q.option_images);

      // Ensure option_images is in the correct format (string | null)[]
      let optionImages: (string | null)[] = [null, null, null, null];
      if (q.option_images && Array.isArray(q.option_images)) {
        optionImages = q.option_images.map((img) =>
          typeof img === "string" ? img : img?.image_url || null
        );
      }

      return {
        ...q,
        correct_answers: q.correct_answers || [q.correct_answer],
        question_image_url: q.question_image_url || null,
        option_images: optionImages,
      };
    })
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUpload, setCurrentUpload] = useState<{
    questionId: string;
    optionIndex?: number;
    type: "question" | "option";
  } | null>(null);

  // Hook pour l'upload d'images
  const { uploadImage, isUploading } = useImageUpload({
    quizId: quiz.id,
    onSuccess: (url) => {
      if (currentUpload) {
        if (currentUpload.type === "question") {
          updateQuestionImage(currentUpload.questionId, url);
        } else {
          updateOptionImage(
            currentUpload.questionId,
            currentUpload.optionIndex!,
            url
          );
        }
        setCurrentUpload(null);
      }
    },
    onError: (error) => {
      console.error("Erreur d'upload:", error);
      alert("Erreur lors de l'upload de l'image: " + error);
      setCurrentUpload(null);
    },
  });

  const addQuestion = () => {
    const newQuestion: EditableQuestion = {
      id: crypto.randomUUID(),
      quiz_id: quiz.id,
      question_text: "",
      options: ["", "", "", ""],
      correct_answer: 0,
      correct_answers: [0],
      order_index: questions.length,
      created_at: new Date().toISOString(),
      isNew: true,
      question_image_url: undefined,
      option_images: [null, null, null, null],
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (questionId: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (question?.isNew) {
      // Remove new questions immediately
      setQuestions(questions.filter((q) => q.id !== questionId));
    } else {
      // Mark existing questions for deletion
      setQuestions(
        questions.map((q) =>
          q.id === questionId ? { ...q, toDelete: true } : q
        )
      );
    }
  };

  const updateQuestion = (
    questionId: string,
    field: keyof EditableQuestion,
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
        q.id === questionId ? { ...q, question_image_url: imageUrl } : q
      )
    );
  };

  const updateOptionImage = (
    questionId: string,
    optionIndex: number,
    imageUrl: string | null
  ) => {
    console.log(`🔄 [UPDATE] Mise à jour de l'image d'option:`, {
      questionId,
      optionIndex,
      imageUrl,
      currentImages: questions.find((q) => q.id === questionId)?.option_images,
    });

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

    console.log(`✅ [UPDATE] Image d'option mise à jour dans l'état`);
  };

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

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("L'image doit faire moins de 5MB");
      return;
    }

    // Upload directement via l'action serveur
    await uploadImage(
      file,
      currentUpload.questionId,
      currentUpload.type,
      currentUpload.optionIndex
    );
  };

  const addOption = (questionId: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: [...q.options, ""],
              option_images: [...(q.option_images || []), null],
            }
          : q
      )
    );
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const newOptions = q.options.filter((_, idx) => idx !== optionIndex);
          const newOptionImages =
            q.option_images?.filter((_, idx) => idx !== optionIndex) || [];
          // Adjust correct_answers indices
          const newCorrectAnswers = q.correct_answers
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

    const activeQuestions = questions.filter((q) => !q.toDelete);
    if (activeQuestions.length === 0) {
      setError("Le quiz doit avoir au moins une question");
      return false;
    }

    for (let i = 0; i < activeQuestions.length; i++) {
      const question = activeQuestions[i];
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

    try {
      // Utiliser l'action serveur pour la mise à jour
      const result = await updateQuiz(
        {
          id: quiz.id,
          title: title.trim(),
          description: description.trim() || "",
          questions: questions.map((q) => ({
            id: q.id,
            question_text: q.question_text,
            options: q.options,
            correct_answers: q.correct_answers,
            question_image_url: q.question_image_url || undefined,
            option_images: q.option_images,
            isNew: q.isNew,
            toDelete: q.toDelete,
          })),
        },
        userId
      );

      // Si la mise à jour est réussie, rediriger vers le dashboard
      if (result.success) {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error updating quiz:", error);
      setError(
        error instanceof Error ? error.message : "Une erreur s'est produite"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const activeQuestions = questions.filter((q) => !q.toDelete);

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
              Modifiez le titre et la description de votre quiz
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
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                onClick={addQuestion}
                variant="outline"
                className="w-full sm:w-auto border-border text-foreground hover:bg-accent bg-transparent">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une question
              </Button>
            </div>
          </div>

          {activeQuestions.map((question, questionIndex) => (
            <Card key={question.id} className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-card-foreground">
                    Question {questionIndex + 1}
                    {question.isNew && (
                      <span className="text-sm text-primary ml-2">
                        (Nouvelle)
                      </span>
                    )}
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeQuestion(question.id)}
                    className="border-border text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
                  <span className="text-sm text-muted-foreground">
                    Image de la question:
                  </span>
                  <ImageUpload
                    value={question.question_image_url || undefined}
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
                      size="sm"
                      className="w-full sm:w-auto border-border text-foreground hover:bg-accent bg-transparent">
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter une option
                    </Button>
                  </div>
                  {question.options.map((option, optionIndex) => (
                    <div
                      key={optionIndex}
                      className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-3 flex-1">
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
                                updateOptionImage(
                                  question.id,
                                  optionIndex,
                                  null
                                )
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
                            onClick={() =>
                              removeOption(question.id, optionIndex)
                            }
                            variant="outline"
                            size="sm"
                            className="border-destructive text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground min-w-fit text-center sm:text-left"></span>
                    </div>
                  ))}

                  {/* Add Answer Button */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex flex-col sm:flex-row gap-2 flex-1">
                      <Label className="text-sm font-medium text-foreground">
                        Ajouter une réponse
                      </Label>
                      <Button
                        type="button"
                        onClick={() => addOption(question.id)}
                        variant="outline"
                        size="sm"
                        className="w-8 h-8 p-0 border-border text-foreground hover:bg-accent bg-transparent rounded-md">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

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
          <Link href="/dashboard" className="flex-1 sm:flex-none">
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
            className="flex-1 sm:flex-none bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Sauvegarde..." : "Sauvegarder les modifications"}
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
