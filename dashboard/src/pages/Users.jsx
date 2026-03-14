import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../services/apiService';
import UserCard from '../components/UserCard';
import { logger } from '../utils/logger';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getUsers();
      if (Array.isArray(data)) setUsers(data);
    } catch (err) {
      logger.error('Failed fetching users', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Memoize filtered results to prevent expensive re-renders on typing
  const filteredUsers = useMemo(() => {
    if (!search) return users;
    return users.filter(user => 
      user.name?.toLowerCase().includes(search.toLowerCase()) || 
      user.id?.toString().includes(search)
    );
  }, [users, search]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
         <h1 className="text-2xl font-bold text-gray-100">User Management</h1>
         <button onClick={fetchUsers} className="p-2 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700">🔄</button>
      </div>
      
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search users by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {isLoading ? (
           <div className="text-center py-10 text-gray-500">Loading users...</div>
        ) : filteredUsers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredUsers.map(user => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">No users found.</div>
        )}
      </div>
    </div>
  );
};

export default Users;
