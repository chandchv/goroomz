import { useState, useEffect } from 'react';
import { useToast } from '../../hooks/useToast';
import { documentService, type Document } from '../../services/documentService';

interface DocumentListProps {
  leadId?: string;
  propertyOwnerId?: string;
  onDocumentClick?: (document: Document) => void;
  onDocumentDelete?: (documentId: string) => void;
  onDocumentReview?: (documentId: string, status: 'approved' | 'rejected', notes?: string) => void;
  showActions?: boolean;
  showReviewActions?: boolean;
}

export default function DocumentList({
  leadId,
  propertyOwnerId,
  onDocumentClick,
  onDocumentDelete,
  onDocumentReview,
  showActions = true,
  showReviewActions = false,
}: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    loadDocuments();
  }, [leadId, propertyOwnerId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let docs: Document[] = [];
      if (leadId) {
        docs = await documentService.getLeadDocuments(leadId);
      } else if (propertyOwnerId) {
        docs = await documentService.getPropertyOwnerDocuments(propertyOwnerId);
      }
      
      setDocuments(docs);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load documents');
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      setDeletingId(documentId);
      
      await documentService.deleteDocument(documentId);
      
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      showToast({ title: 'Document deleted successfully', type: 'success' });
      
      if (onDocumentDelete) {
        onDocumentDelete(documentId);
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      showToast({ 
        title: err.response?.data?.message || 'Failed to delete document', 
        type: 'error' 
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleReview = async (documentId: string, status: 'approved' | 'rejected') => {
    if (status === 'rejected' && !reviewNotes.trim()) {
      showToast({ 
        title: 'Please provide review notes for rejection', 
        type: 'error' 
      });
      return;
    }

    try {
      const updatedDoc = await documentService.reviewDocument(documentId, {
        status,
        reviewNotes: reviewNotes || undefined,
      });
      
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId ? updatedDoc : doc
      ));
      
      showToast({ title: `Document ${status} successfully`, type: 'success' });
      setReviewingId(null);
      setReviewNotes('');
      
      if (onDocumentReview) {
        onDocumentReview(documentId, status, reviewNotes);
      }
    } catch (err: any) {
      console.error('Review error:', err);
      showToast({ 
        title: err.response?.data?.message || 'Failed to review document', 
        type: 'error' 
      });
    }
  };

  const getDocumentTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      business_license: 'Business License',
      property_photos: 'Property Photos',
      owner_id: 'Owner ID',
      tax_certificate: 'Tax Certificate',
      other: 'Other',
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'rejected':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return (
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    
    if (ext === 'pdf') {
      return (
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    
    return (
      <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-red-800">{error}</p>
        </div>
        <button
          onClick={loadDocuments}
          className="mt-3 text-sm text-red-700 hover:text-red-800 font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-gray-600 font-medium">No documents uploaded</p>
        <p className="text-sm text-gray-500 mt-1">
          Upload documents to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
        <span className="text-sm text-gray-600">
          {documents.length} document{documents.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {documents.map(doc => (
          <div
            key={doc.id}
            className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <div className="p-4">
              <div className="flex items-start space-x-3">
                {/* File Icon */}
                <div className="flex-shrink-0">
                  {getFileIcon(doc.fileName)}
                </div>

                {/* Document Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">
                        {getDocumentTypeLabel(doc.documentType)}
                      </h4>
                      <p className="text-xs text-gray-600 truncate">{doc.fileName}</p>
                    </div>
                    <div className={`ml-2 px-2 py-1 text-xs font-medium rounded-full flex items-center space-x-1 ${getStatusColor(doc.status)}`}>
                      {getStatusIcon(doc.status)}
                      <span>{doc.status.replace('_', ' ')}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span>{formatFileSize(doc.fileSize)}</span>
                    <span>{formatDate(doc.createdAt)}</span>
                  </div>

                  {doc.uploader && (
                    <p className="text-xs text-gray-600">
                      Uploaded by: <span className="font-medium">{doc.uploader.name}</span>
                    </p>
                  )}

                  {doc.reviewNotes && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                      <span className="font-medium">Review Notes:</span> {doc.reviewNotes}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              {showActions && (
                <div className="mt-3 flex items-center space-x-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => onDocumentClick && onDocumentClick(doc)}
                    className="flex-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                  >
                    View
                  </button>
                  <a
                    href={doc.fileUrl}
                    download
                    className="flex-1 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium text-center"
                  >
                    Download
                  </a>
                  {showReviewActions && doc.status === 'pending_review' && (
                    <>
                      <button
                        onClick={() => setReviewingId(doc.id)}
                        className="flex-1 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors font-medium"
                      >
                        Review
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingId === doc.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Review Modal */}
      {reviewingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Review Document</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Notes (required for rejection)
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="Enter review notes..."
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => handleReview(reviewingId, 'approved')}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReview(reviewingId, 'rejected')}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Reject
                </button>
                <button
                  onClick={() => {
                    setReviewingId(null);
                    setReviewNotes('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
