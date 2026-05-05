import { useState } from 'react';
import { Share2, X, Copy, Check } from 'lucide-react';

const ShareButton = ({ title, text, url }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = url || window.location.href;
  const shareTitle = title || document.title;
  const shareText = text || shareTitle;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
      } catch (e) {
        if (e.name !== 'AbortError') setShowMenu(true);
      }
    } else {
      setShowMenu(true);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(shareTitle);
  const encodedText = encodeURIComponent(shareText);

  const platforms = [
    { name: 'WhatsApp', icon: '💬', url: `https://wa.me/?text=${encodedText}%20${encodedUrl}`, color: 'hover:bg-green-50' },
    { name: 'Telegram', icon: '✈️', url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, color: 'hover:bg-blue-50' },
    { name: 'Twitter / X', icon: '𝕏', url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, color: 'hover:bg-gray-50' },
    { name: 'Facebook', icon: '📘', url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, color: 'hover:bg-blue-50' },
    { name: 'LinkedIn', icon: '💼', url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, color: 'hover:bg-sky-50' },
    { name: 'Email', icon: '✉️', url: `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`, color: 'hover:bg-yellow-50' },
  ];

  return (
    <div className="relative">
      <button
        onClick={handleNativeShare}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium text-gray-700"
      >
        <Share2 className="w-4 h-4" />
        Share
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-900">Share this property</span>
              <button onClick={() => setShowMenu(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-2">
              {platforms.map(p => (
                <a
                  key={p.name}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowMenu(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm text-gray-700 ${p.color}`}
                >
                  <span className="text-lg w-6 text-center">{p.icon}</span>
                  {p.name}
                </a>
              ))}
              <button
                onClick={copyLink}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm text-gray-700 hover:bg-purple-50 w-full text-left"
              >
                <span className="text-lg w-6 text-center">
                  {copied ? <Check className="w-5 h-5 text-green-600 mx-auto" /> : <Copy className="w-5 h-5 text-gray-500 mx-auto" />}
                </span>
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ShareButton;
