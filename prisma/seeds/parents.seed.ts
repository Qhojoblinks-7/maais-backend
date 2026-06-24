import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

export async function seedParents(prisma: PrismaClient, students: any[]) {
  const passwordHash = await argon2.hash('Parent@2024');
  const parents = [];

  const parentNames = [
    { firstName: 'Kwame', lastName: 'Mensah' },
    { firstName: 'Efua', lastName: 'Annan' },
    { firstName: 'John', lastName: 'Osei' },
    { firstName: 'Ama', lastName: 'Appiah' },
    { firstName: 'Kofi', lastName: 'Owusu' },
    { firstName: 'Akua', lastName: 'Tetteh' },
    { firstName: 'Yaw', lastName: 'Asare' },
    { firstName: 'Mary', lastName: 'Boakye' },
    { firstName: 'Isaac', lastName: 'Adu' },
    { firstName: 'Rebecca', lastName: 'Boateng' },
    { firstName: 'Samuel', lastName: 'Oppong' },
    { firstName: 'Esther', lastName: 'Agyemang' },
    { firstName: 'Daniel', lastName: 'Donkor' },
    { firstName: 'Ruth', lastName: 'Arthur' },
    { firstName: 'Peter', lastName: 'Gyamfi' },
  ];

  for (let i = 0; i < 15; i++) {
    const data = parentNames[i];
    const email = `${data.firstName.toLowerCase()}.${data.lastName.toLowerCase()}${i}@parent.mandoshts.edu.gh`;

    const parent = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash,
        role: Role.PARENT,
        parentProfile: {
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
            phone: `+233244000${i.toString().padStart(3, '0')}`,
          },
        },
      },
      include: { parentProfile: true },
    });
    parents.push(parent.parentProfile);

    // Link to 2 students (use upsert to handle re-runs)
    const student1 = students[i * 2];
    const student2 = students[i * 2 + 1];
    const parentId = parent.parentProfile!.id;

    if (student1) {
      await prisma.studentParentLink.upsert({
        where: { studentId_parentId: { studentId: student1.id, parentId } },
        update: {},
        create: {
          studentId: student1.id,
          parentId,
          relationship: i % 2 === 0 ? 'Father' : 'Mother',
          isPrimary: true,
        },
      });
    }
    if (student2) {
      await prisma.studentParentLink.upsert({
        where: { studentId_parentId: { studentId: student2.id, parentId } },
        update: {},
        create: {
          studentId: student2.id,
          parentId,
          relationship: i % 2 === 0 ? 'Father' : 'Mother',
          isPrimary: false,
        },
      });
    }
  }

  console.log(`✅ ${parents.length} Parents seeded and linked to students`);
  return parents;
}