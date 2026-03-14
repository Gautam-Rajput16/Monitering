import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useSocket } from '../hooks/useSocket';
import { apiService } from '../services/apiService';
import { logger } from '../utils/logger';

// Make sure to securely load this in production
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

const LocationMonitor = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef({});
  const [usersInfo, setUsersInfo] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);

  // Use our custom socket hook to listen for 'location-update' emitted by the backend
  useSocket({
    'location-update': (data) => {
      // Data expected structure: { userId, latitude, longitude, timestamp }
      updateUserLocation(data.userId, data.latitude, data.longitude, data.timestamp);
    },
    'user-disconnected': (data) => {
      // Cleanup marker if user fully disconnects (optional based on requirements)
      removeUserMarker(data.userId);
    }
  });

  useEffect(() => {
    // Initialize map only once
    if (map.current) return;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11', // Matches dashboard aesthetic
      center: [-98.5795, 39.8283], // Default center (US)
      zoom: 3
    });

    // Add navigation controls (zoom in/out)
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Fetch initial active locations (Assumed endpoint handled in API Service)
    fetchInitialLocations();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  const fetchInitialLocations = async () => {
    try {
      const users = await apiService.getUsers(); 
      // Iterate over active users and fetch their last known location
      // Simplified for demo: assume getUsers returns { id, name, location: { latitude, longitude } }
      if (Array.isArray(users)) {
         users.forEach(u => {
           if (u.location) {
             updateUserLocation(u.id, u.location.latitude, u.location.longitude, Date.now());
             setUsersInfo(prev => ({ ...prev, [u.id]: u }));
           }
         });
      }
    } catch (err) {
      logger.error('Failed to fetch initial locations', err);
    }
  };

  const removeUserMarker = (userId) => {
    if (markersRef.current[userId]) {
      markersRef.current[userId].remove();
      delete markersRef.current[userId];
    }
  };

  const updateUserLocation = (userId, lat, lng, timestamp) => {
    if (!map.current) return;

    if (markersRef.current[userId]) {
      // Marker exists, smoothly animate to new location
      markersRef.current[userId].setLngLat([lng, lat]);
    } else {
      // Create a custom HTML element for the marker to fit our dark UI
      const el = document.createElement('div');
      el.className = 'w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(59,130,246,0.8)] cursor-pointer transition-transform hover:scale-125';
      
      el.addEventListener('click', () => {
        handleMarkerClick(userId);
      });

      // Create new marker
      markersRef.current[userId] = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map.current);
    }
  };

  const handleMarkerClick = async (userId) => {
    try {
      // Fetch user details when a marker is clicked
      const userDetails = await apiService.getUserDetails(userId);
      setSelectedUser(userDetails || { id: userId, name: `User ${userId}`, status: 'Active' });
      
      // Pan camera smoothly to user
      const marker = markersRef.current[userId];
      if (marker) {
        map.current.flyTo({
          center: marker.getLngLat(),
          zoom: 14,
          essential: true
        });
      }
    } catch (err) {
      // Fallback
      setSelectedUser({ id: userId, name: `User ${userId}`, status: 'Active' });
    }
  };

  return (
    <div className="p-6 h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Live Location Monitor</h1>
        <div className="bg-gray-800 px-4 py-2 rounded-lg text-sm text-gray-300 border border-gray-700">
          <span className="w-2 h-2 inline-block bg-blue-500 rounded-full mr-2 animate-pulse"></span>
          {Object.keys(markersRef.current).length} Active Trackers
        </div>
      </div>
      
      <div className="flex-1 rounded-xl border border-gray-700 overflow-hidden relative flex">
        {/* Map Container */}
        <div ref={mapContainer} className="w-full h-full bg-gray-900" />
        
        {/* User Detail Overlay panel */}
        {selectedUser && (
          <div className="absolute top-4 left-4 w-72 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-5 shadow-2xl z-10">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-white">{selectedUser.name || 'Unknown User'}</h3>
              <button 
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between border-b border-gray-800 pb-2 bg-transparent">
                <span className="text-gray-400 text-sm">Status</span>
                <span className="text-green-400 text-sm font-medium">Tracking Active</span>
              </div>
              <div className="flex justify-between border-b border-gray-800 pb-2">
                <span className="text-gray-400 text-sm">Device ID</span>
                <span className="text-gray-200 text-sm font-mono">{selectedUser.id}</span>
              </div>
              
              <div className="pt-2 flex gap-2">
                <button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm py-2 rounded transition-colors">
                  View Streams
                </button>
                <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 rounded transition-colors">
                  History
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationMonitor;
