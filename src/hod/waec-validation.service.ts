import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WAECValidationService {
  private readonly logger = new Logger(WAECValidationService.name);

  private readonly requiredColumns = [
    'CandidateNumber',
    'Surname',
    'OtherNames',
    'DateOfBirth',
    'Gender',
    'SubjectCode',
    'ContinuousAssessment',
    'ExamScore',
  ];

  private readonly validSubjectCodes = [
    // Core subjects
    302, // English Language
    402, // Mathematics
    502, // General Science
    204, // Social Studies
    511, // Physical Education and Health
    705, // Art and Design Foundation
    507, // Agricultural Science

    // Science electives
    512, // Physics
    505, // Chemistry
    504, // Biology
    401, // Additional Mathematics
    216, // Geography
    601, // Robotics
    602, // Engineering
    603, // Aviation and Aerospace Engineering
    604, // Biomedical Science
    605, // Manufacturing Engineering

    // Applied Technology electives
    608, // Design and Communication Technology
    609, // Applied Technology (Automobile and Metal)
    610, // Applied Technology (Building Construction and Wood)
    611, // Applied Technology (Electrical and Electronic)

    // ICT
    319, // ICT

    // Business electives
    103, // Business Studies
    104, // Financial Accounting
    113, // Business Management
    203, // Economics
    114, // Office Practice
    112, // Marketing

    // Home Economics electives
    702, // Home Economics
    703, // Home Management

    // Arts electives
    706, // Art and Design Studio
    707, // Performing Arts
    210, // Literature in English
    205, // Government
    207, // History
    202, // Christian Religious Studies
    208, // Islamic Religious Studies
    209, // Religious Studies

    // Languages electives
    304, // French
    301, // Arabic
    305, // Spanish
    321, // Akan/Fante
    322, // Ewe
    323, // Ga
    324, // Nzema
    325, // Dagbani
    326, // Gonja
    330, // Dagaare
    327, // Hausa
    328, // Igbo
    329, // Yoruba

    // Agriculture elective
    506, // Agriculture
  ];

  validateHeaders(headers: string[]): string[] {
    return this.requiredColumns.filter((col) => !headers.includes(col));
  }

  validateRow(row: any): string[] {
    const errors: string[] = [];

    if (
      !row.CandidateNumber ||
      !/^\d{7,10}$/.test(String(row.CandidateNumber).trim())
    ) {
      errors.push('CandidateNumber must be 7-10 digits');
    }

    if (!row.Surname || String(row.Surname).trim().length === 0) {
      errors.push('Surname is required');
    }

    if (!row.OtherNames || String(row.OtherNames).trim().length === 0) {
      errors.push('OtherNames is required');
    }

    if (
      !row.DateOfBirth ||
      !/^\d{4}-\d{2}-\d{2}$/.test(String(row.DateOfBirth).trim())
    ) {
      errors.push('DateOfBirth must be YYYY-MM-DD');
    }

    if (!['M', 'F'].includes(String(row.Gender).trim().toUpperCase())) {
      errors.push('Gender must be M or F');
    }

    const subjectCode = Number(row.SubjectCode);
    if (!row.SubjectCode || !this.validSubjectCodes.includes(subjectCode)) {
      errors.push(`Invalid SubjectCode: ${row.SubjectCode}`);
    }

    const caScore = Number(row.ContinuousAssessment);
    if (isNaN(caScore) || caScore < 0 || caScore > 30) {
      errors.push('ContinuousAssessment must be between 0 and 30');
    }

    const examScore = Number(row.ExamScore);
    if (isNaN(examScore) || examScore < 0 || examScore > 70) {
      errors.push('ExamScore must be between 0 and 70');
    }

    return errors;
  }

  validateCSVRows(rows: any[]): {
    valid: boolean;
    errors: { row: number; issues: string[] }[];
  } {
    const errors: { row: number; issues: string[] }[] = [];
    const seenCandidateNumbers = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowErrors = this.validateRow(row);

      if (row.CandidateNumber) {
        const canNumber = String(row.CandidateNumber).trim();
        if (seenCandidateNumbers.has(canNumber)) {
          rowErrors.push('CandidateNumber must be unique');
        }
        seenCandidateNumbers.add(canNumber);
      }

      if (rowErrors.length > 0) {
        errors.push({ row: i + 1, issues: rowErrors });
      }
    }

    this.logger.log(
      `CSV validation completed: ${rows.length} rows, ${errors.length} with errors`,
    );
    return { valid: errors.length === 0, errors };
  }

  validateExportData(data: {
    indexNumber: string;
    lastName: string;
    firstName: string;
    dateOfBirth: Date | null;
    gender: string;
    subjectCode: string;
    classScore: number | null;
    examScore: number | null;
  }): string[] {
    const errors: string[] = [];

    if (
      !data.indexNumber ||
      !/^\d{7,10}$/.test(String(data.indexNumber).trim())
    ) {
      errors.push('CandidateNumber must be 7-10 digits');
    }

    if (!data.lastName) {
      errors.push('Surname is required');
    }

    if (!data.firstName) {
      errors.push('OtherNames is required');
    }

    if (!data.dateOfBirth) {
      errors.push('DateOfBirth is required');
    }

    if (!['M', 'F'].includes(String(data.gender).trim().toUpperCase())) {
      errors.push('Gender must be M or F');
    }

    const subjectCode = Number(data.subjectCode);
    if (!data.subjectCode || !this.validSubjectCodes.includes(subjectCode)) {
      errors.push(`Invalid SubjectCode: ${data.subjectCode}`);
    }

    const caScore = data.classScore ?? 0;
    if (caScore < 0 || caScore > 30) {
      errors.push('ContinuousAssessment must be between 0 and 30');
    }

    const exam = data.examScore ?? 0;
    if (exam < 0 || exam > 70) {
      errors.push('ExamScore must be between 0 and 70');
    }

    return errors;
  }
}
