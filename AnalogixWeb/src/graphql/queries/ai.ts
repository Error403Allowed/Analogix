import { gql } from "@apollo/client/core";

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

export const GENERATE_BANNER = gql`
  mutation GenerateBanner($input: JSON!) {
    generateBanner(input: $input) {
      text
    }
  }
`;

export const GENERATE_GREETING = gql`
  mutation GenerateGreeting($input: JSON!) {
    generateGreeting(input: $input) {
      text
    }
  }
`;

export const GENERATE_TITLE = gql`
  mutation GenerateTitle($input: JSON!) {
    generateTitle(input: $input) {
      title
    }
  }
`;
