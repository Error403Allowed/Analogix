import { gql } from "@apollo/client";

export const ME = gql`
  query Me {
    me {
      id
      name
      email
      avatarUrl
      toursCompleted
    }
  }
`;

export const MARK_TOURS_COMPLETED = gql`
  mutation MarkToursCompleted($tourIds: [String!]!) {
    markToursCompleted(tourIds: $tourIds) {
      id
      toursCompleted
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

export const ACHIEVEMENTS = gql`
  query Achievements {
    achievements {
      id
      title
      description
      icon
      category
    }
    unlockedAchievements {
      id
      achievementId
      unlockedAt
    }
  }
`;

export const UNLOCK_ACHIEVEMENT = gql`
  mutation UnlockAchievement($achievementId: String!) {
    unlockAchievement(achievementId: $achievementId) {
      id
      achievementId
      unlockedAt
    }
  }
`;
