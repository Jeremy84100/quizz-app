import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Brain, Mail } from "lucide-react"

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">QuizMaster</h1>
          </div>

          <Card className="bg-card border-border">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl text-card-foreground">Vérifiez votre email</CardTitle>
              <CardDescription className="text-muted-foreground">
                Nous avons envoyé un lien de confirmation à votre adresse email. Cliquez sur le lien pour activer votre
                compte.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-6">
                Vous ne trouvez pas l'email ? Vérifiez votre dossier spam ou indésirables.
              </p>
              <Link href="/auth/login">
                <Button variant="outline" className="border-border text-foreground hover:bg-accent bg-transparent">
                  Retour à la connexion
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
