import React from 'react';

const StatusIndicator = ({ isActive, label }) => {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
      <span className="text-sm text-gray-300">{label}</span>
    </div>
  );
};

export default StatusIndicator;
