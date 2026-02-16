
const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

class EmailService {
    private static instance: EmailService;
    private apiKey: string | undefined;

    private constructor() {
        this.apiKey = RESEND_API_KEY; // In a real app, this should be backend-only
    }

    public static getInstance(): EmailService {
        if (!EmailService.instance) {
            EmailService.instance = new EmailService();
        }
        return EmailService.instance;
    }

    /**
     * Send an email via Resend
     */
    async sendEmail(options: EmailOptions): Promise<boolean> {
        if (!this.apiKey) {
            console.warn('⚠️ Resend API Key is missing. Email simulation:', options);
            return false;
        }

        try {
            // NOTE: Calling Resend directly from client is not recommended for production due to exposed API keys.
            // This should ideally be proxied through a backend function.
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    from: 'Welcome Winks <reports@welcomewinks.com>',
                    to: [options.to],
                    subject: options.subject,
                    html: options.html
                })
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('❌ Failed to send email:', error);
                return false;
            }

            console.log('✅ Email sent successfully:', options.to);
            return true;
        } catch (error) {
            console.error('❌ Error sending email:', error);
            return false;
        }
    }

    private getBaseTemplate(title: string, content: string): string {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f5; }
                .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background-color: #7c3aed; padding: 24px; text-align: center; }
                .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
                .content { padding: 32px 24px; }
                .footer { background-color: #f4f4f5; padding: 16px; text-align: center; font-size: 12px; color: #71717a; border-top: 1px solid #e4e4e7; }
                .button { display: inline-block; background-color: #7c3aed; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin-top: 16px; }
                .info-box { background-color: #f5f3ff; border-left: 4px solid #7c3aed; padding: 16px; margin: 16px 0; border-radius: 4px; }
                .label { font-weight: 600; color: #4b5563; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; display: block; }
                .value { color: #111827; margin-bottom: 12px; display: block; }
            </style>
        </head>
        <body>
            <div style="padding: 24px 0;">
                <div class="container">
                    <div class="header">
                        <h1>Welcome Winks</h1>
                    </div>
                    <div class="content">
                        ${content}
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} Welcome Winks. All rights reserved.</p>
                        <p>Finding the vibe where you are.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Notify user that their report has been received
     */
    async sendReportReceivedEmail(userEmail: string, businessName: string) {
        if (!userEmail) return;

        const content = `
            <h2 style="margin-top: 0; color: #111827;">Report Received</h2>
            <p>Hi there,</p>
            <p>We wanted to let you know that we've received your report regarding <strong>${businessName}</strong>.</p>
            <div class="info-box">
                <p style="margin: 0;">Our team will review the details carefully. Maintaining a safe and welcoming community is our top priority.</p>
            </div>
            <p>You will receive another notification once our review is complete.</p>
            <p style="margin-top: 24px;">Best regards,<br>The Welcome Winks Team</p>
        `;

        return this.sendEmail({
            to: userEmail,
            subject: 'We received your report - Welcome Winks',
            html: this.getBaseTemplate('Report Received', content)
        });
    }

    /**
     * Notify admin of a new report
     */
    async sendAdminNotificationEmail(reportDetails: any) {
        // Ideally this goes to a configured admin email
        const adminEmail = 'marlon.hite@gmail.com';

        const content = `
            <h2 style="margin-top: 0; color: #111827;">New Business Report</h2>
            <p>A new report has been submitted requiring your attention.</p>
            
            <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-top: 20px;">
                <span class="label">Business</span>
                <span class="value" style="font-size: 1.1em;">${reportDetails.businessName}</span>
                
                <span class="label">Reason</span>
                <span class="value"><span style="background-color: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 9999px; font-size: 0.85em; font-weight: 500;">${reportDetails.reason}</span></span>
                
                <span class="label">Reporter</span>
                <span class="value">${reportDetails.reporterEmail || 'Anonymous'}</span>
                
                <span class="label" style="margin-top: 16px;">Description</span>
                <div style="background-color: #f9fafb; padding: 12px; border-radius: 4px; font-style: italic; color: #4b5563; border: 1px solid #f3f4f6;">
                    "${reportDetails.description}"
                </div>
            </div>

            <div style="text-align: center; margin-top: 32px;">
                <a href="https://welcomewinks.com/admin" class="button">View in Admin Dashboard</a>
            </div>
        `;

        return this.sendEmail({
            to: adminEmail,
            subject: `[Action Required] New Report: ${reportDetails.businessName}`,
            html: this.getBaseTemplate('New Admin Report', content)
        });
    }

    /**
     * Notify user that their report has been resolved
     */
    async sendReportResolvedEmail(userEmail: string, businessName: string, adminNotes?: string) {
        if (!userEmail) return;

        const content = `
            <h2 style="margin-top: 0; color: #111827;">Report Update</h2>
            <p>Hi there,</p>
            <p>We have completed our review of your report regarding <strong>${businessName}</strong>.</p>
            
            <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0; color: #065f46; font-weight: 500;">✓ Status: Resolved</p>
            </div>

            ${adminNotes ? `
            <div style="margin-top: 20px;">
                <span class="label">Admin Notes</span>
                <div style="background-color: #f9fafb; padding: 12px; border-radius: 6px; color: #4b5563; border: 1px solid #e5e7eb;">
                    ${adminNotes}
                </div>
            </div>
            ` : ''}
            
            <p style="margin-top: 24px;">Thank you for helping us keep Welcome Winks safe and welcoming for everyone.</p>
            <p>Best regards,<br>The Welcome Winks Team</p>
        `;

        return this.sendEmail({
            to: userEmail,
            subject: 'Update on your Report - Welcome Winks',
            html: this.getBaseTemplate('Report Resolved', content)
        });
    }
}

export const emailService = EmailService.getInstance();
