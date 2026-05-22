import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { MapPin, CheckCircle, Mail, Building2, Users, Shield, Zap, Phone } from 'lucide-react';

const AboutPage = () => {
  return (
    <>
      <Helmet>
        <title>About GoRoomz - Bangalore's Trusted PG Accommodation Platform</title>
        <meta name="description" content="GoRoomz is Bangalore's leading platform to find verified PG accommodations, hostels, and rental rooms. Zero brokerage, 3000+ verified listings, direct owner contact." />
        <meta name="keywords" content="GoRoomz, about GoRoomz, PG platform Bangalore, paying guest finder, room rental platform India" />
        <link rel="canonical" href="https://goroomz.in/about" />
        <meta property="og:title" content="About GoRoomz - Bangalore's Trusted PG Platform" />
        <meta property="og:description" content="Find verified PGs in Bangalore with zero brokerage. 3000+ listings, direct owner contact." />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "AboutPage",
          "name": "About GoRoomz",
          "description": "GoRoomz is Bangalore's leading platform to find verified PG accommodations",
          "url": "https://goroomz.in/about",
          "isPartOf": { "@type": "WebSite", "name": "GoRoomz", "url": "https://goroomz.in" }
        })}</script>
      </Helmet>

      <div className="min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-br from-purple-700 to-indigo-700 text-white py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">About GoRoomz</h1>
            <p className="text-xl text-purple-100 max-w-2xl mx-auto">
              Bangalore's trusted platform to find verified PG accommodations with zero brokerage
            </p>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="space-y-10 text-gray-700 leading-relaxed">
            
            {/* Mission */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-lg">
                GoRoomz makes it easy to find PGs, hostels, hotels, and rental homes in Bangalore and across India. 
                Whether you're a student looking for affordable PG accommodation near your college, a working professional 
                searching for a comfortable PG near your office in Koramangala, HSR Layout, or Whitefield — we're here 
                to simplify your search and eliminate the hassle of brokers.
              </p>
            </section>

            {/* Stats */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Building2, value: '3000+', label: 'Verified PGs', color: 'text-purple-600 bg-purple-50' },
                { icon: Users, value: '50+', label: 'Areas Covered', color: 'text-blue-600 bg-blue-50' },
                { icon: Zap, value: '₹0', label: 'Brokerage', color: 'text-green-600 bg-green-50' },
                { icon: Phone, value: 'Direct', label: 'Owner Contact', color: 'text-orange-600 bg-orange-50' },
              ].map(({ icon: Icon, value, label, color }) => (
                <div key={label} className="text-center p-6 rounded-xl border border-gray-200">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{value}</div>
                  <div className="text-sm text-gray-500">{label}</div>
                </div>
              ))}
            </section>

            {/* What We Offer */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">What We Offer</h2>
              <div className="space-y-4">
                {[
                  { title: 'Verified Listings', desc: 'Every PG on GoRoomz is verified for accuracy. We check property details, photos, and pricing so you can browse with confidence.' },
                  { title: 'Zero Brokerage', desc: 'No middlemen, no hidden charges. Connect directly with PG owners and save thousands in brokerage fees.' },
                  { title: 'Transparent Pricing', desc: 'See clear pricing upfront including sharing options (single, double, triple), daily rates, and included amenities.' },
                  { title: 'Easy Search & Filters', desc: 'Search by area, budget, gender preference, amenities (WiFi, food, AC), and more. Find your perfect PG in minutes.' },
                  { title: 'Direct Owner Contact', desc: 'Call or message PG owners directly. No agents, no delays. Schedule visits and move in faster.' },
                ].map(item => (
                  <div key={item.title} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Areas We Cover */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Areas We Cover in Bangalore</h2>
              <p className="text-gray-600 mb-4">
                GoRoomz has PG listings across all major areas in Bangalore including:
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  'Koramangala', 'HSR Layout', 'BTM Layout', 'Whitefield', 'Electronic City',
                  'Marathahalli', 'Indiranagar', 'Jayanagar', 'JP Nagar', 'Banashankari',
                  'Hebbal', 'Bellandur', 'Sarjapur Road', 'Malleshwaram', 'Rajajinagar',
                ].map(area => (
                  <Link
                    key={area}
                    to={`/pgs-in/${area.toLowerCase().replace(/\s+/g, '-')}`}
                    className="px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-full text-sm text-purple-700 hover:bg-purple-100 transition"
                  >
                    {area}
                  </Link>
                ))}
              </div>
            </section>

            {/* For PG Owners */}
            <section className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">For PG Owners</h2>
              <p className="text-gray-600 mb-4">
                List your PG on GoRoomz for free and reach thousands of potential tenants. Our platform helps you:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Get direct tenant enquiries</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Manage bookings easily</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Showcase your property with photos</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> No listing fees — completely free</li>
              </ul>
              <Link to="/signup" className="inline-block mt-4 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition">
                List Your PG Free →
              </Link>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Get in Touch</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-500" />
                  <a href="mailto:support@goroomz.in" className="text-purple-600 hover:underline text-lg">support@goroomz.in</a>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-700">Bangalore, Karnataka, India</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default AboutPage;
