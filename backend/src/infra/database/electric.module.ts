import { Module } from '@nestjs/common';
import { ElectricService } from './electric.service';

@Module({
  providers: [ElectricService],
  exports: [ElectricService],
})
export class ElectricModule {}

