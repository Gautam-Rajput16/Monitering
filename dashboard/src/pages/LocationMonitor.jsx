import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSocket } from '../hooks/useSocket';
import { apiService } from '../services/apiService';
import { logger } from '../utils/logger';

const LocationMonitor = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef({});
  const [selectedUser, setSelectedUser] = useState(null);

  // Use our custom socket hook to listen for 'location-update' emitted by the backend
  useSocket({
    'location-update': (data) => {
      // Data expected structure: { userId, latitude, longitude, timestamp }
      updateUserLocation(data.userId, data.latitude, data.longitude, data.timestamp);
    },
    'user-disconnected': (data) => {
      removeUserMarker(data.userId);
    }
  });

  useEffect(() => {
    // Initialize map only once
    if (map.current) return;
    
    // Initialize Leaflet map
    map.current = L.map(mapContainer.current, {
      center: [20.5937, 78.9629], // Default center (India)
      zoom: 5,
      zoomControl: false
    });

    // Add OpenStreetMap tiles (Free)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map.current);

    // Add zoom control manually to top-right to match previous UI
    L.control.zoom({ position: 'topright' }).addTo(map.current);

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
      const data = await apiService.getUsers(); 
      // Handle paginated structure { users, total, page, pages }
      const users = data?.users || (Array.isArray(data) ? data : []);
      
      users.forEach(u => {
        if (u.location) {
          updateUserLocation(u.userId || u.id, u.location.latitude, u.location.longitude, Date.now());
        }
      });
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
      // Marker exists, update position
      markersRef.current[userId].setLatLng([lat, lng]);
    } else {
      // Create a custom DivIcon to match the previous premium look
      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(59,130,246,0.8)] cursor-pointer transition-transform hover:scale-125"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const marker = L.marker([lat, lng], { icon: customIcon })
        .addTo(map.current)
        .on('click', () => handleMarkerClick(userId));

      markersRef.current[userId] = marker;
    }
  };

  const handleMarkerClick = async (userId) => {
    try {
      const data = await apiService.getUserDetails(userId);
      // The interceptor unwraps { success, data: { user } } -> { user }
      const userDetails = data?.user || data;
      setSelectedUser(userDetails || { userId, email: `User ${userId}`, status: 'Active' });
      
      const marker = markersRef.current[userId];
      if (marker) {
        map.current.flyTo(marker.getLatLng(), 14, {
          duration: 1.5,
          easeLinearity: 0.25
        });
      }
    } catch (err) {
      setSelectedUser({ userId, email: `User ${userId}`, status: 'Active' });
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
      
      <div className="flex-1 rounded-xl border border-gray-700 overflow-hidden relative flex bg-gray-900">
        {/* Map Container */}
        <div ref={mapContainer} className="w-full h-full" id="map" />
        
        {/* User Detail Overlay panel */}
        {selectedUser && (
          <div className="absolute top-4 left-4 w-72 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-5 shadow-2xl z-[1000]">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-white">{selectedUser.name || selectedUser.email || 'Unknown User'}</h3>
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
                <span className="text-gray-200 text-sm font-mono truncate ml-2" title={selectedUser.userId}>{selectedUser.userId}</span>
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
