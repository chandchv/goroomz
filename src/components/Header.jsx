import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Home, Menu, X, Building, BedDouble, Shield, LogOut, UserCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavLink, Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useAuth } from '@/hooks/useAuth';
import CategoryOwnerSignupModal from '@/components/CategoryOwnerSignupModal';
import HomeSearchBar from '@/components/HomeSearchBar';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const { user, logout } = useAuth();

  const navLinks = [
    { name: 'Home', path: '/' },
    ...(user?.role === 'admin' ? [{ name: 'Admin Panel', path: '/admin' }] : []),
    ...(user?.role === 'owner' ? [{ name: 'My Dashboard', path: '/owner/dashboard' }] : []),
  ];

  const categories = [
    { name: 'PGs', path: '/category/PG', icon: <Building className="w-4 h-4 mr-2" /> },
    { name: 'Hotel Rooms', path: '/category/Hotel Room', icon: <BedDouble className="w-4 h-4 mr-2" /> },
    { name: 'Independent Homes', path: '/category/Independent Home', icon: <Home className="w-4 h-4 mr-2" /> },
    { name: 'Home Stays', path: '/category/Home Stay', icon: <Shield className="w-4 h-4 mr-2" /> },
  ];

  return (
    <>
      {/* Main Header - Always visible */}
      <header className="bg-white/95 backdrop-blur-sm sticky top-0 z-40 border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <motion.div whileHover={{ scale: 1.02 }}>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 flex items-center justify-center shadow-lg">
                <Home className="w-6 h-6 text-white" />
              </div>
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">GoRoomz</h1>
              <p className="text-sm text-gray-600">Find Your Perfect room</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <NavLink 
                key={link.name} 
                to={link.path}
                className={({ isActive }) => 
                  `font-semibold transition-colors ${isActive ? 'bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent' : 'text-gray-600 hover:text-purple-600'}`
                }
              >
                {link.name}
              </NavLink>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger className="font-semibold text-gray-600 hover:text-purple-600 flex items-center focus:outline-none">Categories</DropdownMenuTrigger>
              <DropdownMenuContent>
                {categories.map(cat => (
                  <DropdownMenuItem key={cat.name} asChild>
                    <Link to={cat.path} className="flex items-center">
                      {cat.icon}
                      {cat.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <UserCircle className="h-5 w-5" />
                    <span className="hidden sm:inline">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
                ) : (
                  <div className="hidden md:flex items-center gap-2">
                    <Button variant="ghost" asChild className="text-gray-600 hover:text-purple-600">
                      <Link to="/login">Login</Link>
                    </Button>
                    <Button asChild className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                      <Link to="/signup">Sign Up</Link>
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setIsSignupModalOpen(true)}
                      className="border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      List Property
                    </Button>
                  </div>
                )}
            <div className="md:hidden">
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-600 hover:text-purple-600">
                {isMenuOpen ? <X /> : <Menu />}
              </Button>
            </div>
          </div>
        </div>

        {/* Search Bar Section */}
        <div className="mt-3 pb-2">
          <HomeSearchBar compact={true} />
        </div>
      </div>
      {isMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden"
        >
          <nav className="flex flex-col items-center gap-3 py-3 border-t">
            
            {navLinks.map(link => (
              <NavLink key={link.name} to={link.path} onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `font-semibold ${isActive ? 'bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent' : 'text-gray-600 hover:text-purple-600'}`}>{link.name}</NavLink>
            ))}
            <h3 className="font-bold mt-2 text-gray-800">Categories</h3>
            {categories.map(cat => (
              <Link key={cat.name} to={cat.path} onClick={() => setIsMenuOpen(false)} className="text-gray-600 hover:text-purple-600 flex items-center">
                {cat.icon}
                {cat.name}
              </Link>
            ))}
            <DropdownMenuSeparator className="my-2" />
            {user ? (
              <Button variant="ghost" onClick={() => { logout(); setIsMenuOpen(false); }} className="text-gray-600 hover:text-purple-600">Logout</Button>
                ) : (
                  <>
                    <Button variant="ghost" asChild className="text-gray-600 hover:text-purple-600"><Link to="/login" onClick={() => setIsMenuOpen(false)}>Login</Link></Button>
                    <Button asChild className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"><Link to="/signup" onClick={() => setIsMenuOpen(false)}>Sign Up</Link></Button>
                    <Button 
                      variant="outline"
                      onClick={() => { setIsSignupModalOpen(true); setIsMenuOpen(false); }}
                      className="border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      List Property
                    </Button>
                  </>
                )}
          </nav>
        </motion.div>
      )}
      </header>

      {/* Category Owner Signup Modal */}
      <CategoryOwnerSignupModal
        isOpen={isSignupModalOpen}
        onClose={() => setIsSignupModalOpen(false)}
        onSuccess={(userData) => {
          console.log('Category owner created:', userData);
        }}
      />
    </>
  );
};

export default Header;