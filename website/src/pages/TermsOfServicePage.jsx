import React from 'react';
import { Helmet } from 'react-helmet';

const TermsOfServicePage = () => {
  return (
    <>
      <Helmet>
        <title>Terms of Service | GoRoomz</title>
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: May 2026</p>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using GoRoomz (goroomz.in), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform. These terms apply to all users, including property seekers, property owners, and visitors.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Account Registration</h2>
            <p className="mb-3">To access certain features, you must create an account. You agree to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide accurate and complete registration information</li>
              <li>Keep your account credentials secure and confidential</li>
              <li>Notify us immediately of any unauthorized access to your account</li>
              <li>Be responsible for all activity under your account</li>
            </ul>
            <p className="mt-3">We reserve the right to suspend or terminate accounts that violate these terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Property Listings</h2>
            <p className="mb-3">GoRoomz is a platform that connects property seekers with property owners. Important clarifications:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>GoRoomz does not own, operate, or manage any listed properties</li>
              <li>We do not guarantee the accuracy of listing information provided by property owners</li>
              <li>Property availability, pricing, and amenities are subject to change by the property owner</li>
              <li>Users should verify property details directly with the owner before making decisions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Booking and Payments</h2>
            <p className="mb-3">When using our booking features:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Bookings are subject to availability and confirmation by the property owner</li>
              <li>Payment terms, cancellation policies, and refunds are determined by individual properties</li>
              <li>GoRoomz may facilitate payments but is not responsible for disputes between users and property owners</li>
              <li>All pricing displayed is indicative and may vary based on duration, occupancy, and season</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Property Claims and Verification</h2>
            <p className="mb-3">Property owners can claim and manage their listings on GoRoomz:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Claims are subject to verification by our team</li>
              <li>Owners must provide valid proof of ownership or authorization to manage a property</li>
              <li>Verified listings are marked accordingly but verification does not constitute an endorsement</li>
              <li>GoRoomz reserves the right to reject or revoke claims at its discretion</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. User Conduct</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Post false, misleading, or fraudulent information</li>
              <li>Harass, abuse, or harm other users or property owners</li>
              <li>Use the platform for any unlawful purpose</li>
              <li>Scrape, crawl, or extract data from GoRoomz without permission</li>
              <li>Interfere with the platform's operation or security</li>
              <li>Create multiple accounts for deceptive purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Intellectual Property</h2>
            <p>All content on GoRoomz — including the logo, design, text, graphics, and software — is the property of GoRoomz or its licensors and is protected by intellectual property laws. You may not reproduce, distribute, or create derivative works from our content without written permission.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Limitation of Liability</h2>
            <p className="mb-3">To the maximum extent permitted by law:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>GoRoomz is provided "as is" without warranties of any kind</li>
              <li>We are not liable for any damages arising from your use of the platform</li>
              <li>We are not responsible for the quality, safety, or legality of listed properties</li>
              <li>Our total liability shall not exceed the amount paid by you to GoRoomz in the preceding 12 months</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Dispute Resolution</h2>
            <p className="mb-3">These terms are governed by the laws of India. Any disputes arising from the use of GoRoomz shall be subject to the exclusive jurisdiction of the courts in Bangalore, Karnataka, India.</p>
            <p>We encourage users to contact us first to resolve any issues amicably before pursuing legal action.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Changes to Terms</h2>
            <p>We may modify these terms at any time. Changes will be effective upon posting to this page. Your continued use of GoRoomz after changes are posted constitutes acceptance of the updated terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact Us</h2>
            <p>For questions about these terms, contact us at:</p>
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

export default TermsOfServicePage;
