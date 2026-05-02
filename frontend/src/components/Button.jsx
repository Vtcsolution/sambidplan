export default function Button({ children, variant = 'primary', onClick, className = '', disabled = false }) {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    outline: 'border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}