import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Star, ArrowRight } from 'lucide-react';
import { getImageUrl } from '@/utils/imageUtils';
import apiService from '@/services/api';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80';

function getPrice(p) {
  const meta = typeof p.metadata === 'string' ? JSON.parse(p.metadata) : (p.metadata || {});
  if (meta.pgOptions?.sharingPrices) {
    const vals = Object.values(meta.pgOptions.sharingPrices).filter(v => v > 0);
    if (vals.length) return Math.min(...vals);
  }
  if (meta.pgOptions?.basePrice) return meta.pgOptions.basePrice;
  if (p.price && Number(p.price) > 0) return Number(p.price);
  return null;
}

function getImg(p) {
  const images = typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []);
  if (images.length > 0) {
    const first = images[0];
    return getImageUrl(first) || (typeof first === 'string' ? first : first?.url) || FALLBACK_IMG;
  }
  return FALLBACK_IMG;
}

function getLocation(p) {
  const loc = typeof p.location === 'string' ? JSON.parse(p.location) : (p.location || {});
  return [loc.area, loc.city].filter(Boolean).join(', ');
}

const SimilarProperties = ({ propertyId, area, city }) => {
  const navigate = useNavigate();
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!propertyId) return;
    setLoading(true);
    apiService.get(`/properties/${propertyId}/similar?limit=6`, { includeAuth: false })
      .then(res => {
        if (res.success) setSimilar(res.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [propertyId]);

  if (loading) return null;
  if (similar.length === 0) return null;

  const handleClick = (p) => {
    const isPG = (p.type || '').toLowerCase() === 'pg' || (p.type || '').toLowerCase() === 'hostel';
    if (isPG && p.slug) {
      navigate(`/pg/${p.slug}`);
    } else {
      navigate(`/property/${p.slug || p.id}`);
    }
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          Similar Properties {area ? `in ${area}` : city ? `in ${city}` : 'Nearby'}
        </h2>
        {area && (
          <button
            onClick={() => navigate(`/search?q=${encodeURIComponent(area)}`)}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
          >
            View All <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {similar.map((p) => {
          const price = getPrice(p);
          const img = getImg(p);
          const loc = getLocation(p);
          const rating = typeof p.rating === 'string' ? JSON.parse(p.rating) : (p.rating || {});

          return (
            <div
              key={p.id}
              onClick={() => handleClick(p)}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer group hover:shadow-md transition-all"
            >
              {/* Image */}
              <div className="relative h-36 overflow-hidden">
                <img
                  src={img}
                  alt={p.name || p.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {rating?.average > 0 && (
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs font-semibold">{rating.average}</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-3">
                <h3 className="font-semibold text-gray-900 text-sm line-clamp-1 mb-1">{p.name || p.title}</h3>
                {loc && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                    <MapPin className="w-3 h-3 flex-shrink-0" /> {loc}
                  </p>
                )}
                {price ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-purple-600">₹{price.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-gray-400">/month</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">Price on request</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default SimilarProperties;
