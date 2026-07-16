import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  providers: [UsersService, SearchService],
  controllers: [UsersController, SearchController],
  exports: [UsersService],
})
export class UsersModule {}
