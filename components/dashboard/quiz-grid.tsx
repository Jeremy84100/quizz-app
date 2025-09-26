"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Play,
  Edit,
  Trash2,
  Plus,
  BarChart3,
  Trophy,
  Users,
  Target,
} from "lucide-react";
import Link from "next/link";
import type { Quiz } from "@/lib/types";

interface QuizGridProps {
  userId: string;
}

interface QuizWithStats extends Quiz {
  stats?: {
    totalAttempts: number;
    averageScore: number;
    bestScore: number;
    totalQuestions: number;
    lastPlayed?: string;
  };
}

export function QuizGrid({ userId }: QuizGridProps) {
  const [quizzes, setQuizzes] = useState<QuizWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizzes();
  }, [userId]);

  const fetchQuizzes = async () => {
    const supabase = createClient();

    try {
      const { data: quizzesData, error: quizzesError } = await supabase
        .from("quizzes")
        .select(
          `
          *,
          questions (id),
          quiz_results (*)
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (quizzesError) throw quizzesError;

      // Calculate stats for each quiz
      const quizzesWithStats = (quizzesData || []).map((quiz) => {
        const results = quiz.quiz_results || [];
        const totalAttempts = results.length;
        const totalQuestions = quiz.questions?.length || 0;

        let averageScore = 0;
        let bestScore = 0;
        let lastPlayed = null;

        if (totalAttempts > 0) {
          const totalScore = results.reduce(
            (sum: number, result: any) => sum + result.score,
            0
          );
          averageScore = Math.round(
            (totalScore / totalAttempts / totalQuestions) * 100
          );
          bestScore = Math.round(
            (Math.max(...results.map((r: any) => r.score)) / totalQuestions) *
              100
          );

          // Get the most recent result
          const sortedResults = results.sort(
            (a: any, b: any) =>
              new Date(b.completed_at).getTime() -
              new Date(a.completed_at).getTime()
          );
          lastPlayed = sortedResults[0]?.completed_at;
        }

        return {
          ...quiz,
          stats: {
            totalAttempts,
            averageScore,
            bestScore,
            totalQuestions,
            lastPlayed,
          },
        };
      });

      setQuizzes(quizzesWithStats);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteQuiz = async (quizId: string) => {
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("quizzes")
        .delete()
        .eq("id", quizId);

      if (error) throw error;
      setQuizzes(quizzes.filter((quiz) => quiz.id !== quizId));
    } catch (error) {
      console.error("Error deleting quiz:", error);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="bg-card border-border animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-muted rounded w-full mb-2"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <Card className="bg-card border-border text-center py-12">
        <CardContent>
          <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <CardTitle className="text-card-foreground mb-2">
            Aucun quiz pour le moment
          </CardTitle>
          <CardDescription className="text-muted-foreground mb-6">
            Créez votre premier quiz pour commencer à tester vos connaissances
          </CardDescription>
          <Link href="/quiz/create">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Créer mon premier quiz
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {quizzes.map((quiz) => (
        <Card
          key={quiz.id}
          className="bg-card border-border hover:border-primary/50 transition-colors">
          <CardHeader>
              <CardTitle className="text-card-foreground text-base sm:text-lg truncate">
                {quiz.title}
              </CardTitle>
              {quiz.description && (
                <CardDescription className="text-muted-foreground text-sm line-clamp-2">
                  {quiz.description}
                </CardDescription>
              )}
          </CardHeader>
          <CardContent>
            {/* Stats Section */}
            {quiz.stats && (
              <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <Target className="h-3 w-3 text-primary" />
                      <span className="text-xs text-muted-foreground">
                        Questions
                      </span>
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {quiz.stats.totalQuestions}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-3 w-3 text-primary" />
                      <span className="text-xs text-muted-foreground">
                        Tentatives
                      </span>
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {quiz.stats.totalAttempts}
                    </div>
                  </div>

                  {quiz.stats.totalAttempts > 0 && (
                    <>
                      <div className="space-y-1">
                        <div className="flex items-center justify-center gap-1">
                          <BarChart3 className="h-3 w-3 text-green-500" />
                          <span className="text-xs text-muted-foreground">
                            Moyenne
                          </span>
                        </div>
                        <div className="text-lg font-bold text-green-600">
                          {quiz.stats.averageScore}%
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-center gap-1">
                          <Trophy className="h-3 w-3 text-yellow-500" />
                          <span className="text-xs text-muted-foreground">
                            Meilleur
                          </span>
                        </div>
                        <div className="text-lg font-bold text-yellow-600">
                          {quiz.stats.bestScore}%
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {quiz.stats.lastPlayed && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <div className="text-xs text-muted-foreground text-center">
                      Dernière fois :{" "}
                      {new Date(quiz.stats.lastPlayed).toLocaleDateString(
                        "fr-FR"
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mb-3">
              <Link href={`/quiz/play/${quiz.id}`} className="flex-1">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm">
                  <Play className="h-4 w-4 mr-2" />
                  Jouer
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/quiz/edit/${quiz.id}`} className="flex-1">
                <Button
                  variant="outline"
                  className="w-full border-border text-foreground hover:bg-accent bg-transparent text-sm">
                  <Edit className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Modifier</span>
                  <span className="sm:hidden">Edit</span>
                </Button>
              </Link>
              <Link href={`/quiz/results/${quiz.id}`}>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-border text-foreground hover:bg-accent bg-transparent">
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="outline"
                size="icon"
                onClick={() => deleteQuiz(quiz.id)}
                className="border-border text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
