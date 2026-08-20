import { IsString, IsNotEmpty } from 'class-validator';

export class RedeemBetaInviteDto {
  @IsString()
  @IsNotEmpty()
  inviteCode: string;
}
