import React from 'react';
import { Helmet } from 'react-helmet';
import { MapPin, CheckCircle, Mail } from 'lucide-react';

const AboutPage = () => {
  return (
    <>
      <Helmet>
        <title>About | GoRoomz</title>
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">About GoRoomz</h1>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Our Mission</h2>
            <p>GoRoomz makes it easy to find PGs, hostels, hotels, and rental homes in India. Whether you're a student looking for affordable accommodation, a working professional searching for a comfortable PG, or a traveler needing a short stay — we're here to simplify your search.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">What We Offer</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Verified Listings</p>
                  <p className="text-sm text-gray-600">We work to verify property details so you can browse with confidence.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Transparent Pricing</p>
                  <p className="text-sm text-gray-600">See clear pricing upfront — no hidden charges or surprise fees.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Easy Booking</p>
                  <p className="text-sm text-gray-600">Connect directly with property owners and book your stay in just a few steps.</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Get in Touch</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <a href="mailto:support@goroomz.in" className="text-blue-600 hover:underline">support@goroomz.in</a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span>Bangalore, India</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default AboutPage;
