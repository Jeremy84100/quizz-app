"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export function CreateQuizButton() {
  return (
    <Link href="/quiz/create">
      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
        <Plus className="h-4 w-4 mr-2" />
        Nouveau Quiz
      </Button>
    </Link>
  )
}
