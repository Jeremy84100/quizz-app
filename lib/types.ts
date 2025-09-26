export interface Quiz {
  id: string
  title: string
  description?: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface Question {
  id: string
  quiz_id: string
  question_text: string
  options: string[]
  correct_answer: number // Keep for backward compatibility
  correct_answers: number[] // New field for multiple correct answers
  order_index: number
  created_at: string
}

export interface QuizResult {
  id: string
  quiz_id: string
  user_id: string
  score: number
  total_questions: number
  answers?: Record<string, number>
  completed_at: string
}

export interface QuizWithQuestions extends Quiz {
  questions: Question[]
}

export interface QuizResultWithQuiz extends QuizResult {
  quizzes: QuizWithQuestions
}
