import React, { memo } from 'react';

const UserCard = memo(({ user }) => {
  const displayName = user?.name || user?.email || 'Unknown User';
  const displayId = user?.userId || user?.id || 'No ID';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition-colors cursor-pointer">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 font-medium">
          {avatarLetter}
        </div>
        <div>
          <h3 className="font-medium text-gray-200">{displayName}</h3>
          <p className="text-sm text-gray-400 font-mono">{displayId}</p>
        </div>
      </div>
    </div>
  );
});

export default UserCard;
