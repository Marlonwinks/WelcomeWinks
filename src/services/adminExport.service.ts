import { adminDataService } from './adminData.service';
import { adminReviewsService } from './adminReviews.service';
import { reportsService } from './reports.service';

export interface ExportOptions {
  includeBusinesses?: boolean;
  includeReviews?: boolean;
  includeReports?: boolean;
  includeUsers?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  format: 'csv' | 'json';
}

class AdminExportService {
  async exportData(options: ExportOptions): Promise<string> {
    const data: any = {};

    try {
      // Export businesses
      if (options.includeBusinesses) {
        console.log('📊 Exporting businesses...');
        const dashboardData = await adminDataService.getDashboardData('90d');
        data.businesses = dashboardData.topBusinesses.map(business => ({
          id: business.businessId,
          name: business.name,
          marks: business.marks,
          score: business.score,
          address: business.address || 'N/A'
        }));

        // Add analytics data
        data.cityStats = dashboardData.topCities.map(city => ({
          city: city.city,
          state: city.state,
          ratingsCount: city.ratingsCount,
          businessesCount: city.businessesCount,
          averageScore: city.averageScore
        }));

        data.categoryStats = dashboardData.topCategories.map(category => ({
          category: category.category,
          businessCount: category.businessCount,
          ratingsCount: category.ratingsCount,
          averageScore: category.averageScore
        }));

        data.userEngagement = dashboardData.userEngagement.map(engagement => ({
          accountType: engagement.accountType,
          userCount: engagement.userCount,
          averageRatingsPerUser: engagement.averageRatingsPerUser,
          percentage: engagement.percentage
        }));

        data.peakActivityHours = dashboardData.peakActivityHours.slice(0, 10).map(activity => ({
          hour: activity.hour,
          label: activity.label,
          ratingsCount: activity.ratingsCount
        }));
      }

      // Export reviews
      if (options.includeReviews) {
        console.log('📊 Exporting reviews...');
        const filter: any = {};
        if (options.dateFrom) filter.dateFrom = options.dateFrom;
        if (options.dateTo) filter.dateTo = options.dateTo;
        
        const reviews = await adminReviewsService.getReviewsWithUserInfo(filter, 1000);
        data.reviews = reviews.map(review => ({
          id: review.rating.ratingId,
          businessName: review.businessName,
          businessId: review.rating.businessId,
          userId: review.rating.userId,
          userEmail: review.userEmail || 'N/A',
          userLocation: review.userLocation || 'N/A',
          ipAddress: review.rating.userIpAddress,
          score: review.rating.totalScore,
          accountType: review.userProfile?.accountType || review.cookieAccount?.accountType || 'anonymous',
          createdAt: review.rating.createdAt.toISOString(),
          ipGeolocation: review.ipGeolocation ? `${review.ipGeolocation.city}, ${review.ipGeolocation.region}` : 'N/A'
        }));
      }

      // Export reports
      if (options.includeReports) {
        console.log('📊 Exporting reports...');
        const reports = await reportsService.getAllReports();
        data.reports = reports.map(report => ({
          id: report.reportId,
          businessId: report.businessId,
          businessName: report.businessName,
          reportedBy: report.reportedBy,
          reporterAccountType: report.reporterAccountType,
          reason: report.reason,
          description: report.description,
          severity: report.severity,
          status: report.status,
          createdAt: report.createdAt.toISOString(),
          updatedAt: report.updatedAt.toISOString()
        }));
      }

      if (options.format === 'csv') {
        return this.convertToCSV(data);
      } else {
        return JSON.stringify(data, null, 2);
      }
    } catch (error) {
      console.error('❌ Export failed:', error);
      throw new Error('Failed to export data. Please try again.');
    }
  }

  private convertToCSV(data: any): string {
    let csvContent = '';

    // Convert each data type to CSV
    Object.keys(data).forEach(key => {
      if (data[key] && data[key].length > 0) {
        csvContent += `\n=== ${key.toUpperCase()} ===\n`;
        
        const items = data[key];
        const headers = Object.keys(items[0]);
        
        // Add headers
        csvContent += headers.join(',') + '\n';
        
        // Add data rows
        items.forEach((item: any) => {
          const row = headers.map(header => {
            const value = item[header];
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value || '';
          });
          csvContent += row.join(',') + '\n';
        });
        
        csvContent += '\n';
      }
    });

    return csvContent;
  }

  async generatePDFReport(): Promise<string> {
    try {
      console.log('📄 Generating PDF report...');
      const dashboardData = await adminDataService.getDashboardData('30d');
      
      // Simple text-based report (in a real app, you'd use a PDF library)
      const report = `
WELCOME WINKS ADMIN REPORT
Generated: ${new Date().toLocaleString()}
Period: Last 30 days

=== KEY METRICS ===
Total Businesses: ${dashboardData.kpis.totalBusinesses.toLocaleString()}
Total Reviews: ${dashboardData.kpis.totalReviews.toLocaleString()}
Active Users: ${dashboardData.kpis.dailyActiveUsers.toLocaleString()}
Trending Category: ${dashboardData.kpis.trendingCategory}

=== TOP BUSINESSES ===
${dashboardData.topBusinesses.slice(0, 10).map((business, index) => 
  `${index + 1}. ${business.name} - ${business.marks} marks (Score: ${business.score > 0 ? business.score.toFixed(1) : 'N/A'})`
).join('\n')}

=== TOP CITIES BY ACTIVITY ===
${dashboardData.topCities.slice(0, 8).map((city, index) => 
  `${index + 1}. ${city.city}, ${city.state} - ${city.ratingsCount} ratings, ${city.businessesCount} businesses (Avg: ${city.averageScore.toFixed(1)})`
).join('\n')}

=== USER ENGAGEMENT ===
${dashboardData.userEngagement.map(engagement => 
  `${engagement.accountType}: ${engagement.userCount} users (${engagement.percentage}%) - Avg ${engagement.averageRatingsPerUser} ratings/user`
).join('\n')}

=== POPULAR CATEGORIES ===
${dashboardData.topCategories.slice(0, 6).map((category, index) => 
  `${index + 1}. ${category.category} - ${category.businessCount} businesses, ${category.ratingsCount} ratings (Avg: ${category.averageScore.toFixed(1)})`
).join('\n')}

=== PEAK ACTIVITY HOURS ===
${dashboardData.peakActivityHours.slice(0, 5).map((activity, index) => 
  `${index + 1}. ${activity.label} - ${activity.ratingsCount} ratings`
).join('\n')}

=== PENDING REPORTS ===
${dashboardData.pendingReports.length > 0 ? 
  dashboardData.pendingReports.slice(0, 5).map(report => 
    `• ${report.business} - ${report.reason} (${report.severity})`
  ).join('\n') : 
  'No pending reports'
}

=== SCORE DISTRIBUTION ===
${dashboardData.scoreDistribution.map(item => 
  `${item.range} stars: ${item.count} places (${item.percentage}%)`
).join('\n')}

Report generated by Welcome Winks Admin System
      `.trim();

      return report;
    } catch (error) {
      console.error('❌ PDF report generation failed:', error);
      throw new Error('Failed to generate PDF report. Please try again.');
    }
  }

  downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const adminExportService = new AdminExportService();