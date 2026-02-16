import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Eye, Database, Lock, Users, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-20 md:pb-0 bg-background">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Privacy Policy</h1>
          </div>
        </div>

        {/* Last Updated */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        {/* Introduction */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Introduction
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Welcome to Welcome Winks! This Privacy Policy explains how we collect, use, 
              disclose, and safeguard your information when you use our mobile application 
              and website (collectively, the "Service").
            </p>
            <p>
              We are committed to protecting your privacy and ensuring the security of your 
              personal information. Please read this Privacy Policy carefully to understand 
              our practices regarding your personal data.
            </p>
          </CardContent>
        </Card>

        {/* Information We Collect */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Information We Collect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Personal Information</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Name and email address (when you create an account)</li>
                <li>Location data (with your permission)</li>
                <li>Profile information (optional demographic data)</li>
                <li>Business ratings and reviews you submit</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Usage Information</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>App usage patterns and interactions</li>
                <li>Device information and IP address</li>
                <li>Cookies and similar tracking technologies</li>
                <li>Business search and rating history</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* How We Use Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              How We Use Your Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Provide and maintain our Service</li>
              <li>Process your business ratings and reviews</li>
              <li>Improve our Service and develop new features</li>
              <li>Send you important updates and notifications</li>
              <li>Ensure the security and integrity of our Service</li>
              <li>Comply with legal obligations</li>
            </ul>
          </CardContent>
        </Card>

        {/* Data Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Data Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We implement appropriate technical and organizational security measures to 
              protect your personal information against unauthorized access, alteration, 
              disclosure, or destruction.
            </p>
            <p>
              However, no method of transmission over the internet or electronic storage 
              is 100% secure. While we strive to protect your personal information, we 
              cannot guarantee absolute security.
            </p>
          </CardContent>
        </Card>

        {/* Data Sharing */}
        <Card>
          <CardHeader>
            <CardTitle>Data Sharing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>We do not sell, trade, or otherwise transfer your personal information to third parties, except:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>With your explicit consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and safety</li>
              <li>In connection with a business transfer or acquisition</li>
            </ul>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card>
          <CardHeader>
            <CardTitle>Your Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Access your personal information</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Delete your account and associated data</li>
              <li>Withdraw consent for data processing</li>
              <li>Export your data in a portable format</li>
              <li>Object to certain types of data processing</li>
            </ul>
          </CardContent>
        </Card>

        {/* Cookies */}
        <Card>
          <CardHeader>
            <CardTitle>Cookies and Tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We use cookies and similar technologies to enhance your experience, 
              analyze usage patterns, and provide personalized content. You can 
              control cookie settings through your browser preferences.
            </p>
          </CardContent>
        </Card>

        {/* Children's Privacy */}
        <Card>
          <CardHeader>
            <CardTitle>Children's Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Our Service is not intended for children under 13 years of age. 
              We do not knowingly collect personal information from children under 13. 
              If you are a parent or guardian and believe your child has provided 
              us with personal information, please contact us.
            </p>
          </CardContent>
        </Card>

        {/* Changes to Privacy Policy */}
        <Card>
          <CardHeader>
            <CardTitle>Changes to This Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We may update this Privacy Policy from time to time. We will notify 
              you of any changes by posting the new Privacy Policy on this page 
              and updating the "Last Updated" date.
            </p>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Us
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              If you have any questions about this Privacy Policy or our data 
              practices, please contact us:
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-medium">Email:</p>
              <p className="text-sm text-muted-foreground">privacy@welcomewinks.com</p>
              <p className="font-medium mt-2">Address:</p>
              <p className="text-sm text-muted-foreground">
                Welcome Winks Privacy Team<br />
                123 Community Street<br />
                Welcoming City, WC 12345
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground py-8">
          <p>This Privacy Policy is effective as of {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
