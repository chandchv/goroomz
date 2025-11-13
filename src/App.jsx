import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/Header';
import HomePage from '@/pages/HomePage';
import CategoryPage from '@/pages/CategoryPage';
import PropertyDetailPage from '@/pages/PropertyDetailPage';
import SearchResultsPage from '@/pages/SearchResultsPage';
import AdminPage from '@/pages/AdminPage';
import OwnerDashboard from '@/pages/OwnerDashboard';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import NotFoundPage from '@/pages/NotFoundPage';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen">
        <Header />
        <main> {/* No extra padding needed with sticky header */}
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/category/:categoryName" element={<CategoryPage />} />
            <Route path="/property/:roomId" element={<PropertyDetailPage />} />
            <Route path="/search" element={<SearchResultsPage />} />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute role="admin">
                  <AdminPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/owner/dashboard" 
              element={
                <ProtectedRoute role="owner">
                  <OwnerDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Toaster />
      </div>
    </AuthProvider>
  );
}

export default App;