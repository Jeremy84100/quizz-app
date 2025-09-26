"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Trophy,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { QuizWithQuestions, Question } from "@/lib/types";

interface QuizPlayerProps {
  quiz: QuizWithQuestions;
  userId: string;
}

interface ShuffledQuestion extends Omit<Question, "options"> {
  shuffled_options: string[];
  original_to_shuffled_map: number[];
}

export function QuizPlayer({ quiz, userId }: QuizPlayerProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, number>
  >({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [shuffledQuestions, setShuffledQuestions] = useState<
    ShuffledQuestion[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Shuffle questions and options on component mount
  useEffect(() => {
    const shuffleArray = <T,>(array: T[]): T[] => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    const shuffleQuestions = () => {
      const questionsWithShuffledOptions = quiz.questions.map((question) => {
        const optionsWithIndex = question.options.map((option, index) => ({
          option,
          originalIndex: index,
        }));
        const shuffledOptionsWithIndex = shuffleArray(optionsWithIndex);

        const shuffled_options = shuffledOptionsWithIndex.map(
          (item) => item.option
        );
        const original_to_shuffled_map = shuffledOptionsWithIndex.map(
          (item) => item.originalIndex
        );

        return {
          ...question,
          shuffled_options,
          original_to_shuffled_map,
        };
      });

      // Shuffle the order of questions too
      const shuffledQuestionOrder = shuffleArray(questionsWithShuffledOptions);
      setShuffledQuestions(shuffledQuestionOrder);
    };

    shuffleQuestions();
  }, [quiz.questions]);

  const currentQuestion = shuffledQuestions[currentQuestionIndex];
  const progress =
    ((currentQuestionIndex + 1) / shuffledQuestions.length) * 100;

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestionIndex]: answerIndex,
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < shuffledQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      calculateResults();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const calculateResults = async () => {
    let correctAnswers = 0;

    shuffledQuestions.forEach((question, index) => {
      const selectedAnswerIndex = selectedAnswers[index];
      if (selectedAnswerIndex !== undefined) {
        // Map back to original index to check if correct
        const originalAnswerIndex =
          question.original_to_shuffled_map[selectedAnswerIndex];
        if (originalAnswerIndex === question.correct_answer) {
          correctAnswers++;
        }
      }
    });

    setScore(correctAnswers);
    setShowResults(true);

    // Save result to database
    await saveQuizResult(correctAnswers);
  };

  const saveQuizResult = async (correctAnswers: number) => {
    setIsLoading(true);
    const supabase = createClient();

    try {
      // Convert selectedAnswers from shuffled index to question ID mapping
      const answersByQuestionId: Record<string, number> = {};
      shuffledQuestions.forEach((question, index) => {
        if (selectedAnswers[index] !== undefined) {
          // Map the shuffled answer index back to the original answer index
          const originalAnswerIndex =
            question.original_to_shuffled_map[selectedAnswers[index]];
          answersByQuestionId[question.id] = originalAnswerIndex;
        }
      });

      // Debug: Log what we're storing
      console.log("Debug - Storing answers:", answersByQuestionId);

      const { error } = await supabase.from("quiz_results").insert({
        quiz_id: quiz.id,
        user_id: userId,
        score: correctAnswers,
        total_questions: shuffledQuestions.length,
        answers: answersByQuestionId,
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error saving quiz result:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const restartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowResults(false);
    setScore(0);

    // Re-shuffle questions and options
    const shuffleArray = <T,>(array: T[]): T[] => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    const questionsWithShuffledOptions = quiz.questions.map((question) => {
      const optionsWithIndex = question.options.map((option, index) => ({
        option,
        originalIndex: index,
      }));
      const shuffledOptionsWithIndex = shuffleArray(optionsWithIndex);

      const shuffled_options = shuffledOptionsWithIndex.map(
        (item) => item.option
      );
      const original_to_shuffled_map = shuffledOptionsWithIndex.map(
        (item) => item.originalIndex
      );

      return {
        ...question,
        shuffled_options,
        original_to_shuffled_map,
      };
    });

    const shuffledQuestionOrder = shuffleArray(questionsWithShuffledOptions);
    setShuffledQuestions(shuffledQuestionOrder);
  };

  if (shuffledQuestions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Chargement du quiz...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showResults) {
    const percentage = Math.round((score / shuffledQuestions.length) * 100);

    return (
      <div className="max-w-4xl mx-auto">
        <Card className="bg-card border-border">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl text-card-foreground">
              Quiz terminé !
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Voici vos résultats pour "{quiz.title}"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-6xl font-bold text-primary mb-2">
                {percentage}%
              </div>
              <p className="text-xl text-muted-foreground">
                {score} sur {shuffledQuestions.length} bonnes réponses
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-card-foreground">
                Détail des réponses
              </h3>
              {shuffledQuestions.map((question, index) => {
                const selectedAnswerIndex = selectedAnswers[index];
                const isCorrect =
                  selectedAnswerIndex !== undefined &&
                  question.original_to_shuffled_map[selectedAnswerIndex] ===
                    question.correct_answer;

                return (
                  <div
                    key={question.id}
                    className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                    {isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-card-foreground mb-2">
                        {question.question_text}
                      </p>
                      <div className="space-y-1 text-sm">
                        {selectedAnswerIndex !== undefined && (
                          <p className="text-muted-foreground">
                            Votre réponse:{" "}
                            {question.shuffled_options[selectedAnswerIndex]}
                          </p>
                        )}
                        <p className="text-green-600">
                          Bonne réponse:{" "}
                          {question.options[question.correct_answer]}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-6">
              <Button
                onClick={restartQuiz}
                className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                <RotateCcw className="h-4 w-4 mr-2" />
                Refaire le quiz
              </Button>
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto border-border text-foreground hover:bg-accent bg-transparent">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour au tableau de bord
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <Link href="/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="border-border text-foreground hover:bg-accent bg-transparent">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </Link>
            <Badge
              variant="secondary"
              className="bg-secondary text-secondary-foreground sm:hidden">
              Question {currentQuestionIndex + 1} sur {shuffledQuestions.length}
            </Badge>
          </div>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {quiz.title}
            </h1>
            {quiz.description && (
              <p className="text-sm sm:text-base text-muted-foreground">
                {quiz.description}
              </p>
            )}
          </div>
          <Badge
            variant="secondary"
            className="bg-secondary text-secondary-foreground hidden sm:block">
            Question {currentQuestionIndex + 1} sur {shuffledQuestions.length}
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xl text-card-foreground">
            {currentQuestion.question_text}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {currentQuestion.shuffled_options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                className={`w-full p-4 text-left rounded-lg border transition-colors ${
                  selectedAnswers[currentQuestionIndex] === index
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background hover:bg-accent text-foreground"
                }`}>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedAnswers[currentQuestionIndex] === index
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    }`}>
                    {selectedAnswers[currentQuestionIndex] === index && (
                      <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                    )}
                  </div>
                  <span>{option}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-6">
            <Button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              variant="outline"
              className="border-border text-foreground hover:bg-accent bg-transparent">
              Précédent
            </Button>
            <Button
              onClick={handleNext}
              disabled={selectedAnswers[currentQuestionIndex] === undefined}
              className="bg-primary text-primary-foreground hover:bg-primary/90">
              {currentQuestionIndex === shuffledQuestions.length - 1
                ? "Terminer"
                : "Suivant"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
