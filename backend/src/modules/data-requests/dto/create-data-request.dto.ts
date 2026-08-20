import { IsString, IsNotEmpty, ValidateIf } from 'class-validator';
import { DataRequestType } from '../enums/data-request-type.enum';

export class CreateDataRequestDto {
  @IsString()
  @IsNotEmpty()
  type: DataRequestType;

  @ValidateIf((o) => o.type === DataRequestType.DELETION)
  @IsString()
  @IsNotEmpty({
    message: 'Confirmation string is required for deletion requests',
  })
  confirmation?: string;
}
