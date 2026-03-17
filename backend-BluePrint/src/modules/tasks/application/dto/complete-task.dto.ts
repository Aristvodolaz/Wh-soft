import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CompleteTaskDto {
  @ApiPropertyOptional({ description: 'Optional completion notes or scan confirmation details.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
