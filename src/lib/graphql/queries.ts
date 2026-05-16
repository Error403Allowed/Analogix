import { gql } from "@apollo/client";

export const CALENDAR_EVENTS_QUERY = gql`
  query CalendarEvents {
    calendarEvents {
      id
      title
      startAt
      endAt
    }
  }
`;

export const SUBJECTS_QUERY = gql`
  query Subjects {
    subjects {
      id
      title
      color
      documentCount
    }
  }
`;

export const DOCUMENTS_QUERY = gql`
  query Documents($subjectId: ID!) {
    documents(subjectId: $subjectId) {
      id
      subjectId
      title
      content
      role
      updatedAt
    }
  }
`;
