import React from 'react';
import { Helmet } from 'react-helmet';

const PrivacyPolicyPage = () => {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | GoRoomz</title>
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: May 2026</p>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Information We Collect</h2>
            <p className="mb-3">When you use GoRoomz, we may collect the following information:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Personal details: name, email address, phone number</li>
              <li>Account credentials and profile information</li>
              <li>Search history and browsing activity on our platform</li>
              <li>Booking data including property preferences and transaction details</li>
              <li>Device information, IP address, and browser type</li>
              <li>Location data (when you grant permission)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. How We Use Your Data</h2>
            <p className="mb-3">We use the collected information to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Create and manage your GoRoomz account</li>
              <li>Match you with relevant PG, hostel, and hotel listings</li>
              <li>Process bookings and facilitate communication with property owners</li>
              <li>Send booking confirmations, updates, and support communications</li>
              <li>Improve our platform through usage analytics</li>
              <li>Prevent fraud and ensure platform security</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Third-Party Services</h2>
            <p className="mb-3">We use the following third-party services to operate and improve GoRoomz:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Google Analytics</strong> (G-MWWLZFMNYX) — website traffic and usage analytics</li>
              <li><strong>Microsoft Clarity</strong> — session recordings and heatmaps for UX improvement</li>
              <li><strong>Cloudflare Analytics</strong> — performance monitoring and security</li>
              <li><strong>Firebase Authentication</strong> — secure user sign-in (phone/email)</li>
              <li><strong>Google Maps</strong> — property location display and directions</li>
            </ul>
            <p className="mt-3">These services may collect data according to their own privacy policies. We encourage you to review them.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Cookies and Tracking</h2>
            <p className="mb-3">GoRoomz uses cookies and similar technologies to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Keep you signed in to your account</li>
              <li>Remember your search preferences</li>
              <li>Analyze site traffic and user behavior</li>
              <li>Deliver a personalized browsing experience</li>
            </ul>
            <p className="mt-3">You can manage cookie preferences through your browser settings. Disabling cookies may affect some platform features.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Retention and Deletion</h2>
            <p className="mb-3">We retain your personal data for as long as your account is active or as needed to provide our services. You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Request access to your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Withdraw consent for marketing communications at any time</li>
            </ul>
            <p className="mt-3">To exercise these rights, contact us at <a href="mailto:support@goroomz.in" className="text-blue-600 hover:underline">support@goroomz.in</a>. We will respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Security</h2>
            <p>We implement industry-standard security measures to protect your data, including encryption in transit (HTTPS), secure authentication via Firebase, and access controls on our servers. However, no method of transmission over the internet is 100% secure.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Changes to This Policy</h2>
            <p>We may update this privacy policy from time to time. Changes will be posted on this page with an updated revision date. Continued use of GoRoomz after changes constitutes acceptance of the revised policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Contact Us</h2>
            <p>If you have questions about this privacy policy or your data, reach out to us:</p>
            <p className="mt-2">
              <strong>Email:</strong>{' '}
              <a href="mailto:support@goroomz.in" className="text-blue-600 hover:underline">support@goroomz.in</a>
            </p>
            <p><strong>Location:</strong> Bangalore, India</p>
          </section>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicyPage;
