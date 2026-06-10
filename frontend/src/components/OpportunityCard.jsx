import { useNavigate } from 'react-router-dom';

export default function OpportunityCard({ opportunity }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 break-words line-clamp-2">
            {opportunity.title}
          </h3>
          <p className="text-gray-500 text-sm mb-2 truncate">{opportunity.agency}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {opportunity.budget && (
              <span className="text-green-600 font-medium">{opportunity.budget}</span>
            )}
            {opportunity.deadline && (
              <span className="text-gray-500">Deadline: {opportunity.deadline}</span>
            )}
          </div>
          {opportunity.matchScore && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                Match Score: {opportunity.matchScore}%
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => navigate(`/opportunity/${opportunity.id}`)}
          className="self-start shrink-0 text-sm font-medium text-indigo-600 border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
        >
          View Details
        </button>
      </div>
    </div>
  );
}
