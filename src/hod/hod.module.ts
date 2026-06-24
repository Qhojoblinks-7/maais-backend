import { Module } from '@nestjs/common';
import { HODService } from './hod.service';
import { HODController } from './hod.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HODController],
  providers: [HODService],
  exports: [HODService],
})
export class HODModule {}
