import { useNavigate } from 'react-router-dom';
import Button from './Button';

export default function OpportunityCard({ opportunity }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{opportunity.title}</h3>
          <p className="text-gray-600 text-sm mb-2">{opportunity.agency}</p>
          <div className="flex space-x-4 text-sm">
            <span className="text-green-600 font-medium">{opportunity.budget}</span>
            <span className="text-gray-500">Deadline: {opportunity.deadline}</span>
          </div>
          {opportunity.matchScore && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                Match Score: {opportunity.matchScore}%
              </span>
            </div>
          )}
        </div>
        <Button variant="outline" onClick={() => navigate(`/opportunity/${opportunity.id}`)}>
          View Details
        </Button>
      </div>
    </div>
  );
}