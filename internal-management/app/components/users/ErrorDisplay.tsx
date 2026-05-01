/**
 * Error Display Component
 * Shows error messages with retry functionality
 */

interface ErrorDisplayProps {
  title: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  type?: 'error' | 'warning' | 'info';
}

export default function ErrorDisplay({
  title,
  message,
  onRetry,
  retryLabel = 'Retry',
  type = 'error',
}: ErrorDisplayProps) {
  const styles = {
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      iconColor: 'text-red-600',
      titleColor: 'text-red-800',
      messageColor: 'text-red-700',
      buttonBg: 'bg-red-600 hover:bg-red-700 active:bg-red-800',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      iconColor: 'text-yellow-600',
      titleColor: 'text-yellow-800',
      messageColor: 'text-yellow-700',
      buttonBg: 'bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-800',
      messageColor: 'text-blue-700',
      buttonBg: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
    },
  };

  const style = styles[type];

  const getIcon = () => {
    if (type === 'error') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    }
    if (type === 'warning') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  };

  return (
    <div className={`${style.bg} border ${style.border} rounded-lg p-4`}>
      <div className="flex items-start">
        <div className={`flex-shrink-0 ${style.iconColor}`}>{getIcon()}</div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${style.titleColor}`}>{title}</h3>
          {message && <p className={`mt-1 text-sm ${style.messageColor}`}>{message}</p>}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className={`ml-3 flex-shrink-0 px-3 py-1 text-sm font-medium text-white rounded-lg ${style.buttonBg} transition-colors`}
          >
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Inline Error Message
 * Shows small error message below form fields
 */
interface InlineErrorProps {
  message: string;
}

export function InlineError({ message }: InlineErrorProps) {
  return (
    <div className="flex items-center gap-1 mt-1">
      <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p className="text-sm text-red-500">{message}</p>
    </div>
  );
}

/**
 * Empty State Component
 * Shows when no data is available
 */
interface EmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: 'users' | 'search' | 'folder';
}

export function EmptyState({ title, message, actionLabel, onAction, icon = 'users' }: EmptyStateProps) {
  const getIcon = () => {
    if (icon === 'search') {
      return (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      );
    }
    if (icon === 'folder') {
      return (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
      );
    }
    return (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    );
  };

  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400 mb-4">
        {getIcon()}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {message && <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">{message}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
