import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';

const NotFoundPage = () => {
  return (
    <>
      <Helmet>
        <title>404 - Page Not Found</title>
        <meta name="description" content="The page you are looking for does not exist." />
      </Helmet>
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="w-48 h-48 mx-auto mb-8 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
          <span className="text-8xl">😢</span>
        </div>
        <h1 className="text-6xl font-bold mb-4 gradient-text">404</h1>
        <h2 className="text-3xl font-semibold mb-4">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          Oops! The page you're looking for seems to have taken a vacation.
        </p>
        <Button asChild className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <Link to="/">Go Back Home</Link>
        </Button>
      </div>
    </>
  );
};

export default NotFoundPage;