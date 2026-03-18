import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ScanInventoryDto {
  @ApiProperty({
    example: 'BC-WH1-A-01-01',
    description:
      'Barcode to look up. Can be a product barcode (EAN/UPC) or a cell barcode. ' +
      'The system tries both and returns the best match.',
  })
  @IsString()
  @IsNotEmpty()
  barcode: string;

  @ApiProperty({ description: 'Warehouse to scope the lookup to.' })
  @IsString()
  @IsNotEmpty()
  warehouseId: string;
}
