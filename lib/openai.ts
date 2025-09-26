import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface QuestionData {
  question: string
  correctAnswer: string
}

export interface GeneratedDistractors {
  distractors: string[]
}

/**
 * Génère des fausses réponses (distracteurs) similaires à la vraie réponse
 * @param questionData - Les données de la question avec la vraie réponse
 * @param count - Nombre de fausses réponses à générer (défaut: 3)
 * @returns Les fausses réponses générées
 */
export async function generateDistractors(
  questionData: QuestionData,
  count: number = 3
): Promise<GeneratedDistractors> {
  try {
    const prompt = `
Tu es un expert en création de quiz. Génère ${count} fausses réponses (distracteurs) pour cette question de quiz.

Question: "${questionData.question}"
Bonne réponse: "${questionData.correctAnswer}"

Règles importantes:
1. Les fausses réponses doivent être plausibles et similaires à la vraie réponse
2. Elles doivent être dans le même domaine/thème que la vraie réponse
3. Elles ne doivent pas être trop évidentes comme fausses
4. Utilise un style et un niveau de détail similaire à la vraie réponse
5. Évite les réponses complètement absurdes ou hors sujet

Réponds UNIQUEMENT avec un JSON valide contenant un tableau "distractors" avec les ${count} fausses réponses.
Format: {"distractors": ["réponse1", "réponse2", "réponse3"]}
`

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Tu es un expert en création de quiz. Tu génères des fausses réponses plausibles et réalistes pour des questions de quiz."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('Aucune réponse générée par OpenAI')
    }

    // Parser la réponse JSON
    const parsed = JSON.parse(response)
    if (!parsed.distractors || !Array.isArray(parsed.distractors)) {
      throw new Error('Format de réponse invalide')
    }

    return {
      distractors: parsed.distractors.slice(0, count)
    }
  } catch (error) {
    console.error('Erreur lors de la génération des distracteurs:', error)
    
    // Fallback: générer des réponses basiques si OpenAI échoue
    return {
      distractors: generateFallbackDistractors(questionData.correctAnswer, count)
    }
  }
}

/**
 * Génère des distracteurs de fallback si OpenAI échoue
 */
function generateFallbackDistractors(correctAnswer: string, count: number): string[] {
  const fallbacks = [
    `Autre ${correctAnswer.toLowerCase()}`,
    `Variante de ${correctAnswer}`,
    `Alternative à ${correctAnswer}`,
    `Similaire à ${correctAnswer}`,
    `Proche de ${correctAnswer}`
  ]
  
  return fallbacks.slice(0, count)
}

/**
 * Génère des distracteurs pour plusieurs questions en une seule fois
 */
export async function generateDistractorsForQuestions(
  questions: QuestionData[],
  count: number = 3
): Promise<GeneratedDistractors[]> {
  const results: GeneratedDistractors[] = []
  
  for (const question of questions) {
    try {
      const distractors = await generateDistractors(question, count)
      results.push(distractors)
    } catch (error) {
      console.error(`Erreur pour la question "${question.question}":`, error)
      results.push({
        distractors: generateFallbackDistractors(question.correctAnswer, count)
      })
    }
  }
  
  return results
}
