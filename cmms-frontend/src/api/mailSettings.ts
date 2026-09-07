import { api } from './client';

export interface MailSettings {
  enabled: boolean;
  mailType: 'SMTP' | 'SENDGRID';
  fromEmail: string | null;
  fromName: string | null;
  sendgridApiKeySet: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUsername: string | null;
  smtpPasswordSet: boolean;
  smtpTrustAllCertificates: boolean;
}

export interface UpdateMailSettingsPayload {
  enabled: boolean;
  mailType: 'SMTP' | 'SENDGRID';
  fromEmail?: string;
  fromName?: string;
  sendgridApiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  smtpTrustAllCertificates?: boolean;
}

export const mailSettingsApi = {
  get: () => api.get<MailSettings>('/settings/mail'),
  update: (data: UpdateMailSettingsPayload) => api.put<MailSettings>('/settings/mail', data),
  sendTest: (toEmail: string) => api.post<void>('/settings/mail/test', { toEmail }),
};
