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

interface Question {
  id: string;
  question_text: string;
  options: string[];
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
      options: ["", "", "", ""],
      correct_answer: 0,
      correct_answers: [0],
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: crypto.randomUUID(),
        question_text: "",
        options: ["", "", "", ""],
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

      // Create questions
      const questionsToInsert = questions
        .filter(
          (q) =>
            q.question_text.trim() &&
            q.options.filter((opt) => opt.trim()).length >= 2
        )
        .map((question, index) => {
          // Filter out empty options and adjust correct_answers indices
          const nonEmptyOptions = question.options.filter(
            (opt) => opt && opt.trim() !== ""
          );
          const optionMapping = question.options.map((opt, idx) =>
            opt && opt.trim() !== "" ? nonEmptyOptions.indexOf(opt) : -1
          );

          // Adjust correct_answers to new indices
          const adjustedCorrectAnswers = (
            question.correct_answers || [question.correct_answer]
          )
            .map((originalIdx) => optionMapping[originalIdx])
            .filter((newIdx) => newIdx !== -1);

          return {
            quiz_id: quizData.id,
            question_text: question.question_text.trim(),
            options: nonEmptyOptions, // Only save non-empty options
            correct_answer: adjustedCorrectAnswers[0] || 0,
            correct_answers: adjustedCorrectAnswers,
            order_index: index,
          };
        });

      const { error: questionsError } = await supabase
        .from("questions")
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

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

                <div className="space-y-3">
                  <Label className="text-card-foreground">
                    Réponses (au moins 2 requises) *
                  </Label>
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
                      <Input
                        value={option}
                        onChange={(e) =>
                          updateOption(question.id, optionIndex, e.target.value)
                        }
                        placeholder={`Réponse ${optionIndex + 1}`}
                        className="bg-input border-border text-foreground"
                      />
                      <span className="text-xs text-muted-foreground min-w-fit">
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
