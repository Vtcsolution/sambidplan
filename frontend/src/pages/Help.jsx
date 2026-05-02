import { HelpCircle } from 'lucide-react';

export default function Help() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-indigo-600" />
          Help & Support
        </h1>
        <p className="text-gray-600 mt-1">Get help with your account</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-6">
        <p className="text-gray-500 text-center py-8">Help documentation coming soon.</p>
      </div>
    </div>
  );
}