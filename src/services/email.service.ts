
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
                    from: 'Welcome Winks <noreply@companycove.com>', // Verified domain
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

    /**
     * Notify user that their report has been received
     */
    async sendReportReceivedEmail(userEmail: string, businessName: string) {
        if (!userEmail) return;

        return this.sendEmail({
            to: userEmail,
            subject: 'Report Received - Welcome Winks',
            html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>We received your report</h2>
          <p>Hi there,</p>
          <p>This is to confirm that we received your report regarding <strong>${businessName}</strong>.</p>
          <p>Our team will review the details and take appropriate action. You will receive another notification once the review is complete.</p>
          <br>
          <p>Thank you for helping keep our community safe.</p>
          <p>The Welcome Winks Team</p>
        </div>
      `
        });
    }

    /**
     * Notify admin of a new report
     */
    async sendAdminNotificationEmail(reportDetails: any) {
        // Ideally this goes to a configured admin email
        const adminEmail = 'marlon.hite@gmail.com'; // Configure this

        return this.sendEmail({
            to: adminEmail,
            subject: `New Report: ${reportDetails.reason} - ${reportDetails.businessName}`,
            html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>New Business Report</h2>
          <p><strong>Business:</strong> ${reportDetails.businessName}</p>
          <p><strong>Reason:</strong> ${reportDetails.reason}</p>
          <p><strong>Reporter:</strong> ${reportDetails.reporterEmail || 'Anonymous'}</p>
          <p><strong>Description:</strong></p>
          <blockquote style="background: #f9f9f9; padding: 10px; border-left: 4px solid #ccc;">
            ${reportDetails.description}
          </blockquote>
          <a href="https://welcomewinks.app/admin" style="display: inline-block; background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View in Admin Dashboard</a>
        </div>
      `
        });
    }

    /**
     * Notify user that their report has been resolved
     */
    async sendReportResolvedEmail(userEmail: string, businessName: string, adminNotes?: string) {
        if (!userEmail) return;

        return this.sendEmail({
            to: userEmail,
            subject: 'Update on your Report - Welcome Winks',
            html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Report Update</h2>
          <p>Hi there,</p>
          <p>We have completed our review of your report regarding <strong>${businessName}</strong>.</p>
          <p><strong>Status:</strong> Resolved</p>
          ${adminNotes ? `
            <p><strong>Admin Notes:</strong></p>
            <blockquote style="background: #e8f5e9; padding: 10px; border-left: 4px solid #4caf50;">
              ${adminNotes}
            </blockquote>
          ` : ''}
          <br>
          <p>Thank you for your contribution.</p>
          <p>The Welcome Winks Team</p>
        </div>
      `
        });
    }
}

export const emailService = EmailService.getInstance();
