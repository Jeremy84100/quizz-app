"use client";

import type React from "react";

import { useState } from "react";
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
import { Plus, Trash2, Save, ArrowLeft, Sparkles, Shuffle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { QuizWithQuestions, Question } from "@/lib/types";

interface QuizEditFormProps {
  quiz: QuizWithQuestions;
  userId: string;
}

interface EditableQuestion extends Omit<Question, "correct_answers"> {
  isNew?: boolean;
  toDelete?: boolean;
  correct_answers: number[];
}

export function QuizEditForm({ quiz, userId }: QuizEditFormProps) {
  const [title, setTitle] = useState(quiz.title);
  const [description, setDescription] = useState(quiz.description || "");
  const [questions, setQuestions] = useState<EditableQuestion[]>(
    quiz.questions.map((q) => ({
      ...q,
      correct_answers: q.correct_answers || [q.correct_answer],
    }))
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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

      const filledOptions = question.options.filter((opt) => opt.trim());
      if (filledOptions.length < 2) {
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

      const hasValidCorrectAnswers = correctAnswers.every((answerIndex) =>
        question.options[answerIndex]?.trim()
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
      // Update quiz info
      const { error: quizError } = await supabase
        .from("quizzes")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", quiz.id);

      if (quizError) throw quizError;

      // Handle question deletions
      const questionsToDelete = questions.filter((q) => q.toDelete && !q.isNew);
      if (questionsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from("questions")
          .delete()
          .in(
            "id",
            questionsToDelete.map((q) => q.id)
          );

        if (deleteError) throw deleteError;
      }

      // Handle question updates and inserts
      const activeQuestions = questions.filter((q) => !q.toDelete);
      const questionsToUpdate = activeQuestions.filter((q) => !q.isNew);
      const questionsToInsert = activeQuestions.filter((q) => q.isNew);

      // Update existing questions
      for (const question of questionsToUpdate) {
        const { error: updateError } = await supabase
          .from("questions")
          .update({
            question_text: question.question_text.trim(),
            options: question.options, // Keep all options, even empty ones
            correct_answer: question.correct_answer,
            correct_answers: question.correct_answers || [
              question.correct_answer,
            ],
            order_index: activeQuestions.indexOf(question),
          })
          .eq("id", question.id);

        if (updateError) throw updateError;
      }

      // Insert new questions
      if (questionsToInsert.length > 0) {
        const questionsData = questionsToInsert.map((question) => ({
          quiz_id: quiz.id,
          question_text: question.question_text.trim(),
          options: question.options, // Keep all options, even empty ones
          correct_answer: question.correct_answer,
          correct_answers: question.correct_answers || [
            question.correct_answer,
          ],
          order_index: activeQuestions.indexOf(question),
        }));

        const { error: insertError } = await supabase
          .from("questions")
          .insert(questionsData);

        if (insertError) throw insertError;
      }

      router.push("/dashboard");
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

                <div className="space-y-3">
                  <Label className="text-card-foreground">
                    Réponses (au moins 2 requises) *
                  </Label>
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
                      </div>
                      <span className="text-xs text-muted-foreground min-w-fit text-center sm:text-left">
                        {(question.correct_answers || []).includes(optionIndex)
                          ? "Correcte"
                          : ""}
                      </span>
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
            <CardContent className="pt-6">
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
