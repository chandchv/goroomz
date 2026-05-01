export function meta() {
  return [
    { title: "Page Not Found" },
    { name: "description", content: "The requested page could not be found" },
  ];
}

export default function NotFound() {
  // For Chrome DevTools and other automated requests, return minimal response
  const isAutomatedRequest = typeof window !== 'undefined' && 
    (window.location.pathname.includes('.well-known') || 
     window.location.pathname.includes('devtools'));

  if (isAutomatedRequest) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}