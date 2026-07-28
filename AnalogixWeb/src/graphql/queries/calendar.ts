import { gql } from "@apollo/client/core";

export const EVENTS = gql`
  query Events($from: DateTime, $to: DateTime) {
    events(from: $from, to: $to) {
      id
      title
      date
      endDate
      type
      subject
      location
      description
      color
      source
    }
  }
`;

export const DEADLINES = gql`
  query Deadlines {
    deadlines {
      id
      title
      dueDate
      subject
      priority
      createdAt
    }
  }
`;

export const CREATE_EVENT = gql`
  mutation CreateEvent($input: JSON!) {
    createEvent(input: $input) {
      id
      title
      date
      endDate
      type
      subject
      color
    }
  }
`;

export const UPDATE_EVENT = gql`
  mutation UpdateEvent($id: ID!, $input: JSON!) {
    updateEvent(id: $id, input: $input) {
      id
      title
      date
      endDate
      type
      subject
      color
    }
  }
`;

export const DELETE_EVENT = gql`
  mutation DeleteEvent($id: ID!) {
    deleteEvent(id: $id) {
      success
    }
  }
`;

export const IMPORT_ICS = gql`
  mutation ImportIcs($ics: String!) {
    importIcs(ics: $ics)
  }
`;

export const ADD_DEADLINE = gql`
  mutation AddDeadline($input: JSON!) {
    addDeadline(input: $input) {
      id
      title
      dueDate
      subject
      priority
    }
  }
`;

export const UPDATE_DEADLINE = gql`
  mutation UpdateDeadline($id: ID!, $input: JSON!) {
    updateDeadline(id: $id, input: $input) {
      id
      title
      dueDate
      subject
      priority
    }
  }
`;

export const DELETE_DEADLINE = gql`
  mutation DeleteDeadline($id: ID!) {
    deleteDeadline(id: $id) {
      success
    }
  }
`;
