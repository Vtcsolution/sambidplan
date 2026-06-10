// frontend/src/pages/admin/AdminInvoices.jsx
import { useState, useEffect } from 'react';
import PermissionGuard from '../../components/admin/PermissionGuard';
import { 
  Eye, 
  Search, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { adminPanelAPI as adminAPI } from '../../services/adminApi';
import Card from '../../components/Card';

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [pageSize, setPageSize] = useState(10);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, pagination.page, pageSize]);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminAPI.getInvoices({
        status: statusFilter,
        page: pagination.page,
        limit: pageSize
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
        notes: statusNote
      });
      
      if (response.data.success) {
        alert(`✅ Invoice status updated to ${newStatus}`);
        fetchInvoices();
        setShowStatusModal(false);
        setSelectedInvoice(null);
        setNewStatus('');
        setStatusNote('');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error.response?.data?.message || 'Failed to update invoice status');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      paid: { icon: CheckCircle, text: 'Paid', color: 'bg-green-100 text-green-700' },
      pending: { icon: Clock, text: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
      expired: { icon: XCircle, text: 'Expired', color: 'bg-red-100 text-red-700' },
      cancelled: { icon: XCircle, text: 'Cancelled', color: 'bg-gray-100 text-gray-700' },
      refunded: { icon: CheckCircle, text: 'Refunded', color: 'bg-blue-100 text-blue-700' }
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <badge.icon className="w-3 h-3" />
        {badge.text}
      </span>
    );
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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Invoices</h1>
            <p className="text-gray-600 text-sm">Manage and track all invoices</p>
          </div>
          <button
            onClick={fetchInvoices}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg shrink-0 self-start sm:self-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
     

      
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-500">Total Invoices</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-500">Paid</p>
          <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold text-indigo-600">${stats.totalAmount.toLocaleString()}</p>
        </div>
      </div>

      {/* Search and Filter */}
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
        </div>
      </div>

      {/* Invoices Table */}
      <Card>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Billing</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">{invoice.invoiceNumber}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{invoice.user?.name || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{invoice.user?.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm capitalize font-medium ${
                        invoice.plan === 'pro' ? 'text-purple-600' : 
                        invoice.plan === 'starter' ? 'text-blue-600' : 
                        'text-amber-600'
                      }`}>
                        {invoice.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">${invoice.amount}</td>
                    <td className="px-4 py-3 text-sm capitalize">{invoice.billingCycle}</td>
                    <td className="px-4 py-3">{getStatusBadge(invoice.status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setNewStatus(invoice.status);
                          setShowStatusModal(true);
                        }}
                        className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="Update Status"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination + Rows per page */}
      {pagination.total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPagination(p => ({ ...p, page: 1 })); }}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500"
            >
              {[10, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-gray-400 hidden sm:inline">
              Showing {Math.min((pagination.page - 1) * pageSize + 1, pagination.total)}–{Math.min(pagination.page * pageSize, pagination.total)} of {pagination.total}
            </span>
          </div>
          {pagination.pages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page === 1}
                className="p-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
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
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
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
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center"
              >
                {processingId === selectedInvoice._id ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  'Update Status'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
     </div>
  );
}