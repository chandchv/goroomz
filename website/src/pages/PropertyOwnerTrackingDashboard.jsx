import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { 
  Search,
  Loader2, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  MessageSquare,
  Calendar,
  MapPin,
  User,
  Phone,
  Mail,
  Building,
  RefreshCw,
  FileText,
  TrendingUp,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import leadService from '@/services/leadService';

const PropertyOwnerTrackingDashboard = () => {
  // State management
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [trackingReference, setTrackingReference] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Load leads data
  useEffect(() => {
    // Try to get owner email from localStorage or auth context
    const userEmail = localStorage.getItem('userEmail') || '';
    if (userEmail) {
      setOwnerEmail(userEmail);
      loadOwnerLeads(userEmail);
    }
  }, []);

  const loadOwnerLeads = async (email) => {
    if (!email) return;
    
    try {
      setIsLoading(true);
      const response = await leadService.getPropertyOwnerLeads(email);
      
      if (response.success) {
        setLeads(response.data.leads || []);
        setLastUpdated(new Date());
      } else {
        toast({
          title: "Error Loading Leads",
          description: "Failed to load your property submissions.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading leads:', error);
      toast({
        title: "Error Loading Leads",
        description: error.message || "Failed to load your property submissions.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const searchByTrackingReference = async () => {
    if (!trackingReference.trim()) {
      toast({
        title: "Tracking Reference Required",
        description: "Please enter a tracking reference to search.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await leadService.getLeadStatus(trackingReference.trim());
      
      if (response.success && response.data.leads.length > 0) {
        setLeads(response.data.leads);
        setLastUpdated(new Date());
        toast({
          title: "Lead Found",
          description: "Successfully found your property submission.",
        });
      } else {
        toast({
          title: "Lead Not Found",
          description: "No property submission found with this tracking reference.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error searching lead:', error);
      toast({
        title: "Search Failed",
        description: error.message || "Failed to search for your property submission.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshLeads = () => {
    if (ownerEmail) {
      loadOwnerLeads(ownerEmail);
    }
  };

  // Filter leads based on search and status
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchQuery || 
      lead.propertyOwnerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.address?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Get status color and icon
  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending':
        return { 
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
          icon: Clock,
          label: 'Under Review'
        };
      case 'assigned':
        return { 
          color: 'bg-blue-100 text-blue-800 border-blue-200', 
          icon: User,
          label: 'Assigned to Agent'
        };
      case 'approved':
        return { 
          color: 'bg-green-100 text-green-800 border-green-200', 
          icon: CheckCircle,
          label: 'Approved'
        };
      case 'rejected':
        return { 
          color: 'bg-red-100 text-red-800 border-red-200', 
          icon: XCircle,
          label: 'Rejected'
        };
      case 'in_review':
        return { 
          color: 'bg-purple-100 text-purple-800 border-purple-200', 
          icon: Eye,
          label: 'In Review'
        };
      case 'requires_info':
        return { 
          color: 'bg-orange-100 text-orange-800 border-orange-200', 
          icon: AlertCircle,
          label: 'Info Required'
        };
      default:
        return { 
          color: 'bg-gray-100 text-gray-800 border-gray-200', 
          icon: Clock,
          label: status || 'Unknown'
        };
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Helmet>
        <title>Property Submission Tracking - GoRoomz</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Property Submission Tracking
          </h1>
          <p className="text-muted-foreground">Track the status of your property listing submissions</p>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: {formatDate(lastUpdated)}
            </p>
          )}
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border mb-8">
          <h2 className="text-xl font-bold mb-4">Search Your Submissions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Search by Tracking Reference */}
            <div>
              <label className="block text-sm font-medium mb-2">Search by Tracking Reference</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter tracking reference (e.g., ABC12345)"
                  value={trackingReference}
                  onChange={(e) => setTrackingReference(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={searchByTrackingReference}
                  disabled={isLoading}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Search by Email */}
            <div>
              <label className="block text-sm font-medium mb-2">Search by Email Address</label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={() => loadOwnerLeads(ownerEmail)}
                  disabled={isLoading || !ownerEmail}
                  variant="outline"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>💡 <strong>Tip:</strong> Use your tracking reference for quick access, or enter your email to see all your submissions.</p>
          </div>
        </div>

        {/* Filters and Actions */}
        {leads.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search submissions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full md:w-64"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Under Review</option>
                  <option value="assigned">Assigned to Agent</option>
                  <option value="in_review">In Review</option>
                  <option value="requires_info">Info Required</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              
              <Button 
                onClick={refreshLeads}
                disabled={isLoading}
                variant="outline"
                className="border-purple-200 hover:bg-purple-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        )}

        {/* Leads List */}
        <div className="space-y-6">
          <AnimatePresence>
            {filteredLeads.map((lead, index) => {
              const statusInfo = getStatusInfo(lead.status);
              const StatusIcon = statusInfo.icon;
              
              return (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Lead Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold mb-1">
                            {lead.propertyDetails?.title || `${lead.propertyType} Property`}
                          </h3>
                          <p className="text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {lead.address}, {lead.city}, {lead.state}
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium border ${statusInfo.color} flex items-center gap-1`}>
                          <StatusIcon className="w-4 h-4" />
                          {statusInfo.label}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Tracking Reference</p>
                          <p className="font-mono font-semibold">{lead.id.substring(0, 8).toUpperCase()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Submitted</p>
                          <p className="font-semibold">{formatDate(lead.submissionDate)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Property Type</p>
                          <p className="font-semibold capitalize">{lead.propertyType}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Estimated Rooms</p>
                          <p className="font-semibold">{lead.estimatedRooms}</p>
                        </div>
                        {lead.territory && (
                          <div>
                            <p className="text-sm text-muted-foreground">Territory</p>
                            <p className="font-semibold">{lead.territory.name}</p>
                          </div>
                        )}
                        {lead.agent && (
                          <div>
                            <p className="text-sm text-muted-foreground">Assigned Agent</p>
                            <p className="font-semibold">{lead.agent.name}</p>
                          </div>
                        )}
                      </div>

                      {/* Contact Information */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Contact Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span>{lead.propertyOwnerName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            <span>{lead.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            <span>{lead.phone}</span>
                          </div>
                        </div>
                        {lead.businessName && (
                          <div className="mt-2 flex items-center gap-2 text-sm">
                            <Building className="w-3 h-3 text-muted-foreground" />
                            <span>{lead.businessName}</span>
                          </div>
                        )}
                      </div>

                      {/* Timeline */}
                      <div className="border-t pt-4">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Activity className="w-4 h-4" />
                          Status Timeline
                        </h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-muted-foreground">Submitted:</span>
                            <span>{formatDate(lead.submissionDate)}</span>
                          </div>
                          {lead.lastContactDate && (
                            <div className="flex items-center gap-3 text-sm">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-muted-foreground">Last Contact:</span>
                              <span>{formatDate(lead.lastContactDate)}</span>
                            </div>
                          )}
                          {lead.approvalDate && (
                            <div className="flex items-center gap-3 text-sm">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              <span className="text-muted-foreground">
                                {lead.status === 'approved' ? 'Approved:' : 'Decision:'}
                              </span>
                              <span>{formatDate(lead.approvalDate)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Additional Notes */}
                      {lead.notes && (
                        <div className="border-t pt-4 mt-4">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Additional Information
                          </h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>
                        </div>
                      )}

                      {/* Rejection Reason */}
                      {lead.status === 'rejected' && lead.rejectionReason && (
                        <div className="border-t pt-4 mt-4">
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <h4 className="font-semibold mb-2 text-red-800 flex items-center gap-2">
                              <XCircle className="w-4 h-4" />
                              Rejection Reason
                            </h4>
                            <p className="text-sm text-red-700">{lead.rejectionReason}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="lg:w-64">
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <h4 className="font-semibold mb-3 text-purple-800">Next Steps</h4>
                        
                        {lead.status === 'pending' && (
                          <div className="space-y-2 text-sm text-purple-700">
                            <p>• Your submission is under review</p>
                            <p>• Expected response: 3-5 business days</p>
                            <p>• You'll be contacted if more info is needed</p>
                          </div>
                        )}
                        
                        {lead.status === 'assigned' && (
                          <div className="space-y-2 text-sm text-purple-700">
                            <p>• An agent has been assigned to your property</p>
                            <p>• They will contact you within 24 hours</p>
                            <p>• Prepare any additional documents they might need</p>
                          </div>
                        )}
                        
                        {lead.status === 'requires_info' && (
                          <div className="space-y-2 text-sm text-purple-700">
                            <p>• Additional information is required</p>
                            <p>• Check your email for specific requirements</p>
                            <p>• Contact our support team if you need help</p>
                          </div>
                        )}
                        
                        {lead.status === 'approved' && (
                          <div className="space-y-2 text-sm text-green-700">
                            <p>• Congratulations! Your property is approved</p>
                            <p>• You'll receive onboarding instructions soon</p>
                            <p>• Your property will be live within 24 hours</p>
                          </div>
                        )}
                        
                        {lead.status === 'rejected' && (
                          <div className="space-y-2 text-sm text-red-700">
                            <p>• Your submission was not approved</p>
                            <p>• Review the rejection reason above</p>
                            <p>• You can submit a new application</p>
                          </div>
                        )}

                        <div className="mt-4 pt-3 border-t border-purple-200">
                          <p className="text-xs text-purple-600 mb-2">Need help?</p>
                          <div className="space-y-1">
                            <a href="mailto:support@goroomz.com" className="text-xs text-purple-600 hover:underline block">
                              📧 support@goroomz.com
                            </a>
                            <a href="tel:+911234567890" className="text-xs text-purple-600 hover:underline block">
                              📞 +91 123 456 7890
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Empty State */}
          {!isLoading && filteredLeads.length === 0 && leads.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Submissions Found</h3>
              <p className="text-muted-foreground mb-6">
                {ownerEmail || trackingReference 
                  ? "No property submissions found. Try a different search or check your tracking reference."
                  : "Enter your email address or tracking reference to view your property submissions."}
              </p>
              <Button 
                onClick={() => window.location.href = '/'}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Submit New Property
              </Button>
            </div>
          )}

          {/* No Results After Filter */}
          {!isLoading && filteredLeads.length === 0 && leads.length > 0 && (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Results Found</h3>
              <p className="text-muted-foreground mb-6">
                No submissions match your current search criteria. Try adjusting your filters.
              </p>
              <Button 
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                variant="outline"
              >
                Clear Filters
              </Button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your submissions...</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PropertyOwnerTrackingDashboard;