import { gql } from "@apollo/client";

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

export const DELETE_DEADLINE = gql`
  mutation DeleteDeadline($id: ID!) {
    deleteDeadline(id: $id) {
      success
    }
  }
`;
