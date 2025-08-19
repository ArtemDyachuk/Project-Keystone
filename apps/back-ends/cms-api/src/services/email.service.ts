import { Injectable } from '@nestjs/common';

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  from?: string;
};

@Injectable()
export class EmailService {
  private readonly apiKey: string | undefined;
  private readonly fromEmail: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.RESEND_FROM!;
  }

  async sendEmail(params: SendEmailParams): Promise<void> {
    if (!this.apiKey) {
      console.error("[EmailService] RESEND_API_KEY missing.");
      return;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: params.from || this.fromEmail,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Resend API error: ${response.status} ${text}`);
    }
  }
}


