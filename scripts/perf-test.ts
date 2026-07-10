import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { HODContextService } from '../src/hod/hod-context.service';
import { HODTeacherService } from '../src/hod/hod-teachers.service';
import { TeacherService } from '../src/teacher/teacher.service';
import { Role } from '@prisma/client';

async function main() {
  // eslint-disable-next-line no-console
  console.log('Booting Nest application context...');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  const prisma = app.get(PrismaService);
  let q = 0;
  prisma.$on('query', () => {
    q += 1;
  });

  const hod = await prisma.staffProfile.findFirst({
    where: { user: { email: 'm.osei@mandoshts.edu.gh' } },
    include: { user: true },
  });
  const teacher = await prisma.staffProfile.findFirst({
    where: { user: { email: 'k.annan@mandoshts.edu.gh' } },
    include: { user: true },
  });

  if (!hod || !teacher) {
    throw new Error('Seed users not found — run `npm run prisma:seed` first.');
  }

  const hodCtx = app.get(HODContextService);
  const hodTeacher = app.get(HODTeacherService);
  const teacherSvc = app.get(TeacherService);

  const hodRequester = { id: hod.userId, role: Role.HOD, staffProfile: { id: hod.id } };
  const teacherRequester = {
    id: teacher.userId,
    role: Role.TEACHER,
    staffProfile: { id: teacher.id },
  };

  async function bench(name: string, fn: () => Promise<any>) {
    q = 0;
    const t = Date.now();
    const res = await fn();
    const ms = Date.now() - t;
    const items =
      res && Array.isArray(res.items)
        ? res.items.length
        : Array.isArray(res)
          ? res.length
          : '-';
    const flag = ms <= 5000 ? (ms >= 2000 ? 'WARN' : 'OK  ') : 'SLOW';
    // eslint-disable-next-line no-console
    console.log(
      `${flag} | ${name.padEnd(34)} ${String(ms).padStart(5)}ms | queries=${String(q).padStart(3)} | items=${items}`,
    );
  }

  // eslint-disable-next-line no-console
  console.log('\n=== MAAIS UI Response Budget Test (target: 2–5s) ===\n');

  await bench('HOD getDepartmentProgress', () =>
    hodCtx.getDepartmentProgress(hod.userId, Role.HOD, 1, 50),
  );
  await bench('HOD getTeacherSubmissionStatus', () =>
    hodTeacher.getTeacherSubmissionStatus(hod.userId, Role.HOD),
  );
  await bench('HOD getDepartmentTeachers', () =>
    hodTeacher.getDepartmentTeachers(hod.userId, Role.HOD),
  );
  await bench('Teacher getClasses', () =>
    teacherSvc.getClasses(teacher.id, teacherRequester),
  );
  await bench('Teacher getAnalytics', () =>
    teacherSvc.getAnalytics(teacher.id, teacherRequester),
  );

  await app.close();
  // eslint-disable-next-line no-console
  console.log('\nDone.');
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
