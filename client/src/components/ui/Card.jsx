import React from 'react';

export const Card = ({ children, className = '', hover = false, ...props }) => {
  return (
    <div
      className={`glass-panel rounded-2xl p-6 shadow-xl ${
        hover ? 'glass-panel-hover cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
