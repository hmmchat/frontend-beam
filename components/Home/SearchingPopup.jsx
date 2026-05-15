'use client';

import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { IoVideocamOutline, IoSearchOutline, IoSparklesOutline } from 'react-icons/io5';

/**
 * SearchingPopup Component
 * Highlights: Premium UI, Pulsing animation, Yellow Highlights
 */
const SearchingPopup = ({ 
  isVisible, 
  onCancel 
}) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div >
     
    </div>
  );
};

export default SearchingPopup;
