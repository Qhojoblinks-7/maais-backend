import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name);
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const result = await this.prisma.$queryRaw<{ trigger_exists: boolean }[]>`
        SELECT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'audit_logs_insert_only'
        ) AS trigger_exists
      `;

      if (result?.[0]?.trigger_exists) {
        this.logger.log('audit_logs insert-only trigger already exists');
        return;
      }

      this.logger.warn(
        'DB-level audit_logs insert-only trigger not found. Application-level immutability is enforced. Run the SQL migration manually to add the DB trigger.',
      );
    } catch {
      this.logger.warn(
        'Could not check audit_logs trigger state. Application-level immutability is still enforced.',
      );
    }
  }
}
