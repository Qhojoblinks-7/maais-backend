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
        'DB-level audit_logs insert-only trigger not found. Creating it now.',
      );

      await this.prisma.$executeRaw`
        CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
        RETURNS TRIGGER AS $$
        BEGIN
          RAISE EXCEPTION 'audit_logs table is immutable. INSERT only.';
        END;
        $$ LANGUAGE plpgsql;
      `;

      await this.prisma.$executeRaw`
        CREATE TRIGGER audit_logs_insert_only
        BEFORE UPDATE OR DELETE ON audit_logs
        FOR EACH ROW
        EXECUTE FUNCTION prevent_audit_log_modification();
      `;

      this.logger.log('audit_logs insert-only trigger created successfully');
    } catch {
      this.logger.warn(
        'Could not check or create audit_logs trigger. Application-level immutability is still enforced.',
      );
    }
  }
}
