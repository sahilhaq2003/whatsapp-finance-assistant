import { IsEnum, IsNotEmpty } from 'class-validator';
import { FeedbackStatus } from '../enums/feedback-status.enum';

export class UpdateFeedbackStatusDto {
  @IsEnum(FeedbackStatus)
  @IsNotEmpty()
  status: FeedbackStatus;
}
