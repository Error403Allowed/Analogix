import { gql } from "@apollo/client";

export const QUIZZES = gql`
  query Quizzes($subjectId: String) {
    quizzes(subjectId: $subjectId) {
      id
      subjectId
      title
      difficulty
      createdAt
      questions {
        id
        type
        question
        options {
          id
          text
          isCorrect
        }
      }
    }
  }
`;

export const GENERATE_QUIZ = gql`
  mutation GenerateQuiz($input: JSON!) {
    generateQuiz(input: $input) {
      id
      subjectId
      title
      difficulty
      questions {
        id
        type
        question
        options {
          id
          text
        }
        correctAnswer
        explanation
        hint
      }
    }
  }
`;

export const GRADE_SHORT_ANSWER = gql`
  mutation GradeShortAnswer($input: JSON!) {
    gradeShortAnswer(input: $input) {
      score
      feedback
      isCorrect
    }
  }
`;

export const QUIZ_REVIEW = gql`
  mutation QuizReview($input: JSON!) {
    quizReview(input: $input) {
      summary
      questions {
        id
        feedback
      }
    }
  }
`;

export const SUBMIT_QUIZ_ATTEMPT = gql`
  mutation SubmitQuizAttempt($quizId: ID!, $answers: JSON!, $durationSeconds: Int) {
    submitQuizAttempt(quizId: $quizId, answers: $answers, durationSeconds: $durationSeconds) {
      id
      score
      total
      accuracy
      createdAt
    }
  }
`;
