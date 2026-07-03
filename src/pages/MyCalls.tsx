import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MyCalls() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/calls', { replace: true });
  }, [navigate]);
  
  return null;
}