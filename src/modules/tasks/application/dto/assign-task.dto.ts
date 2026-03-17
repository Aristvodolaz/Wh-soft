import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignTaskDto {
  @ApiProperty({ format: 'uuid', description: 'User ID of the worker to assign the task to.' })
  @IsUUID()
  userId: string;
}
