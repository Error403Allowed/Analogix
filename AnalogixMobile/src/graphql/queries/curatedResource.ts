import { gql } from "@apollo/client";

export const CURATED_RESOURCES = gql`
  query CuratedResources {
    curatedResources {
      subjectId
      pastPapers {
        title
        url
        description
        free
        states
      }
      textbooks {
        title
        url
        description
        free
        states
      }
    }
  }
`;
