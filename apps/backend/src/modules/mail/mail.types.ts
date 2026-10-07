import type { SendMailOptions } from 'nodemailer';

export interface MailTransport {
  sendMail(options: SendMailOptions): Promise<unknown>;
}

export interface RouteSuggestionMail {
  userName: string;
  userEmail: string;
  routeId: string;
  routeName: string;
  suggestionType: string;
  description: string;
  submittedAt: Date;
}
