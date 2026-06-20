import { ActivityType } from '../reputation.constants';

export interface ReputationActivity {
  id: string;
  subjectId: string;
  actorId: string | null;
  activityType: ActivityType;
  value: number;
  referenceId: string | null;
  occurredAt: Date;
  createdAt: Date;
}
