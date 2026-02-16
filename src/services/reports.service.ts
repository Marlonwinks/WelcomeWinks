import { collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { createFirestoreConverter, createFirestoreError } from '../utils/firestore';
import { emailService } from './email.service';

export interface BusinessReport {
  reportId: string;
  businessId: string;
  businessName: string;
  reportedBy: string; // User ID
  reporterAccountType: 'full' | 'cookie' | 'anonymous';
  reporterEmail?: string;
  reporterIpAddress: string;

  // Report details
  reason: 'fake_reviews' | 'spam_reviews';
  description: string;
  severity: 'low' | 'medium' | 'high';

  // Status
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  adminNotes?: string;
  resolvedBy?: string; // Admin user ID
  resolvedAt?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportSubmission {
  businessId: string;
  businessName: string;
  reason: BusinessReport['reason'];
  description: string;
}

class ReportsService {
  private static instance: ReportsService;

  public static getInstance(): ReportsService {
    if (!ReportsService.instance) {
      ReportsService.instance = new ReportsService();
    }
    return ReportsService.instance;
  }

  /**
   * Submit a new business report
   */
  async submitReport(
    reportData: ReportSubmission,
    userId: string,
    userAccountType: 'full' | 'cookie' | 'anonymous',
    userEmail?: string,
    userIpAddress?: string
  ): Promise<BusinessReport> {
    try {
      console.log('📝 Submitting business report:', reportData);
      console.log('🔐 User authentication:', { userId, userAccountType, userEmail });

      // Get IP address if not provided
      let ipAddress = userIpAddress;
      if (!ipAddress) {
        try {
          const { ipAddressService } = await import('./ipAddress.service');
          ipAddress = await ipAddressService.getCurrentIPAddress();
        } catch (error) {
          console.warn('Failed to get IP address for report:', error);
          ipAddress = '0.0.0.0';
        }
      }

      // Determine severity based on reason
      const severity = this.determineSeverity(reportData.reason);

      const report: Omit<BusinessReport, 'reportId'> = {
        businessId: reportData.businessId,
        businessName: reportData.businessName,
        reportedBy: userId,
        reporterAccountType: userAccountType,
        reporterEmail: userEmail,
        reporterIpAddress: ipAddress || '0.0.0.0',
        reason: reportData.reason,
        description: reportData.description,
        severity,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add to Firestore
      const reportsRef = collection(db, 'businessReports');

      // Prepare data for Firestore (ensure all required fields are present)
      const firestoreData: any = {
        businessId: report.businessId,
        businessName: report.businessName,
        reportedBy: report.reportedBy,
        reporterAccountType: report.reporterAccountType,
        reporterIpAddress: report.reporterIpAddress,
        reason: report.reason,
        description: report.description,
        severity: report.severity,
        status: report.status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Add optional fields if they exist
      if (report.reporterEmail) {
        firestoreData.reporterEmail = report.reporterEmail;
      }

      const docRef = await addDoc(reportsRef, firestoreData);

      const savedReport: BusinessReport = {
        ...report,
        reportId: docRef.id
      };

      console.log(`✅ Successfully submitted report: ${docRef.id}`);

      // Send emails (non-blocking)
      try {
        if (report.reporterEmail) {
          emailService.sendReportReceivedEmail(report.reporterEmail, report.businessName);
        }
        emailService.sendAdminNotificationEmail({
          businessName: report.businessName,
          reason: report.reason,
          description: report.description,
          reporterEmail: report.reporterEmail
        });
      } catch (emailError) {
        console.error('Failed to send report emails:', emailError);
      }

      return savedReport;
    } catch (error) {
      console.error('❌ Failed to submit report:', error);
      throw createFirestoreError('submitReport', error, { reportData });
    }
  }

  /**
   * Get all reports for admin review
   */
  async getAllReports(limitCount: number = 100): Promise<BusinessReport[]> {
    try {
      const reportsRef = collection(db, 'businessReports');
      const q = query(
        reportsRef,
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<BusinessReport>()));
      const reports = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        reportId: doc.id
      }));

      console.log(`📊 Retrieved ${reports.length} reports`);
      return reports;
    } catch (error) {
      console.warn('Failed to get reports, trying without orderBy:', error);

      // Fallback query without orderBy if index is missing
      try {
        const reportsRef = collection(db, 'businessReports');
        const q = query(reportsRef, limit(limitCount));

        const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<BusinessReport>()));
        const reports = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          reportId: doc.id
        }));

        // Sort manually by createdAt
        reports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        console.log(`📊 Retrieved ${reports.length} reports (fallback)`);
        return reports;
      } catch (fallbackError) {
        throw createFirestoreError('getAllReports', fallbackError);
      }
    }
  }

  /**
   * Get pending reports for admin dashboard
   */
  async getPendingReports(limitCount: number = 50): Promise<BusinessReport[]> {
    try {
      const reportsRef = collection(db, 'businessReports');
      const q = query(
        reportsRef,
        where('status', '==', 'pending'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<BusinessReport>()));
      const reports = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        reportId: doc.id
      }));

      console.log(`📋 Retrieved ${reports.length} pending reports`);
      return reports;
    } catch (error) {
      throw createFirestoreError('getPendingReports', error);
    }
  }

  /**
   * Get reports for a specific business
   */
  async getBusinessReports(businessId: string): Promise<BusinessReport[]> {
    try {
      const reportsRef = collection(db, 'businessReports');
      const q = query(
        reportsRef,
        where('businessId', '==', businessId),
        limit(50)
      );

      const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<BusinessReport>()));
      const reports = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        reportId: doc.id
      }));

      return reports;
    } catch (error) {
      throw createFirestoreError('getBusinessReports', error, { businessId });
    }
  }

  /**
   * Update report status (admin action)
   */
  async updateReportStatus(
    reportId: string,
    status: BusinessReport['status'],
    adminUserId: string,
    adminNotes?: string
  ): Promise<void> {
    try {
      console.log(`🔄 Updating report ${reportId} status to ${status}`);

      const reportRef = doc(db, 'businessReports', reportId);
      const updateData: any = {
        status,
        updatedAt: serverTimestamp()
      };

      if (status === 'resolved' || status === 'dismissed') {
        updateData.resolvedBy = adminUserId;
        updateData.resolvedAt = serverTimestamp();
      }

      if (adminNotes) {
        updateData.adminNotes = adminNotes;
      }

      await updateDoc(reportRef, updateData);
      console.log(`✅ Updated report ${reportId} status`);

      // Send resolution email if resolved
      if (status === 'resolved') {
        try {
          // Flattening the fetch approach for now, realistically we need to fetch the report to get user email
          // Or we pass the user email into this function. 
          // Since I can't easily change the signature everywhere without breaking things, I'll fetch the doc first.

          // Note: In an ideal world we don't fetch inside a service method like this if not needed, 
          // but for this specific feature request:
          const reportSnap = await import('firebase/firestore').then(mod => mod.getDoc(reportRef));
          if (reportSnap.exists()) {
            const data = reportSnap.data() as BusinessReport;
            if (data.reporterEmail) {
              emailService.sendReportResolvedEmail(data.reporterEmail, data.businessName, adminNotes);
            }
          }
        } catch (emailError) {
          console.error('Failed to send resolution email:', emailError);
        }
      }
    } catch (error) {
      throw createFirestoreError('updateReportStatus', error, { reportId, status });
    }
  }

  /**
   * Check if user has already reported this business
   */
  async hasUserReportedBusiness(businessId: string, userId: string): Promise<boolean> {
    try {
      const reportsRef = collection(db, 'businessReports');
      const q = query(
        reportsRef,
        where('businessId', '==', businessId),
        where('reportedBy', '==', userId),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.warn('Failed to check existing report:', error);
      return false; // Allow report if check fails
    }
  }

  /**
   * Determine severity based on report reason
   */
  private determineSeverity(reason: BusinessReport['reason']): BusinessReport['severity'] {
    switch (reason) {
      case 'fake_reviews':
      case 'spam_reviews':
        return 'high'; // These directly affect our core functionality
      default:
        return 'high';
    }
  }

  /**
   * Get report reason display text
   */
  getReasonDisplayText(reason: BusinessReport['reason']): string {
    switch (reason) {
      case 'fake_reviews':
        return 'Fake Reviews';
      case 'spam_reviews':
        return 'Spam Reviews';
      default:
        return 'Review Issues';
    }
  }

  /**
   * Get severity color for UI
   */
  getSeverityColor(severity: BusinessReport['severity']): string {
    switch (severity) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-orange-600';
      case 'low':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  }

  /**
   * Get status color for UI
   */
  getStatusColor(status: BusinessReport['status']): string {
    switch (status) {
      case 'pending':
        return 'text-yellow-600';
      case 'under_review':
        return 'text-blue-600';
      case 'resolved':
        return 'text-green-600';
      case 'dismissed':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  }
}

export const reportsService = ReportsService.getInstance();