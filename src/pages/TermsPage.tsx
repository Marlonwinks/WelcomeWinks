import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Scale, AlertTriangle, Users, Shield, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsPage: React.FC = () => {
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
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Terms of Service</h1>
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
              <Scale className="h-5 w-5" />
              Agreement to Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Welcome to Welcome Winks! These Terms of Service ("Terms") govern your use 
              of our mobile application and website (collectively, the "Service") operated 
              by Welcome Winks ("us", "we", or "our").
            </p>
            <p>
              By accessing or using our Service, you agree to be bound by these Terms. 
              If you disagree with any part of these terms, then you may not access the Service.
            </p>
          </CardContent>
        </Card>

        {/* Acceptance of Terms */}
        <Card>
          <CardHeader>
            <CardTitle>Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              By using our Service, you confirm that you:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Are at least 13 years of age</li>
              <li>Have the legal capacity to enter into this agreement</li>
              <li>Will comply with all applicable laws and regulations</li>
              <li>Will provide accurate and truthful information</li>
            </ul>
          </CardContent>
        </Card>

        {/* Description of Service */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Description of Service
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Welcome Winks is a community-driven platform that allows users to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Rate and review businesses based on their welcoming atmosphere</li>
              <li>Discover welcoming places in their area</li>
              <li>Share experiences to help others make informed decisions</li>
              <li>Contribute to building a more inclusive community</li>
            </ul>
          </CardContent>
        </Card>

        {/* User Accounts */}
        <Card>
          <CardHeader>
            <CardTitle>User Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              When you create an account with us, you must provide information that is 
              accurate, complete, and current at all times. You are responsible for:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use</li>
              <li>Ensuring your account information remains accurate</li>
            </ul>
          </CardContent>
        </Card>

        {/* User Conduct */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              User Conduct
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>You agree not to:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Submit false, misleading, or fraudulent information</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Submit content that is illegal, harmful, or offensive</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Use the Service for any commercial purpose without permission</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Violate any applicable laws or regulations</li>
            </ul>
          </CardContent>
        </Card>

        {/* Content and Reviews */}
        <Card>
          <CardHeader>
            <CardTitle>Content and Reviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              By submitting content (including reviews, ratings, and comments), you grant 
              us a non-exclusive, royalty-free, worldwide license to use, modify, and 
              display such content in connection with the Service.
            </p>
            <p>
              You represent and warrant that your content:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Is original or you have the right to submit it</li>
              <li>Does not infringe on any third-party rights</li>
              <li>Is accurate and based on your personal experience</li>
              <li>Complies with our community guidelines</li>
            </ul>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Your privacy is important to us. Please review our Privacy Policy, 
              which also governs your use of the Service, to understand our practices.
            </p>
            <Button 
              variant="outline" 
              onClick={() => navigate('/privacy')}
              className="mt-2"
            >
              View Privacy Policy
            </Button>
          </CardContent>
        </Card>

        {/* Intellectual Property */}
        <Card>
          <CardHeader>
            <CardTitle>Intellectual Property</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              The Service and its original content, features, and functionality are and 
              will remain the exclusive property of Welcome Winks and its licensors. 
              The Service is protected by copyright, trademark, and other laws.
            </p>
          </CardContent>
        </Card>

        {/* Termination */}
        <Card>
          <CardHeader>
            <CardTitle>Termination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We may terminate or suspend your account immediately, without prior notice 
              or liability, for any reason whatsoever, including without limitation if 
              you breach the Terms.
            </p>
            <p>
              Upon termination, your right to use the Service will cease immediately. 
              If you wish to terminate your account, you may simply discontinue using 
              the Service.
            </p>
          </CardContent>
        </Card>

        {/* Disclaimers */}
        <Card>
          <CardHeader>
            <CardTitle>Disclaimers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              The information on this Service is provided on an "as is" basis. To the 
              fullest extent permitted by law, this Company:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Excludes all representations and warranties relating to this Service</li>
              <li>Does not guarantee the accuracy or completeness of user-generated content</li>
              <li>Is not responsible for the actions or content of other users</li>
              <li>Does not endorse any businesses listed on the Service</li>
            </ul>
          </CardContent>
        </Card>

        {/* Limitation of Liability */}
        <Card>
          <CardHeader>
            <CardTitle>Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              In no event shall Welcome Winks, nor its directors, employees, partners, 
              agents, suppliers, or affiliates, be liable for any indirect, incidental, 
              special, consequential, or punitive damages, including without limitation, 
              loss of profits, data, use, goodwill, or other intangible losses, resulting 
              from your use of the Service.
            </p>
          </CardContent>
        </Card>

        {/* Governing Law */}
        <Card>
          <CardHeader>
            <CardTitle>Governing Law</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              These Terms shall be interpreted and governed by the laws of the United States, 
              without regard to its conflict of law provisions. Our failure to enforce any 
              right or provision of these Terms will not be considered a waiver of those rights.
            </p>
          </CardContent>
        </Card>

        {/* Changes to Terms */}
        <Card>
          <CardHeader>
            <CardTitle>Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We reserve the right, at our sole discretion, to modify or replace these Terms 
              at any time. If a revision is material, we will try to provide at least 30 days 
              notice prior to any new terms taking effect.
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
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-medium">Email:</p>
              <p className="text-sm text-muted-foreground">legal@welcomewinks.com</p>
              <p className="font-medium mt-2">Address:</p>
              <p className="text-sm text-muted-foreground">
                Welcome Winks Legal Team<br />
                123 Community Street<br />
                Welcoming City, WC 12345
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground py-8">
          <p>These Terms of Service are effective as of {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
