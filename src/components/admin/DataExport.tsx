import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { reportsService } from '@/services/reports.service';

export const DataExport: React.FC = () => {
    const handleExport = async () => {
        try {
            // 1. Fetch Reports
            const reports = await reportsService.getAllReports(1000);

            // 2. Prepare Data Object
            const exportData = {
                exportedAt: new Date().toISOString(),
                reports: reports,
                // In a real scenario, you'd fetch users, businesses (if stored in local DB) etc.
                // For this task, we focus on the data we have access to via services.
            };

            // 3. Convert to JSON
            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            // 4. Trigger Download
            const link = document.createElement('a');
            link.href = url;
            link.download = `welcome_winks_export_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export data. See console for details.');
        }
    };

    return (
        <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Data
        </Button>
    );
};
