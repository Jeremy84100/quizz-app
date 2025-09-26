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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Calendar,
  User,
  ArrowLeft,
  TrendingUp,
  Eye,
} from "lucide-react";
import Link from "next/link";
import type { Quiz, QuizResult } from "@/lib/types";

interface QuizResultsProps {
  quiz: Quiz;
}

interface ResultWithUser extends QuizResult {
  user_email?: string;
}

export function QuizResults({ quiz }: QuizResultsProps) {
  const [results, setResults] = useState<ResultWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAttempts: 0,
    averageScore: 0,
    bestScore: 0,
    uniqueUsers: 0,
  });

  useEffect(() => {
    fetchResults();
  }, [quiz.id]);

  const fetchResults = async () => {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from("quiz_results")
        .select("*")
        .eq("quiz_id", quiz.id)
        .order("completed_at", { ascending: false });

      if (error) throw error;

      const resultsData = data || [];
      setResults(resultsData);

      // Calculate stats
      if (resultsData.length > 0) {
        const totalScore = resultsData.reduce(
          (sum, result) => sum + result.score,
          0
        );
        const averageScore = totalScore / resultsData.length;
        const bestScore = Math.max(...resultsData.map((r) => r.score));
        const uniqueUsers = new Set(resultsData.map((r) => r.user_id)).size;

        setStats({
          totalAttempts: resultsData.length,
          averageScore: Math.round(
            (averageScore / resultsData[0].total_questions) * 100
          ),
          bestScore: Math.round(
            (bestScore / resultsData[0].total_questions) * 100
          ),
          uniqueUsers,
        });
      }
    } catch (error) {
      console.error("Error fetching results:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard">
            <Button
              variant="outline"
              size="sm"
              className="border-border text-foreground hover:bg-accent bg-transparent">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Résultats du quiz
        </h1>
        <p className="text-xl text-muted-foreground">{quiz.title}</p>
        {quiz.description && (
          <p className="text-muted-foreground mt-1">{quiz.description}</p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 sm:pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="text-xs sm:text-sm text-card-foreground">
                Total des tentatives
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl sm:text-2xl font-bold text-card-foreground">
              {stats.totalAttempts}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2 sm:pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="text-xs sm:text-sm text-card-foreground">
                Score moyen
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl sm:text-2xl font-bold text-card-foreground">
              {stats.averageScore}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2 sm:pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
              <CardTitle className="text-xs sm:text-sm text-card-foreground">
                Meilleur score
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl sm:text-2xl font-bold text-card-foreground">
              {stats.bestScore}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2 sm:pb-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="text-xs sm:text-sm text-card-foreground">
                Utilisateurs uniques
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl sm:text-2xl font-bold text-card-foreground">
              {stats.uniqueUsers}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results List */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground">
            Historique des résultats
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Tous les résultats pour ce quiz, triés par date
          </CardDescription>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Aucun résultat pour ce quiz pour le moment.
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {results.map((result) => {
                const percentage = Math.round(
                  (result.score / result.total_questions) * 100
                );
                const isHighScore = percentage >= 80;

                return (
                  <div
                    key={result.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg border border-border bg-background/50 gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-4">
                      <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {new Date(result.completed_at).toLocaleDateString(
                            "fr-FR",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground sm:hidden">
                          {new Date(result.completed_at).toLocaleTimeString(
                            "fr-FR",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                        <span className="hidden sm:inline text-xs text-muted-foreground">
                          {new Date(result.completed_at).toLocaleTimeString(
                            "fr-FR",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-left sm:text-right">
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {result.score} / {result.total_questions} bonnes
                          réponses
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={isHighScore ? "default" : "secondary"}
                          className={`text-xs sm:text-sm ${
                            isHighScore
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground"
                          }`}>
                          {percentage}%
                        </Badge>
                        <Link href={`/quiz/result/${result.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-xs">
                            <Eye className="h-3 w-3 mr-1" />
                            Détails
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
