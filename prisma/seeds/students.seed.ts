import { PrismaClient, Role, Gender } from '@prisma/client';
import * as argon2 from 'argon2';

export async function seedStudents(prisma: PrismaClient, classes: any[], departments: any[], yearLabel: string) {
  const passwordHash = await argon2.hash('Student@2024');
  const students = [];

  const firstNames = [
    'Kwesi', 'Abena', 'Kojo', 'Ekua', 'Kwabena', 'Adwoa', 'Kwaku', 'Akua', 'Yaw', 'Yaaba',
    'Kofi', 'Afia', 'Kwame', 'Ama', 'Samuel', 'Esther', 'Daniel', 'Mary', 'Isaac', 'Rebecca',
    'Joseph', 'Ruth', 'Peter', 'Martha', 'Paul', 'Sarah', 'James', 'Elizabeth', 'John', 'Hannah',
    'Emmanuel', 'Mercy', 'Benjamin', 'Grace', 'Gabriel', 'Patience', 'Solomon', 'Priscilla', 'Stephen', 'Dorcas',
    'David', 'Victoria', 'Michael', 'Charity', 'Andrew', 'Phoebe', 'Francis', 'Clement', 'Favour', 'Nicholas',
    'Abigail', 'Theophilus', 'Deborah', 'Tabitha', 'Joshua', 'Naomi', 'Aaron', 'Leah', 'Jacob', 'Rachel',
    'Isaac', 'Rebecca', 'Caleb', 'Hagar', 'Aaron', 'Lydia', 'Moses', 'Miriam', 'Joshua', 'Rahab',
    'David', 'Bathsheba', 'Solomon', 'Naomi', 'Daniel', 'Susanna', 'Michael', 'Judith', 'Gabriel', 'Anna'
  ];

  const lastNames = [
    'Mensah', 'Annan', 'Osei', 'Appiah', 'Owusu', 'Tetteh', 'Asare', 'Dapaah', 'Boakye', 'Adu',
    'Boateng', 'Oppong', 'Agyemang', 'Kyeremeh', 'Donkor', 'Arthur', 'Addai', 'Fordjour', 'Gyamfi', 'Bonsu',
    'Ofori', 'Sarpong', 'Baah', 'Amponsah', 'Acheampong', 'Duah', 'Darko', 'Frimpong', 'Sarfo', 'Twum',
    'Ampofo', 'Nkansah', 'Danso', 'Manu', 'Baffour', 'Agyare', 'Opoku', 'Boadu', 'Antwi', 'Bismark',
    'Nti', 'Afriyie', 'Dwomoh', 'Fosu', 'Gyan', 'Hagan', 'Inkoom', 'Kwarteng', 'Larbi', 'Manteaw',
    'Nkrumah', 'Okyere', 'Poku', 'Quarcoopome', 'Razak', 'Sackey', 'Tandoh', 'Uthman',
    'Vinyo', 'Wiredu', 'Yeboah', 'Zakari', 'Ablakwa', 'Bekoe', 'Cudjoe', 'Djan', 'Eshun', 'Foli'
  ];

  const deptCodeByProgram: Record<string, string> = {
    'Science': 'SCI',
    'General Arts': 'ART',
    'Business': 'BUS',
    'Home Economics': 'HEC',
    'Technical': 'TEC',
  };

  const yearPrefix = yearLabel.split('/')[0];
  let studentIndex = 0;

  for (const cls of classes) {
    const program = cls.program || 'General Arts';
    const deptCode = deptCodeByProgram[program] || 'GEN';
    const dept = departments.find(d => d.code === deptCode);

    for (let i = 0; i < 5; i++) {
      const firstName = firstNames[studentIndex % firstNames.length];
      const lastName = lastNames[studentIndex % lastNames.length];
      const seq = String(studentIndex + 1).padStart(3, '0');
      const indexNumber = `${yearPrefix}${seq}`;
      const email = `${indexNumber}@st.mandoshts.edu.gh`;

      const existing = await prisma.user.findUnique({
        where: { email },
        include: { studentProfile: true },
      });

      let student;
      if (existing) {
        student = existing;
      } else {
        try {
          student = await prisma.user.create({
            data: {
              email,
              passwordHash,
              role: Role.STUDENT,
              studentProfile: {
                create: {
                  indexNumber,
                  firstName,
                  lastName,
                  gender: studentIndex % 2 === 0 ? Gender.MALE : Gender.FEMALE,
                  currentClassId: cls.id,
                  departmentId: dept?.id,
                },
              },
            },
            include: { studentProfile: { include: { currentClass: true } } },
          });
        } catch (err: any) {
          console.error(`Failed to create student ${email}:`, err.message);
          const found = await prisma.user.findUnique({ 
            where: { email }, 
            include: { studentProfile: { include: { currentClass: true } } } 
          });
          if (found) {
            student = found;
          } else {
            throw err;
          }
        }
      }
      students.push(student.studentProfile);
      studentIndex++;
    }
  }

  console.log(`✅ ${students.length} Students seeded for ${yearLabel}`);
  return students;
}
