import { gql } from "@apollo/client";

export const ME = gql`
  query Me {
    me {
      id
      name
      email
      grade
      state
      subjects
      hobbies
      hobbyIds
      hobbyDetails
      onboardingComplete
      avatarUrl
      aiPersonality {
        tone
        focus
        verbosity
        creativity
      }
    }
  }
`;

export const UPDATE_AI_PERSONALITY = gql`
  mutation UpdateAiPersonality($input: JSON!) {
    updateAiPersonality(input: $input) {
      id
      aiPersonality {
        tone
        focus
        verbosity
        creativity
      }
    }
  }
`;

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: JSON!) {
    updateProfile(input: $input) {
      id
      name
      email
      grade
      state
      subjects
      hobbies
      hobbyIds
      hobbyDetails
      onboardingComplete
    }
  }
`;

export const USER_STATS = gql`
  query UserStats {
    userStats {
      userId
      quizzesDone
      currentStreak
      accuracy
      conversationsCount
      topSubject
      subjectCounts
      xp
      level
      quizzesCompleted
      cardsReviewed
      minutesStudied
      memories {
        id
        key
        value
        createdAt
        lastUsedAt
      }
    }
  }
`;

export const ACTIVITY_LOG = gql`
  query ActivityLog($days: Int) {
    activityLog(days: $days) {
      id
      date
      count
    }
  }
`;

export const INCREMENT_ACTIVITY = gql`
  mutation IncrementActivity($date: String!) {
    incrementActivity(date: $date) {
      success
    }
  }
`;

export const FORGET_MEMORY = gql`
  mutation ForgetMemory($id: ID!) {
    forgetMemory(id: $id) {
      success
    }
  }
`;

export const REMEMBER_MEMORY = gql`
  mutation RememberMemory($input: JSON!) {
    rememberMemory(input: $input) {
      id
      key
      value
    }
  }
`;

export const DELETE_ACCOUNT = gql`
  mutation DeleteAccount {
    deleteAccount {
      success
    }
  }
`;

export const MY_PREFERENCES = gql`
  query MyPreferences {
    myPreferences {
      userId
      mood
      theme
    }
  }
`;

export const UPDATE_PREFERENCES = gql`
  mutation UpdatePreferences($input: JSON!) {
    updatePreferences(input: $input) {
      userId
      mood
      theme
    }
  }
`;
