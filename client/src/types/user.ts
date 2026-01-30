export type UserRole = 'chief_editor' | 'editor' | 'producer' | 'team_member';

export interface NotificationSettings {
  assigned: boolean;
  deadlines: boolean;
  mentions: boolean;
  factChecks: boolean;
  stateChanges: boolean;
  emailDigest: 'realtime' | '2hours' | 'daily' | 'never';
}

export interface User {
  _id: string;
  email: string;
  name: string;
  avatar?: string | null;
  role?: UserRole;
  workspaceId?: string | null;
  notificationSettings?: NotificationSettings;
  createdAt: string;
}
