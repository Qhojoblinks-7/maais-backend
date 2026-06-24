import { PrismaClient, Role, Gender } from '@prisma/client';
import * as argon2 from 'argon2';

export async function seedHODs(prisma: PrismaClient, departments: any[]) {
  const hodPassword = await argon2.hash('HOD@2024!');
  
  const hodsData = [
    { firstName: 'Michael', lastName: 'Osei', email: 'm.osei@mandoshts.edu.gh', gender: Gender.MALE, deptCode: 'GEN', canTeach: false },
    { firstName: 'Sarah', lastName: 'Mensah', email: 's.mensah@mandoshts.edu.gh', gender: Gender.FEMALE, deptCode: 'SCI', canTeach: true },
    { firstName: 'David', lastName: 'Boateng', email: 'd.boateng@mandoshts.edu.gh', gender: Gender.MALE, deptCode: 'BUS', canTeach: false },
    { firstName: 'Grace', lastName: 'Amoah', email: 'g.amoah@mandoshts.edu.gh', gender: Gender.FEMALE, deptCode: 'VTG', canTeach: false },
    { firstName: 'Thomas', lastName: 'Brew', email: 't.brew@mandoshts.edu.gh', gender: Gender.MALE, deptCode: 'ART', canTeach: false },
  ];

  const hods = [];
  for (let i = 0; i < hodsData.length; i++) {
    const data = hodsData[i];
    const dept = departments.find(d => d.code === data.deptCode);
    
    const hod = await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: {
        email: data.email,
        passwordHash: hodPassword,
        role: Role.HOD,
        staffProfile: {
          create: {
            staffId: `HOD-2024-00${i + 1}`,
            firstName: data.firstName,
            lastName: data.lastName,
            gender: data.gender,
            departmentId: dept?.id,
            canTeach: data.canTeach,
            canOversight: true,
          },
        },
      },
      include: { staffProfile: true },
    });
    hods.push(hod);
  }

  console.log(`✅ ${hods.length} HOD users seeded`);
  return hods;
}