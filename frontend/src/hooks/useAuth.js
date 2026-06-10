export const useAuth = () => {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  const role  = localStorage.getItem('userRole')  || sessionStorage.getItem('userRole');
  return {
    isAuthenticated: !!token,
    isAdmin: role === 'admin',
  };
};
