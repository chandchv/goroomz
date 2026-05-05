import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {/* Brand */}
          <div>
            <h3 className="text-white text-lg font-bold mb-1">GoRoomz</h3>
            <p className="text-sm text-gray-400">Find PGs, hostels, hotels & homes in your city.</p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-2">Quick Links</h4>
            <ul className="space-y-1 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/pgs" className="hover:text-white transition-colors">PGs</Link></li>
              <li><Link to="/search" className="hover:text-white transition-colors">Search</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">About</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-2">Legal</h4>
            <ul className="space-y-1 text-sm">
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-2">Contact</h4>
            <ul className="space-y-1 text-sm">
              <li>
                <a href="mailto:support@goroomz.in" className="hover:text-white transition-colors">
                  support@goroomz.in
                </a>
              </li>
              <li className="text-gray-400">Bangalore, India</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-6 pt-4 text-center text-xs text-gray-500">
          © 2026 GoRoomz. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
