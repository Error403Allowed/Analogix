import { gql } from "@apollo/client";

export const FLASHCARDS = gql`
  query Flashcards($subjectId: String, $setId: String) {
    flashcards(subjectId: $subjectId, setId: $setId) {
      id
      subjectId
      front
      back
      nextReview
      intervalDays
      easeFactor
      repetitions
      setId
      createdAt
    }
  }
`;

export const FLASHCARDS_DUE = gql`
  query FlashcardsDue($subjectId: String, $limit: Int) {
    flashcardsDue(subjectId: $subjectId, limit: $limit) {
      id
      subjectId
      front
      back
      nextReview
      setId
    }
  }
`;

export const FLASHCARD_SETS = gql`
  query FlashcardSets($subjectId: String) {
    flashcardSets(subjectId: $subjectId) {
      id
      subjectId
      name
      cardCount
    }
  }
`;

export const GRADE_FLASHCARD = gql`
  mutation GradeFlashcard($id: ID!, $quality: Int!) {
    gradeFlashcard(id: $id, quality: $quality) {
      card {
        id
        nextReview
        intervalDays
      }
      nextReview
      intervalDays
    }
  }
`;

export const GENERATE_FLASHCARDS = gql`
  mutation GenerateFlashcards($input: JSON!) {
    generateFlashcards(input: $input) {
      id
      front
      back
      subjectId
    }
  }
`;

export const CREATE_FLASHCARD = gql`
  mutation CreateFlashcard($input: JSON!) {
    createFlashcard(input: $input) {
      id
      subjectId
      front
      back
      nextReview
    }
  }
`;

export const DELETE_FLASHCARD = gql`
  mutation DeleteFlashcard($id: ID!) {
    deleteFlashcard(id: $id) {
      success
    }
  }
`;

export const UPDATE_FLASHCARD = gql`
  mutation UpdateFlashcard($input: JSON!) {
    updateFlashcard(input: $input) {
      id
      subjectId
      front
      back
      nextReview
      intervalDays
      easeFactor
      repetitions
      setId
    }
  }
`;

export const CREATE_FLASHCARD_SET = gql`
  mutation CreateFlashcardSet($input: JSON!) {
    createFlashcardSet(input: $input) {
      id
      subjectId
      name
      cardCount
    }
  }
`;
