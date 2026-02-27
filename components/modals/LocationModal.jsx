'use client';

import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { IoSearchOutline, IoLocationOutline } from 'react-icons/io5';
import { IoMdArrowBack } from "react-icons/io";
import { API, apiRequest } from '@/lib/api';

export default function LocationModal({ isOpen, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCities();
      fetchPreference();
    }
  }, [isOpen]);

  const fetchCities = async (q = '') => {
    try {
      const url = q ? API.DISCOVERY.SEARCH_CITIES(q) : API.DISCOVERY.GET_CITIES;
      const data = await apiRequest(url);
      setCities(data.cities || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const fetchPreference = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub || payload.uid || payload.id;
      
      const data = await apiRequest(API.DISCOVERY.LOCATION_PREFERENCE(userId));
      setSelectedCity(data.city || '');
    } catch (error) {
      console.error('Error fetching preference:', error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) fetchCities(searchQuery);
      else fetchCities();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLocateMe = async () => {
    if (!navigator.geolocation) return;
    
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const data = await apiRequest(`${API.DISCOVERY.GET_CITIES.replace('/cities', '/locate-me')}`, {
          method: 'POST',
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        });
        if (data.city) {
          setSelectedCity(data.city);
        }
      } catch (error) {
        console.error('Error locating:', error);
      } finally {
        setLoading(false);
      }
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub || payload.uid || payload.id;

      await apiRequest(API.DISCOVERY.UPDATE_LOCATION_PREFERENCE, {
        method: 'PATCH',
        body: JSON.stringify({
          userId,
          city: selectedCity || null
        })
      });
      onClose();
    } catch (error) {
      console.error('Error saving preference:', error);
    } finally {
      setLoading(false);
    }
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="600px" bottom='0' left='0' right='0'>
      <div className="relative font-[family-name:var(--font-otomanopee)] rounded-xl flex flex-col h-full">
        {/* Background */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'url(/assets/1.png)',
            backgroundSize: '120px 120px',
            backgroundRepeat: 'repeat',
          }}
        />

        <div className="relative z-10 px-6 py-6 flex flex-col h-full">

          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button onClick={onClose} className="text-white text-2xl">
              <IoMdArrowBack />
            </button>
            <h2 className="text-sm font-bold text-white">
              Select Location
            </h2>
          </div>

          {/* Search */}
          <div className="mb-2 relative">
            <IoSearchOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-xl outfit-font" />
            <input
              type="text"
              placeholder="Search City"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[#ffffff1a] border border-[#ffffff1a] rounded-2xl text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/80 text-sm outfit-font"
            />
          </div>

          {/* Locate Me */}
          <button 
            onClick={handleLocateMe}
            disabled={loading}
            className="flex items-center gap-2 text-white/80 hover:text-white transition text-sm mb-6 ml-1 w-fit disabled:opacity-50"
          >
            <IoLocationOutline className="text-lg" />
            <span className="underline decoration-white/50 underline-offset-4">
              {loading ? 'Locating...' : 'Locate me'}
            </span>
          </button>


          {/* Info */}
          <p className="text-white/70 text-sm mb-3 outfit-font">
            Cites having most fun. Hmmm... Safe Fun ofc!
          </p>

          {/* City List */}
          <div className="grid grid-cols-2 gap-3 mb-6 overflow-y-auto pr-1 flex-1 content-start min-h-[200px]">
            {cities.map((city) => (
              <button
                key={city.name}
                onClick={() => setSelectedCity(city.name)}
                className={`p-4 rounded-2xl border-2 text-left transition relative overflow-hidden ${selectedCity === city.name
                  ? 'border-yellow-400 bg-[#2C0058]'
                  : 'border-white/20 bg-[#ffffff1a] hover:bg-white/10'
                  }`}
              >
                <div className="text-white text-sm mb-0.5">
                  {city.name}
                </div>
                <div className="text-white/60 text-xs outfit-font">
                  {city.availableCount ? `${city.availableCount} online` : 'Active city'}
                </div>
              </button>
            ))}
            {cities.length === 0 && !loading && (
              <div className="col-span-2 text-white/40 text-center py-8">No cities found</div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-white/20 -mx-6 mb-4" />

          {/* CTA */}
          <div className="flex justify-end">
            <Button
              variant="outline2"
              width="auto"
              onClick={handleSave}
              disabled={loading}
              position='none'
              className="px-8 py-3 rounded-xl text-sm bg-[#2a0060] border border-white/20"
            >
              {loading ? 'Saving...' : 'Start Matching'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
