import { IsOptional, IsString } from 'class-validator';

export class CustomerReportQueryDto {
  @IsString()
  @IsOptional()
  customerId?: string;
}
