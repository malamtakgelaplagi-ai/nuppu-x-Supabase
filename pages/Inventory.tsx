
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const Inventory: React.FC = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to Master Data because functionality has been moved
    navigate('/master');
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen text-slate-400 font-bold uppercase tracking-widest">
      Redirecting to Master Data...
    </div>
  );
};
