import { useState } from 'react';

export const useNotification = () => {
  const [notification, setNotification] = useState({ message: '', type: 'success' });

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  const hideNotification = () => {
    setNotification({ message: '', type: 'success' });
  };

  return {
    notification,
    showNotification,
    hideNotification
  };
};

export default useNotification;
