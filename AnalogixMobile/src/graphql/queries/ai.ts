import { gql } from "@apollo/client";

export const TUTOR = gql`
  mutation Tutor($input: JSON!) {
    tutor(input: $input) {
      text
      model
    }
  }
`;

export const GENERATE_STUDY_SCHEDULE = gql`
  mutation GenerateStudySchedule($input: JSON!) {
    generateStudySchedule(input: $input) {
      summary
      days {
        day
        date
        tasks
        durationMinutes
      }
    }
  }
`;

export const REEXPLAIN = gql`
  mutation Reexplain($input: JSON!) {
    reexplain(input: $input) {
      text
      style
    }
  }
`;

export const SEARCH_RESEARCH = gql`
  mutation SearchResearch($input: JSON!) {
    searchResearch(input: $input) {
      query
      total
      sources {
        id
        title
        authors
        year
        venue
        url
        abstract
        source
      }
    }
  }
`;

export const GENERATE_ASSESSMENT_GUIDE = gql`
  mutation GenerateAssessmentGuide($input: JSON!) {
    generateAssessmentGuide(input: $input) {
      weeks {
        week
        label
        tasks
      }
      summary
    }
  }
`;

export const EXTRACT_TEXT = gql`
  mutation ExtractText($input: JSON!) {
    extractText(input: $input) {
      text
      format
    }
  }
`;

export const EXECUTE_PYTHON = gql`
  mutation ExecutePython($input: JSON!) {
    executePython(input: $input) {
      stdout
      stderr
      error
      durationMs
    }
  }
`;
