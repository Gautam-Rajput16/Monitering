import React, { memo } from 'react';

const UserCard = memo(({ user }) => {
  const displayName = user?.name || user?.email || 'Unknown User';
  const displayId = user?.userId || user?.id || 'No ID';
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const isOnline = user?.status === 'online';

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border transition-all duration-300 cursor-pointer ${
      isOnline 
        ? 'border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]' 
        : 'border-gray-700 hover:border-blue-500'
    }`}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 font-medium border border-gray-600">
            {avatarLetter}
          </div>
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
          )}
        </div>
        <div className="min-w-0">
          <h3 className={`font-medium truncate ${isOnline ? 'text-green-400' : 'text-gray-200'}`}>
            {displayName}
          </h3>
          <p className="text-sm text-gray-400 font-mono truncate">{displayId}</p>
        </div>
      </div>
    </div>
  );
});

export default UserCard;
