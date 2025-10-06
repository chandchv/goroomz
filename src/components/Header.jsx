import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Home, Menu, X, Building, BedDouble, Shield, LogOut, UserCircle } from 'lucide-react';
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

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const navLinks = [
    { name: 'Home', path: '/' },
    ...(user?.role === 'admin' ? [{ name: 'Admin Panel', path: '/admin' }] : []),
  ];

  const categories = [
    { name: 'PGs', path: '/category/PG', icon: <Building className="w-4 h-4 mr-2" /> },
    { name: 'Hotel Rooms', path: '/category/Hotel Room', icon: <BedDouble className="w-4 h-4 mr-2" /> },
    { name: 'Independent Homes', path: '/category/Independent Home', icon: <Home className="w-4 h-4 mr-2" /> },
    { name: 'Home Stays', path: '/category/Home Stay', icon: <Shield className="w-4 h-4 mr-2" /> },
  ];

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="glass-effect sticky top-0 z-50 border-b"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <motion.div whileHover={{ scale: 1.02 }}>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 flex items-center justify-center shadow-lg">
                <Home className="w-6 h-6 text-white" />
              </div>
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">GoRoomz</h1>
              <p className="text-sm text-muted-foreground">Find Your Perfect room</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <NavLink 
                key={link.name} 
                to={link.path}
                className={({ isActive }) => 
                  `font-semibold transition-colors ${isActive ? 'gradient-text' : 'text-muted-foreground hover:text-foreground'}`
                }
              >
                {link.name}
              </NavLink>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger className="font-semibold text-muted-foreground hover:text-foreground flex items-center focus:outline-none">Categories</DropdownMenuTrigger>
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
                <Button variant="ghost" asChild>
                  <Link to="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </div>
            )}
            <div className="md:hidden">
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <X /> : <Menu />}
              </Button>
            </div>
          </div>
        </div>
      </div>
      {isMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden"
        >
          <nav className="flex flex-col items-center gap-4 py-4 border-t">
            {navLinks.map(link => (
              <NavLink key={link.name} to={link.path} onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `font-semibold ${isActive ? 'gradient-text' : 'text-muted-foreground'}`}>{link.name}</NavLink>
            ))}
            <h3 className="font-bold mt-2">Categories</h3>
            {categories.map(cat => (
              <Link key={cat.name} to={cat.path} onClick={() => setIsMenuOpen(false)} className="text-muted-foreground flex items-center">
                {cat.icon}
                {cat.name}
              </Link>
            ))}
            <DropdownMenuSeparator className="my-2" />
            {user ? (
              <Button variant="ghost" onClick={() => { logout(); setIsMenuOpen(false); }}>Logout</Button>
            ) : (
              <>
                <Button variant="ghost" asChild><Link to="/login" onClick={() => setIsMenuOpen(false)}>Login</Link></Button>
                <Button asChild><Link to="/signup" onClick={() => setIsMenuOpen(false)}>Sign Up</Link></Button>
              </>
            )}
          </nav>
        </motion.div>
      )}
    </motion.header>
  );
};

export default Header;