import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Brain, Plus, Trophy, Users } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                QuizMaster
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/auth/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground">
                  <span className="hidden sm:inline">Se connecter</span>
                  <span className="sm:hidden">Connexion</span>
                </Button>
              </Link>
              <Link href="/auth/sign-up">
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <span className="hidden sm:inline">Créer un compte</span>
                  <span className="sm:hidden">S'inscrire</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-8 sm:py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance mb-4 sm:mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Créez et jouez à vos quiz personnalisés
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground mb-6 sm:mb-8 text-pretty">
            Concevez vos propres quiz avec vos mots et réponses. Le système
            mélange automatiquement les questions pour une expérience unique à
            chaque fois.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link href="/auth/sign-up">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="mr-2 h-5 w-5" />
                <span className="hidden sm:inline">Commencer gratuitement</span>
                <span className="sm:hidden">Commencer</span>
              </Button>
            </Link>
            <Link href="/demo">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-border text-foreground hover:bg-accent bg-transparent">
                Voir la démo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-8 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-card-foreground">
                Création facile
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Créez vos quiz en quelques clics. Ajoutez vos questions et
                réponses personnalisées.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-card-foreground">
                Mélange intelligent
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Les questions et réponses sont automatiquement mélangées pour
                éviter la monotonie.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-card-foreground">
                Suivi des scores
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Vos scores sont sauvegardés pour suivre vos progrès au fil du
                temps.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-8 sm:py-16">
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6 sm:p-12 text-center">
            <h3 className="text-2xl sm:text-3xl font-bold text-card-foreground mb-4">
              Prêt à créer votre premier quiz ?
            </h3>
            <p className="text-muted-foreground mb-6 sm:mb-8 text-base sm:text-lg">
              Rejoignez des milliers d'utilisateurs qui créent et partagent
              leurs quiz.
            </p>
            <Link href="/auth/sign-up">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Users className="mr-2 h-5 w-5" />
                Créer mon compte
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 mt-8 sm:mt-16">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              <span className="text-muted-foreground">QuizMaster</span>
            </div>
            <p className="text-sm text-muted-foreground text-center sm:text-right">
              © 2025 QuizMaster. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
