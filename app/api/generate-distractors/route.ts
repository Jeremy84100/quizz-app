import { NextRequest, NextResponse } from 'next/server'
import { generateDistractors, generateDistractorsForQuestions, QuestionData } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { questions, count = 3 } = body

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: 'Questions array is required' },
        { status: 400 }
      )
    }

    // Vérifier que chaque question a les champs requis
    for (const question of questions) {
      if (!question.question || !question.correctAnswer) {
        return NextResponse.json(
          { error: 'Each question must have "question" and "correctAnswer" fields' },
          { status: 400 }
        )
      }
    }

    // Générer les distracteurs pour toutes les questions
    const results = await generateDistractorsForQuestions(questions, count)

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Erreur API generate-distractors:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
