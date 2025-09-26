-- Update questions table to support multiple correct answers
-- Add a new column for multiple correct answers

ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS correct_answers INTEGER[];

-- Update existing records to use the new correct_answers column
UPDATE public.questions 
SET correct_answers = ARRAY[correct_answer] 
WHERE correct_answers IS NULL;

-- Make correct_answers NOT NULL after populating existing data
ALTER TABLE public.questions 
ALTER COLUMN correct_answers SET NOT NULL;

-- Add a check constraint to ensure at least one correct answer
ALTER TABLE public.questions 
ADD CONSTRAINT check_correct_answers_not_empty 
CHECK (array_length(correct_answers, 1) > 0);

-- Add a check constraint to ensure correct_answers are valid indices
-- Note: We can only check basic constraints, not complex subqueries
ALTER TABLE public.questions 
ADD CONSTRAINT check_correct_answers_valid_indices 
CHECK (
  array_length(correct_answers, 1) > 0 AND
  array_length(correct_answers, 1) <= 10 -- Reasonable upper limit
);

-- Create an index for better performance on correct_answers queries
CREATE INDEX IF NOT EXISTS idx_questions_correct_answers ON public.questions USING GIN (correct_answers);