export const aiTypeDefs = /* GraphQL */ `
  type StudyScheduleDay {
    day: Int!
    date: String
    tasks: [String!]!
    durationMinutes: Int
  }

  type StudySchedule {
    days: [StudyScheduleDay!]!
    summary: String!
  }

  type AssessmentGuide {
    weeks: [StudyGuideWeek!]!
    summary: String!
  }

  type Reexplanation {
    text: String!
    style: String!
  }

  type ExtractTextResult {
    text: String!
    fileName: String
    mimeType: String!
    format: String!
  }

  type ExecutePythonResult {
    stdout: String!
    stderr: String!
    error: String
    durationMs: Float!
  }

  type BannerResult {
    text: String!
  }

  type GreetingResult {
    text: String!
  }

  type TitleResult {
    title: String!
  }

  type TutorResponse {
    text: String!
    model: String!
  }

  type ResearchSearchResult {
    query: String!
    total: Int!
    sources: [ResearchSource!]!
  }

  type ResearchSource {
    id: ID!
    title: String!
    authors: [String!]
    year: Int
    venue: String
    url: String
    pdfUrl: String
    abstract: String
    doi: String
    openAccess: Boolean
    source: String!
  }

  type TtsResult {
    audioUrl: String!
    duration: Float!
  }

  extend type Mutation {
    generateStudySchedule(input: JSON!): StudySchedule!
    generateAssessmentGuide(input: JSON!): AssessmentGuide!
    reexplain(input: JSON!): Reexplanation!
    extractText(input: JSON!): ExtractTextResult!
    tutor(input: JSON!): TutorResponse!
    searchResearch(input: JSON!): ResearchSearchResult!
    speak(input: JSON!): TtsResult!
    executePython(input: JSON!): ExecutePythonResult!
    generateBanner(input: JSON!): BannerResult!
    generateGreeting(input: JSON!): GreetingResult!
    generateTitle(input: JSON!): TitleResult!
  }
`;
