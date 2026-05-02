// frontend/src/components/admin/ActivityFeed.jsx
import { useState, useEffect } from 'react';
import { 
  UserPlus, 
  CreditCard, 
  Users, 
  Bell,
  Clock,
  RefreshCw
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import Card from '../../components/Card';

export default function ActivityFeed() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
    // Refresh every 30 seconds
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await adminAPI.getRecentActivity();
      if (response.data.success) {
        setActivities(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch(type) {
      case 'user_signup':
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'payment':
        return <CreditCard className="w-4 h-4 text-blue-500" />;
      case 'plan_request':
        return <Users className="w-4 h-4 text-yellow-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityColor = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-50 border-l-4 border-l-red-500';
      case 'medium': return 'bg-yellow-50 border-l-4 border-l-yellow-500';
      default: return 'bg-white';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        <button
          onClick={fetchActivities}
          className="p-1 text-gray-400 hover:text-gray-600"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      
      <div className="space-y-3">
        {activities.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No recent activity</p>
        ) : (
          activities.slice(0, 10).map((activity, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg ${getActivityColor(activity.priority)}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                  <p className="text-xs text-gray-500">{activity.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">
                      {new Date(activity.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}