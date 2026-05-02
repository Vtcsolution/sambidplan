
import React, { useState, useEffect } from 'react';
import { Mail, Phone, CheckCircle, Send, MessageSquare, Brain, X, Clock, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ReplyForm = () => {
  // Main States
  const [contacts, setContacts] = useState([]);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(5); // Initial limit of 5 contacts

  // Reply Form States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({ replyMessage: '', aiService: '' });

  // AI Services
  const aiServices = [
    { value: 'ai-websites', label: '🤖 AI & Custom Websites' },
    { value: 'ai-apps', label: '📱 AI & Custom Apps' },
    { value: 'ai-software', label: '💻 AI & Custom Software' },
    { value: 'ai-saas', label: '☁️ AI & Custom SaaS Platform' }
  ];

  // Fetch all contacts
  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/api/contact/all`);
      const { data } = await response.json();
      setContacts(data);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openReplyModal = (contact) => {
    setSelectedContact(contact);
    setFormData({ replyMessage: '', aiService: '' });
    setShowReplyModal(true);
  };

  // REPLY FORM SUBMIT
  const handleReplySubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/api/contact/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: selectedContact._id, ...formData }),
      });

      if (response.ok) {
        setIsSuccess(true);
        setTimeout(() => {
          setShowReplyModal(false);
          fetchContacts(); // Refresh list
          setIsSuccess(false);
        }, 1500);
      }
    } catch (error) {
      alert('Failed to send reply!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load more contacts
  const loadMore = () => {
    setLimit(prevLimit => prevLimit + 5);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#6EE7B7] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 p-6">
      {/* HEADER */}
     <br></br>
     <br></br>

      {/* CONTACTS TABLE */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="max-w-7xl mx-auto"
      >
        <div className="bg-gray-800/50 rounded-3xl overflow-hidden">
          {contacts.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400">No messages yet</h3>
              <p className="text-gray-500">Submit a contact form to see it here!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="p-4 text-left">Customer</th>
                    <th className="p-4 text-left">Service</th>
                    <th className="p-4 text-left">Message Preview</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Date</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.slice(0, limit).map((contact) => (
                    <motion.tr 
                      key={contact._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border-b border-gray-700 hover:bg-gray-700/30"
                    >
                      <td className="p-4">
                        <div>
                          <div className="font-semibold text-white">{contact.fullName}</div>
                          <a href={`mailto:${contact.email}`} className="text-[#6EE7B7] text-sm hover:underline">
                            {contact.email}
                          </a>
                          <div className="text-sm text-gray-400">{contact.phone}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="bg-[#6EE7B7]/20 text-[#6EE7B7] px-3 py-1 rounded-full text-sm font-medium">
                          {contact.services}
                        </span>
                      </td>
                      <td className="p-4 max-w-xs">
                        <p className="text-sm text-gray-300 line-clamp-2">{contact.message}</p>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          contact.status === 'new' 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                            : 'bg-green-500/20 text-green-400 border border-green-500/30'
                        }`}>
                          {contact.status === 'new' ? '🆕 New' : '✅ Replied'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-gray-400">
                          {new Date(contact.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => openReplyModal(contact)}
                          disabled={contact.status === 'replied'}
                          className={`px-4 py-2 rounded-xl font-semibold flex items-center space-x-2 mx-auto transition-all ${
                            contact.status === 'replied'
                              ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                              : 'bg-[#6EE7B7] text-gray-900 hover:bg-[#34D399] hover:scale-105'
                          }`}
                        >
                          <Send className="w-4 h-4" />
                          <span>{contact.status === 'replied' ? 'Replied' : 'Reply'}</span>
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {limit < contacts.length && (
                <div className="text-center py-6">
                  <button
                    onClick={loadMore}
                    className="bg-[#6EE7B7] text-gray-900 px-6 py-2 rounded-xl font-semibold hover:bg-[#34D399] transition-colors"
                  >
                    Load More
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* REPLY MODAL - ALL IN ONE PLACE */}
      <AnimatePresence>
        {showReplyModal && selectedContact && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 50 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 50 }}
              className="w-full max-w-2xl bg-gray-900 rounded-3xl border border-gray-700 overflow-hidden max-h-[90vh]"
            >
              {/* MODAL HEADER */}
              <div className="bg-gray-800 p-6 border-b border-gray-700 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-[#6EE7B7] rounded-full flex items-center justify-center">
                    <Send className="w-6 h-6 text-gray-900" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Reply to {selectedContact.fullName}</h2>
                    <p className="text-[#6EE7B7] text-sm">{selectedContact.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowReplyModal(false)} 
                  className="p-2 rounded-xl hover:bg-gray-700 transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                {/* CUSTOMER INFO CARD */}
                <div className="bg-gray-800/50 p-4 rounded-xl">
                  <h3 className="font-semibold mb-3 flex items-center space-x-2 text-gray-300">
                    <Mail className="w-5 h-5" />
                    <span>Customer Details</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong className="text-gray-300">Service:</strong> <span className="text-[#6EE7B7]">{selectedContact.services}</span></div>
                    <div><strong className="text-gray-300">Phone:</strong> {selectedContact.phone}</div>
                    <div><strong className="text-gray-300">Company:</strong> {selectedContact.company || 'N/A'}</div>
                    <div><strong className="text-gray-300">Date:</strong> {new Date(selectedContact.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>

                {/* ORIGINAL MESSAGE */}
                <div className="bg-gray-800/50 p-4 rounded-xl">
                  <h3 className="font-semibold mb-3 flex items-center space-x-2 text-gray-300">
                    <MessageSquare className="w-5 h-5" />
                    <span>Original Message</span>
                  </h3>
                  <p className="text-gray-300 whitespace-pre-wrap bg-gray-900 p-3 rounded-lg">
                    {selectedContact.message}
                  </p>
                </div>

                {/* REPLY FORM */}
                <form onSubmit={handleReplySubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Your Reply *</label>
                    <textarea
                      value={formData.replyMessage}
                      onChange={(e) => setFormData(prev => ({ ...prev, replyMessage: e.target.value }))}
                      rows="4"
                      className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-[#6EE7B7] focus:border-transparent text-gray-100 resize-none"
                      placeholder="Hi John, thanks for reaching out! Based on your requirements for web development, I recommend our AI & Custom Websites solution..."
                      required
                    />
                  </div>

                 

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 px-6 rounded-xl font-bold text-lg text-gray-900 transition-all duration-300 flex items-center justify-center space-x-3 shadow-xl disabled:opacity-50"
                    style={{ 
                      background: isSuccess ? '#10B981' : 'linear-gradient(135deg, #6EE7B7 0%, #34D399 50%, #10B981 100%)'
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-6 h-6 border-3 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
                        <span>Sending Reply...</span>
                      </>
                    ) : isSuccess ? (
                      <>
                        <CheckCircle className="w-6 h-6 animate-bounce" />
                        <span>Reply Sent Successfully!</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>SEND REPLY</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReplyForm;
