import React from 'react';
import { Link } from 'react-router-dom';

const POPULAR_AREAS = [
  { name: 'Koramangala', slug: 'koramangala' },
  { name: 'HSR Layout', slug: 'hsr-layout' },
  { name: 'BTM Layout', slug: 'btm-layout' },
  { name: 'Whitefield', slug: 'whitefield' },
  { name: 'Electronic City', slug: 'electronic-city' },
  { name: 'Marathahalli', slug: 'marathahalli' },
  { name: 'Indiranagar', slug: 'indiranagar' },
  { name: 'Jayanagar', slug: 'jayanagar' },
  { name: 'JP Nagar', slug: 'jp-nagar' },
  { name: 'Banashankari', slug: 'banashankari' },
  { name: 'Hebbal', slug: 'hebbal' },
  { name: 'Yelahanka', slug: 'yelahanka' },
  { name: 'Rajajinagar', slug: 'rajajinagar' },
  { name: 'Malleshwaram', slug: 'malleshwaram' },
  { name: 'Bellandur', slug: 'bellandur' },
  { name: 'Sarjapur Road', slug: 'sarjapur-road' },
];

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Area Links Section - Important for SEO */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h2 className="text-white text-lg font-bold mb-4">PG Accommodations by Area in Bangalore</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {POPULAR_AREAS.map(area => (
              <Link
                key={area.slug}
                to={`/pgs-in/${area.slug}`}
                className="text-sm text-gray-400 hover:text-purple-400 transition-colors py-1"
              >
                PGs in {area.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {/* Brand */}
          <div>
            <h3 className="text-white text-lg font-bold mb-2">GoRoomz</h3>
            <p className="text-sm text-gray-400 mb-3">
              Find verified PGs, hostels, hotels & homes in Bangalore. Zero brokerage, direct owner contact.
            </p>
            <p className="text-xs text-gray-500">
              Bangalore's trusted platform for PG accommodation with {' '}
              <span className="text-purple-400">3000+</span> verified listings.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/pgs" className="hover:text-white transition-colors">All PGs in Bangalore</Link></li>
              <li><Link to="/category/PG" className="hover:text-white transition-colors">PG Accommodations</Link></li>
              <li><Link to="/search" className="hover:text-white transition-colors">Search PGs</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">About GoRoomz</Link></li>
            </ul>
          </div>

          {/* Popular Searches */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-3">Popular Searches</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/search?gender=male" className="hover:text-white transition-colors">Boys PG in Bangalore</Link></li>
              <li><Link to="/search?gender=female" className="hover:text-white transition-colors">Girls PG in Bangalore</Link></li>
              <li><Link to="/search?amenities=meals" className="hover:text-white transition-colors">PG with Food</Link></li>
              <li><Link to="/search?maxPrice=8000" className="hover:text-white transition-colors">PG Under ₹8,000</Link></li>
              <li><Link to="/search?amenities=wifi" className="hover:text-white transition-colors">PG with WiFi</Link></li>
            </ul>
          </div>

          {/* Legal & Contact */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-3">Legal & Contact</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li>
                <a href="mailto:support@goroomz.in" className="hover:text-white transition-colors">
                  support@goroomz.in
                </a>
              </li>
              <li className="text-gray-400">Bangalore, Karnataka, India</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              © 2026 GoRoomz. All rights reserved. | Find PGs, Hostels & Rooms in Bangalore
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>🏠 3000+ PGs</span>
              <span>✓ Verified Listings</span>
              <span>₹0 Brokerage</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
