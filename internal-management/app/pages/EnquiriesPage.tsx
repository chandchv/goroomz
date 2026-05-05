import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Enquiry {
  id: string;
  propertyId: string;
  name: string;
  phone: string;
  email?: string;
  message?: string;
  preferredDate?: string;
  status: 'new' | 'contacted' | 'visited' | 'converted' | 'closed';
  notes?: string;
  createdAt: string;
  property?: { id: string; name: string; slug?: string; type?: string; location?: any };
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  visited: 'bg-green-100 text-green-800',
  converted: 'bg-purple-100 text-purple-800',
  closed: 'bg-gray-100 text-gray-600',
};

export default function EnquiriesPage() {
  const { user } = useAuth();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const isAdmin = user?.role === 'admin' || (user?.role as string) === 'superuser' || 
                  user?.internalRole === 'superuser' || user?.internalRole === 'platform_admin';

  useEffect(() => { loadEnquiries(); }, [statusFilter, page]);

  const loadEnquiries = async () => {
    try {
      setIsLoading(true);
      const params: any = { page, limit: 20 };
      if (statusFilter !== 'all') params.status = statusFilter;
      
      // Admins see all enquiries, owners see only their properties' enquiries
      const endpoint = isAdmin ? '/api/enquiries/all' : '/api/enquiries/my';
      const response = await api.get(endpoint, { params });
      setEnquiries(response.data.data || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotal(response.data.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to load enquiries:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/api/enquiries/${id}/status`, { status });
      loadEnquiries();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isAdmin ? 'All Property Enquiries' : 'My Property Enquiries'}
          </h1>
          <p className="text-gray-500 text-sm">{total} total enquiries</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
        >
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="visited">Visited</option>
          <option value="converted">Converted</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-lg border p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : enquiries.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <span className="text-5xl mb-4 block">📭</span>
          <h3 className="text-lg font-medium text-gray-900">No enquiries found</h3>
          <p className="text-gray-500 text-sm">
            {statusFilter !== 'all' ? `No ${statusFilter} enquiries` : 'No enquiries yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {enquiries.map((enq) => (
            <div key={enq.id} className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{enq.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[enq.status]}`}>
                      {enq.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-gray-600 mb-2">
                    <div>📞 <a href={`tel:${enq.phone}`} className="text-blue-600 hover:underline">{enq.phone}</a></div>
                    {enq.email && <div>✉️ <a href={`mailto:${enq.email}`} className="text-blue-600 hover:underline">{enq.email}</a></div>}
                    <div>🏠 {enq.property?.name || 'Unknown Property'}</div>
                    <div>🕐 {formatDate(enq.createdAt)}</div>
                  </div>
                  {enq.message && <p className="text-sm text-gray-500 mb-2">💬 {enq.message}</p>}
                  {enq.preferredDate && <p className="text-sm text-gray-500">📅 Preferred visit: {enq.preferredDate}</p>}
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  {enq.status === 'new' && (
                    <button onClick={() => updateStatus(enq.id, 'contacted')}
                      className="px-3 py-1.5 text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 rounded hover:bg-yellow-100">
                      Mark Contacted
                    </button>
                  )}
                  {enq.status === 'contacted' && (
                    <button onClick={() => updateStatus(enq.id, 'visited')}
                      className="px-3 py-1.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100">
                      Mark Visited
                    </button>
                  )}
                  {enq.status === 'visited' && (
                    <button onClick={() => updateStatus(enq.id, 'converted')}
                      className="px-3 py-1.5 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded hover:bg-purple-100">
                      Mark Converted
                    </button>
                  )}
                  {enq.status !== 'closed' && enq.status !== 'converted' && (
                    <button onClick={() => updateStatus(enq.id, 'closed')}
                      className="px-3 py-1.5 text-xs bg-gray-50 text-gray-600 border border-gray-200 rounded hover:bg-gray-100">
                      Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-sm border rounded disabled:opacity-50 hover:bg-gray-50">Previous</button>
              <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 text-sm border rounded disabled:opacity-50 hover:bg-gray-50">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
