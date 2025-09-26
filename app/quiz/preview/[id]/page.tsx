"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Share2, Play, Clock, Users, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { QuizWithQuestions } from "@/lib/types";

interface QuizPreviewPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function QuizPreviewPage({ params }: QuizPreviewPageProps) {
  const [quiz, setQuiz] = useState<QuizWithQuestions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const router = useRouter();

  // Unwrap params using React.use()
  const { id } = use(params);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("quizzes")
          .select(
            `
            *,
            questions (
              id,
              question_text,
              options,
              correct_answer,
              order_index
            )
          `
          )
          .eq("id", id)
          .single();

        if (error) throw error;
        setQuiz(data);
      } catch (error) {
        console.error("Error fetching quiz:", error);
        setError("Quiz non trouvé");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuiz();
  }, [id]);

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const quizUrl = `${window.location.origin}/quiz/preview/${id}`;

      // Vérifier si l'API Web Share est disponible
      if (navigator.share) {
        await navigator.share({
          title: `Quiz: ${quiz?.title || "Quiz"}`,
          text: `Venez jouer à ce quiz !`,
          url: quizUrl,
        });
      } else {
        // Fallback: copier dans le presse-papiers
        await navigator.clipboard.writeText(quizUrl);
        alert("Lien copié dans le presse-papiers !");
      }
    } catch (error) {
      console.error("Error sharing quiz:", error);
      // Si l'utilisateur annule le partage, ne pas afficher d'erreur
      if (error instanceof Error && error.name !== "AbortError") {
        alert("Erreur lors du partage");
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleStartQuiz = () => {
    router.push(`/quiz/play/${id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement du quiz...</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-destructive mb-4">
                Quiz non trouvé
              </h2>
              <p className="text-muted-foreground mb-6">
                Ce quiz n'existe pas ou a été supprimé.
              </p>
              <Link href="/dashboard">
                <Button className="w-full">
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

  const questionCount = quiz.questions?.length || 0;
  const estimatedTime = Math.ceil(questionCount * 0.5); // 30 secondes par question

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>

          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              {quiz.title}
            </h1>
            {quiz.description && (
              <p className="text-xl text-muted-foreground mb-6">
                {quiz.description}
              </p>
            )}
          </div>
        </div>

        {/* Quiz Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Questions
                  </p>
                  <p className="text-2xl font-bold">{questionCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Durée estimée
                  </p>
                  <p className="text-2xl font-bold">{estimatedTime} min</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-sm">
                  Quiz
                </Badge>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Type
                  </p>
                  <p className="text-sm font-bold">QCM</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview of Questions */}
        {quiz.questions && quiz.questions.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-card-foreground">
                Aperçu des questions
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Voici un aperçu de ce qui vous attend
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quiz.questions.slice(0, 3).map((question, index) => (
                  <div key={question.id} className="border rounded-lg p-4">
                    <h4 className="font-medium text-foreground mb-2">
                      Question {index + 1}
                    </h4>
                    <p className="text-muted-foreground text-sm">
                      {question.question_text}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {question.options.slice(0, 2).map((option, optIndex) => (
                        <Badge
                          key={optIndex}
                          variant="outline"
                          className="text-xs">
                          {option}
                        </Badge>
                      ))}
                      {question.options.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{question.options.length - 2} autres...
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {quiz.questions.length > 3 && (
                  <p className="text-center text-muted-foreground text-sm">
                    ... et {quiz.questions.length - 3} autres questions
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={handleStartQuiz}
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 text-lg">
            <Play className="h-5 w-5 mr-2" />
            Démarrer le quiz
          </Button>

          <Button
            onClick={handleShare}
            variant="outline"
            size="lg"
            disabled={isSharing}
            className="border-border text-foreground hover:bg-accent px-8 py-3 text-lg">
            <Share2 className="h-5 w-5 mr-2" />
            {isSharing ? "Partage..." : "Partager"}
          </Button>
        </div>

        {/* Share Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Partagez ce quiz avec vos amis pour qu'ils puissent y jouer !
          </p>
        </div>
      </div>
    </div>
  );
}
