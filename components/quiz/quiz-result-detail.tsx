"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  Trophy,
  Target,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import type { QuizResultWithQuiz, Question } from "@/lib/types";

interface QuizResultDetailProps {
  result: QuizResultWithQuiz;
}

export function QuizResultDetail({ result }: QuizResultDetailProps) {
  const [showOnlyIncorrect, setShowOnlyIncorrect] = useState(false);

  const quiz = result.quizzes;
  const questions = quiz.questions || [];
  const answers = result.answers || {};

  // Debug: Log the answers to see what's stored
  console.log("Debug - Answers stored:", answers);
  console.log(
    "Debug - Questions:",
    questions.map((q) => ({ id: q.id, text: q.question_text }))
  );

  // Helper function to check if an answer is correct
  const isCorrect = (question: Question, userAnswer: number | number[]) => {
    // Handle both single answer (number) and multiple answers (number[])
    if (Array.isArray(userAnswer)) {
      const correctAnswers = question.correct_answers || [
        question.correct_answer,
      ];
      // Check if all selected answers are correct and all correct answers are selected
      const allSelectedAreCorrect = userAnswer.every((idx: number) =>
        correctAnswers.includes(idx)
      );
      const allCorrectAreSelected = correctAnswers.every((idx: number) =>
        userAnswer.includes(idx)
      );
      return allSelectedAreCorrect && allCorrectAreSelected;
    } else {
      // Single answer
      const correctAnswers = question.correct_answers || [
        question.correct_answer,
      ];
      return correctAnswers.includes(userAnswer);
    }
  };

  // Calculate statistics
  const totalQuestions = result.total_questions;
  const correctAnswers = result.score;

  // Count actual answered questions (not unanswered)
  const answeredQuestions = questions.filter((question) => {
    const userAnswer = answers[question.id];
    const hasAnswer = userAnswer !== undefined;
    console.log(
      `Debug - Question ${question.id}: hasAnswer=${hasAnswer}, userAnswer=${userAnswer}`
    );
    return hasAnswer;
  }).length;

  // Count incorrect answers by checking each answered question
  let incorrectAnswers = 0;
  questions.forEach((question) => {
    const userAnswer = answers[question.id];
    if (userAnswer !== undefined && !isCorrect(question, userAnswer)) {
      incorrectAnswers++;
    }
  });

  const unansweredQuestions = totalQuestions - answeredQuestions;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);

  // Filter questions based on showOnlyIncorrect
  const filteredQuestions = showOnlyIncorrect
    ? questions.filter((question) => {
        const userAnswer = answers[question.id];
        return userAnswer !== undefined && !isCorrect(question, userAnswer);
      })
    : questions;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getAnswerText = (question: Question, answerIndex: number) => {
    return question.options[answerIndex] || "Réponse non trouvée";
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard">
            <Button
              variant="outline"
              size="sm"
              className="border-border text-foreground hover:bg-accent bg-transparent">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au tableau de bord
            </Button>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Détails du résultat
            </h1>
            <p className="text-xl text-muted-foreground">{quiz.title}</p>
            {quiz.description && (
              <p className="text-muted-foreground mt-1">{quiz.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={percentage >= 80 ? "default" : "secondary"}
              className={`text-lg px-4 py-2 ${
                percentage >= 80
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}>
              {percentage}%
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <CardTitle className="text-sm text-card-foreground">
                  Bonnes réponses
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-green-600">
                {correctAnswers}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <CardTitle className="text-sm text-card-foreground">
                  Mauvaises réponses
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-red-600">
                {incorrectAnswers}
              </div>
            </CardContent>
          </Card>

          {unansweredQuestions > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <CardTitle className="text-sm text-card-foreground">
                    Sans réponse
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-orange-600">
                  {unansweredQuestions}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm text-card-foreground">
                  Total questions
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-card-foreground">
                {totalQuestions}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm text-card-foreground">
                  Date
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-sm text-card-foreground">
                {formatDate(result.completed_at)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filter Toggle */}
      <div className="mb-6">
        <Button
          variant={showOnlyIncorrect ? "default" : "outline"}
          onClick={() => setShowOnlyIncorrect(!showOnlyIncorrect)}
          className="mb-4">
          {showOnlyIncorrect ? (
            <>
              <AlertCircle className="h-4 w-4 mr-2" />
              Afficher toutes les questions
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 mr-2" />
              Afficher seulement les erreurs
            </>
          )}
        </Button>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="text-center py-8">
              <Trophy className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {showOnlyIncorrect
                  ? "Aucune erreur trouvée ! Excellent travail ! 🎉"
                  : "Aucune question trouvée."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredQuestions.map((question, index) => {
            // Get the user's answer for this question using question ID
            const userAnswer = answers[question.id];
            const isQuestionCorrect = isCorrect(question, userAnswer);

            // Debug: Log each question and its answer
            console.log(`Debug - Question ${index + 1}:`, {
              questionId: question.id,
              questionText: question.question_text,
              userAnswer: userAnswer,
              correctAnswer: question.correct_answer,
              isCorrect: isQuestionCorrect,
            });

            return (
              <Card
                key={question.id}
                className={`bg-card border-border ${
                  isQuestionCorrect
                    ? "border-green-200 bg-green-50/50"
                    : "border-red-200 bg-red-50/50"
                }`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-card-foreground mb-2">
                        Question {index + 1}
                      </CardTitle>
                      <p className="text-card-foreground">
                        {question.question_text}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isQuestionCorrect ? (
                        <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    {/* User's Answer Summary */}
                    {userAnswer !== undefined ? (
                      <div
                        className={`mb-4 p-4 rounded-lg border-2 ${
                          isQuestionCorrect
                            ? "bg-green-50 border-green-300"
                            : "bg-red-50 border-red-300"
                        }`}>
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                              isQuestionCorrect ? "bg-green-100" : "bg-red-100"
                            }`}>
                            {isQuestionCorrect ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p
                              className={`text-sm font-semibold mb-1 ${
                                isQuestionCorrect
                                  ? "text-green-800"
                                  : "text-red-800"
                              }`}>
                              {isQuestionCorrect
                                ? "Vos réponses (correctes)"
                                : "Incorrect"}
                            </p>
                            <p
                              className={`text-base font-medium ${
                                isQuestionCorrect
                                  ? "text-green-700"
                                  : "text-red-700"
                              }`}>
                              {Array.isArray(userAnswer)
                                ? userAnswer
                                    .map((idx) => question.options[idx])
                                    .join(", ")
                                : question.options[userAnswer]}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4 p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                            <AlertCircle className="h-5 w-5 text-orange-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-orange-800 mb-1">
                              Aucune réponse fournie
                            </p>
                            <p className="text-sm text-orange-700">
                              Vous n'avez pas sélectionné d'option pour cette
                              question
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Answer Options */}
                    <div className="space-y-2">
                      {question.options.map((option, optionIndex) => {
                        const isUserAnswer = Array.isArray(userAnswer)
                          ? userAnswer.includes(optionIndex)
                          : userAnswer === optionIndex;
                        const correctAnswers = question.correct_answers || [
                          question.correct_answer,
                        ];
                        const isCorrectAnswer =
                          correctAnswers.includes(optionIndex);

                        let badgeVariant:
                          | "default"
                          | "secondary"
                          | "destructive" = "secondary";
                        let badgeText = "";

                        if (isCorrectAnswer) {
                          badgeVariant = "default";
                          badgeText = "Bonne réponse";
                        } else if (isUserAnswer && !isCorrectAnswer) {
                          badgeVariant = "destructive";
                          badgeText = "Incorrect";
                        }

                        return (
                          <div
                            key={optionIndex}
                            className={`p-3 rounded-lg border ${
                              isCorrectAnswer
                                ? "border-green-300 bg-green-100"
                                : isUserAnswer && !isCorrectAnswer
                                ? "border-red-300 bg-red-100"
                                : "border-gray-200 bg-gray-50"
                            }`}>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-card-foreground">
                                {option}
                              </span>
                              {badgeText && (
                                <Badge
                                  variant={badgeVariant}
                                  className="text-xs">
                                  {badgeText}
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation if wrong */}
                    {!isQuestionCorrect && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-red-800 mb-1">
                              Réponses correctes :
                            </p>
                            <p className="text-sm text-red-700">
                              {(
                                question.correct_answers || [
                                  question.correct_answer,
                                ]
                              )
                                .map((idx) => question.options[idx])
                                .join(", ")}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
