import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export async function seedTranscripts(prisma: PrismaClient, students: any[]) {
  const transcripts = [];

  const purposes = ['University Application', 'Employment', 'Scholarship', 'Further Studies'];

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const transcript = await prisma.transcript.create({
      data: {
        studentId: student.id,
        indexNumber: student.indexNumber,
        systemHash: uuidv4(),
        qrCodeUrl: `https://qr.mandoshts.edu.gh/transcript/${uuidv4()}.png`,
        verificationUrl: `https://verify.mandoshts.edu.gh/transcript/${uuidv4()}`,
        pdfUrl: `https://pdf.mandoshts.edu.gh/transcript/${student.indexNumber.replace('/', '-')}.pdf`,
        purpose: purposes[i % purposes.length],
        generatedAt: new Date(Date.now() - i * 86400000),
      },
    });
    transcripts.push(transcript);
  }

  console.log(`✅ ${transcripts.length} Transcripts seeded`);
  return transcripts;
}