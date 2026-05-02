export default function AlertBadge({ type }) {
  const badges = {
    new: 'bg-green-100 text-green-800',
    deadline: 'bg-red-100 text-red-800',
    match: 'bg-blue-100 text-blue-800',
  };

  const labels = {
    new: 'New',
    deadline: 'Deadline Approaching',
    match: 'High Match',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[type]}`}>
      {labels[type]}
    </span>
  );
}