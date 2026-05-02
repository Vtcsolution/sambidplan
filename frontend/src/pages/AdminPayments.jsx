// frontend/src/pages/AdminPayments.jsx
import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  RefreshCw, 
  DollarSign,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { adminAPI } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';

export default function AdminPayments() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [processingId, setProcessingId] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, [pagination.page, statusFilter]);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminAPI.getInvoices({
        status: statusFilter,
        page: pagination.page,
        limit: 20
      });
      if (response.data.success) {
        setInvoices(response.data.data);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.total || response.data.data.length,
          pages: response.data.pagination?.pages || 1
        }));
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setError(error.response?.data?.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedInvoice || !newStatus) return;
    
    setProcessingId(selectedInvoice._id);
    try {
      const response = await adminAPI.updateInvoiceStatus(selectedInvoice._id, {
        status: newStatus,
        notes: adminNotes
      });
      
      if (response.data.success) {
        alert(`Invoice status updated to ${newStatus}`);
        fetchInvoices();
        setShowStatusModal(false);
        setSelectedInvoice(null);
        setNewStatus('');
        setAdminNotes('');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error.response?.data?.message || 'Failed to update invoice status');
    } finally {
      setProcessingId(null);
    }
  };

  const handleVerifyPayment = async (invoiceId) => {
    setProcessingId(invoiceId);
    try {
      const response = await adminAPI.updateInvoiceStatus(invoiceId, {
        status: 'paid',
        notes: 'Payment verified by admin'
      });
      if (response.data.success) {
        alert('Payment verified! User plan upgraded.');
        fetchInvoices();
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      alert('Failed to verify payment');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'paid':
        return { icon: CheckCircle, text: 'Paid', color: 'bg-green-100 text-green-700' };
      case 'pending':
        return { icon: Clock, text: 'Pending', color: 'bg-yellow-100 text-yellow-700' };
      case 'expired':
        return { icon: XCircle, text: 'Expired', color: 'bg-red-100 text-red-700' };
      case 'cancelled':
        return { icon: XCircle, text: 'Cancelled', color: 'bg-gray-100 text-gray-700' };
      case 'refunded':
        return { icon: CheckCircle, text: 'Refunded', color: 'bg-blue-100 text-blue-700' };
      default:
        return { icon: Clock, text: status, color: 'bg-gray-100 text-gray-700' };
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: invoices.length,
    paid: invoices.filter(i => i.status === 'paid').length,
    pending: invoices.filter(i => i.status === 'pending').length,
    totalAmount: invoices.reduce((sum, i) => sum + (i.amount || 0), 0)
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-gray-600 mt-1">Review and manage all payment invoices</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-700 font-medium">Error loading invoices</p>
              <p className="text-red-600 text-sm">{error}</p>
              <button 
                onClick={fetchInvoices}
                className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Try Again →
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <DollarSign className="w-8 h-8 text-indigo-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Pending Payment</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Revenue</p>
                <p className="text-2xl font-bold text-indigo-600">${stats.totalAmount.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-indigo-500" />
            </div>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by invoice #, user email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'pending', 'paid', 'expired', 'cancelled'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === status 
                      ? status === 'pending' ? 'bg-yellow-500 text-white'
                        : status === 'paid' ? 'bg-green-500 text-white'
                        : status === 'expired' ? 'bg-red-500 text-white'
                        : status === 'cancelled' ? 'bg-gray-500 text-white'
                        : 'bg-gray-700 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={fetchInvoices}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No invoices found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Billing</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredInvoices.map((invoice) => {
                    const StatusIcon = getStatusBadge(invoice.status).icon;
                    return (
                      <tr key={invoice._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-mono text-gray-900">{invoice.invoiceNumber}</td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{invoice.user?.name || 'N/A'}</p>
                            <p className="text-xs text-gray-500">{invoice.user?.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm capitalize font-medium ${
                            invoice.plan === 'pro' ? 'text-purple-600' : 
                            invoice.plan === 'starter' ? 'text-blue-600' : 
                            'text-amber-600'
                          }`}>
                            {invoice.plan}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold">${invoice.amount}</td>
                        <td className="px-6 py-4 text-sm capitalize">{invoice.billingCycle}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(invoice.status).color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {getStatusBadge(invoice.status).text}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(invoice.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {invoice.status === 'pending' && (
                              <button
                                onClick={() => handleVerifyPayment(invoice._id)}
                                disabled={processingId === invoice._id}
                                className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 flex items-center gap-1"
                              >
                                {processingId === invoice._id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-3 h-3" />
                                )}
                                Verify
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setNewStatus(invoice.status);
                                setShowStatusModal(true);
                              }}
                              className="px-3 py-1 text-indigo-600 border border-indigo-200 rounded-lg text-sm hover:bg-indigo-50"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1}
              className="p-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-4 py-2 text-gray-600">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
              disabled={pagination.page === pagination.pages}
              className="p-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Update Status Modal */}
        {showStatusModal && selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">Update Invoice Status</h2>
              <p className="text-gray-600 mb-4">
                Invoice: <span className="font-mono">{selectedInvoice.invoiceNumber}</span>
                <br />
                User: {selectedInvoice.user?.email}
                <br />
                Amount: ${selectedInvoice.amount}
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Add notes about this status change..."
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateStatus}
                  disabled={processingId === selectedInvoice._id}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {processingId === selectedInvoice._id ? (
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    'Update Status'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Instructions */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">📋 Admin Instructions</h3>
          <p className="text-sm text-blue-700">
            1. User requests upgrade → Invoice created with status "pending"<br />
            2. User pays via Payoneer → They email payment confirmation<br />
            3. Admin clicks "Verify Payment" → User plan upgraded automatically<br />
            4. Admin can also manually update invoice status from the Actions menu<br />
            5. User receives confirmation email after payment verification
          </p>
        </div>
      </div>
    </div>
  );
}