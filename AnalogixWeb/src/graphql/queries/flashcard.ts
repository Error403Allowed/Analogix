import { gql } from "@apollo/client/core";

export const FLASHCARDS = gql`
  query Flashcards($subjectId: String, $setId: String) {
    flashcards(subjectId: $subjectId, setId: $setId) {
      id
      subjectId
      front
      back
      sourceSessionId
      nextReview
      intervalDays
      easeFactor
      repetitions
      setId
      createdAt
      updatedAt
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
      intervalDays
      easeFactor
      repetitions
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
      createdAt
      updatedAt
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
    }
  }
`;

export const UPDATE_FLASHCARD = gql`
  mutation UpdateFlashcard($input: JSON!) {
    updateFlashcard(input: $input) {
      id
      front
      back
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

export const GENERATE_FLASHCARDS = gql`
  mutation GenerateFlashcards($input: JSON!) {
    generateFlashcards(input: $input) {
      id
      subjectId
      front
      back
    }
  }
`;
