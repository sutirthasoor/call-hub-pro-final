import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MyLeads() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/leads', { replace: true });
  }, [navigate]);
  
  return null;
}