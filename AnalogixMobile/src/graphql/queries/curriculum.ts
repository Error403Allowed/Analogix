import { gql } from "@apollo/client";

export const CURRICULUM_SUBJECTS = gql`
  query CurriculumSubjects {
    curriculumSubjects {
      subject
      learningArea
      yearLevels
    }
  }
`;

export const CURRICULUM_SUBJECT = gql`
  query CurriculumSubject($subject: String!) {
    curriculumSubject(subject: $subject) {
      subject
      learningArea
      yearLevels
    }
  }
`;
