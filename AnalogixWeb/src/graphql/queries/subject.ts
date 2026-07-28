import { gql } from "@apollo/client/core";

export const SUBJECTS = gql`
  query Subjects {
    subjects {
      id
      marks {
        id
        title
        score
        total
        date
      }
      notes {
        content
        lastUpdated
        title
      }
    }
  }
`;

export const SUBJECT = gql`
  query Subject($id: ID!) {
    subject(id: $id) {
      id
      marks {
        id
        title
        score
        total
        date
      }
      notes {
        content
        lastUpdated
        title
        homework {
          id
          title
          dueDate
          notes
          link
          completed
        }
        links {
          id
          title
          url
        }
        assessments {
          id
          title
          subject
          dueDate
          studyGuide {
            week
            label
            tasks
          }
        }
      }
    }
  }
`;

export const DOCUMENTS = gql`
  query Documents($subjectId: String!) {
    documents(subjectId: $subjectId) {
      id
      name
      type
      createdAt
      updatedAt
    }
  }
`;

export const DOCUMENT = gql`
  query Document($id: ID!) {
    document(id: $id) {
      id
      name
      type
      content
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_DOCUMENT = gql`
  mutation CreateDocument($input: JSON!) {
    createDocument(input: $input) {
      id
      name
      type
    }
  }
`;

export const UPDATE_DOCUMENT = gql`
  mutation UpdateDocument($input: JSON!) {
    updateDocument(input: $input) {
      id
      name
      content
    }
  }
`;

export const DELETE_DOCUMENT = gql`
  mutation DeleteDocument($documentId: ID!, $subjectId: String!) {
    deleteDocument(documentId: $documentId, subjectId: $subjectId) {
      success
    }
  }
`;

export const DUPLICATE_DOCUMENT = gql`
  mutation DuplicateDocument($documentId: ID!, $subjectId: String!) {
    duplicateDocument(documentId: $documentId, subjectId: $subjectId) {
      id
      name
    }
  }
`;

export const ADD_MARK = gql`
  mutation AddMark($subjectId: ID!, $input: JSON!) {
    addMark(subjectId: $subjectId, input: $input) {
      id
      marks {
        id
        title
        score
        total
        date
      }
    }
  }
`;

export const UPDATE_NOTES = gql`
  mutation UpdateNotes($subjectId: ID!, $content: String!, $title: String) {
    updateNotes(subjectId: $subjectId, content: $content, title: $title) {
      id
      notes {
        content
        lastUpdated
        title
      }
    }
  }
`;

export const STUDY_MAP = gql`
  query StudyMap {
    studyMap {
      subjectId
      name
      progress
      topics {
        id
        name
        status
      }
    }
  }
`;
