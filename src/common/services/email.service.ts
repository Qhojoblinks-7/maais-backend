import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter {
    if (this.transporter) return this.transporter;

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      throw new UnprocessableEntityException(
        'SMTP is not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS.',
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    return this.transporter;
  }

  async sendMail(to: string, subject: string, html: string) {
    const transporter = this.getTransporter();
    await transporter.sendMail({
      from: `"MAAIS" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  }
}
