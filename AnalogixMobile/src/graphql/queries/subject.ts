import { gql } from "@apollo/client";

export const SUBJECTS = gql`
  query Subjects {
    subjects {
      id
      name
      icon
      color
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
    studyMap {
      subjectId
      progressPercent
      masteredTopics
      totalTopics
    }
  }
`;

export const SUBJECT_DETAIL = gql`
  query SubjectDetail($id: String!) {
    subject(id: $id) {
      id
      name
      icon
      color
      chapters {
        id
        name
        order
        topics {
          id
          name
          order
        }
      }
      notes {
        content
        lastUpdated
        title
      }
    }
  }
`;

export const DOCUMENT = gql`
  query Document($id: ID!) {
    document(id: $id) {
      id
      subjectId
      title
      content
      contentJson
      contentText
      contentFormat
      role
      icon
      cover
      lastUpdated
    }
  }
`;

export const SUBJECT = gql`
  query Subject($id: String!) {
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
          dueDate
          subject
        }
      }
    }
  }
`;

export const DOCUMENTS = gql`
  query Documents($subjectId: String) {
    documents(subjectId: $subjectId) {
      id
      subjectId
      title
      content
      contentJson
      contentText
      contentFormat
      role
      icon
      cover
      createdAt
      lastUpdated
    }
  }
`;

export const CREATE_DOCUMENT = gql`
  mutation CreateDocument($input: JSON!) {
    createDocument(input: $input) {
      id
      subjectId
      title
      content
      contentFormat
      createdAt
    }
  }
`;

export const UPDATE_DOCUMENT = gql`
  mutation UpdateDocument($input: JSON!) {
    updateDocument(input: $input) {
      id
      subjectId
      title
      content
      contentJson
      contentText
      lastUpdated
    }
  }
`;

export const ADD_MARK = gql`
  mutation AddMark($subjectId: String!, $input: JSON!) {
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
  mutation UpdateNotes($subjectId: String!, $content: String!, $title: String) {
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
      subjectId
      title
      content
      contentFormat
      role
      icon
      cover
      createdAt
    }
  }
`;

export const SAVE_SUBJECT_NOTES = gql`
  mutation SaveSubjectNotes($subjectId: String!, $notes: JSON!) {
    saveSubjectNotes(subjectId: $subjectId, notes: $notes) {
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
          dueDate
          subject
        }
      }
    }
  }
`;

export const CUSTOM_SUBJECTS = gql`
  query CustomSubjects {
    customSubjects {
      id
      subjectId
      customIcon
      customColor
      customCover
      customTitle
    }
  }
`;

export const SAVE_CUSTOM_SUBJECT = gql`
  mutation SaveCustomSubject($subjectId: String!, $input: JSON!) {
    saveCustomSubject(subjectId: $subjectId, input: $input) {
      id
      subjectId
      customIcon
      customColor
      customCover
      customTitle
    }
  }
`;
