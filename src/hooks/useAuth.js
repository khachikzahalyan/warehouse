import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

/** @returns {import('../contexts/AuthContext.js').AuthContextValue} */
export function useAuth() {
  return useContext(AuthContext);
}
