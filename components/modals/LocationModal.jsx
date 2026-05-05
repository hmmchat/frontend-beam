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
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCities();
      fetchPreference();
    }
  }, [isOpen]);

  const fetchCities = async (q = '') => {
    try {
      setSearchLoading(true);
      if (q) {
        const url = API.DISCOVERY.SEARCH_CITIES(q);
        const data = await apiRequest(url);
        // Ensure both label and value are handled if available
        setCities(data.cities?.map(c => ({
          name: c.name || c.label,
          value: c.value || c.name || c.label,
          availableCount: c.availableCount || c.count || 0
        })) || []);
      } else {
        const data = await apiRequest(API.DISCOVERY.GET_ACTIVE_CITY_OPTIONS);
        const options = data.options?.map(c => ({ 
          name: c.label || c.name, 
          value: c.value,
          availableCount: c.count || 0 
        })) || [];
        setCities(options);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const fetchPreference = async () => {
    try {
      const userData = await apiRequest(API.USERS.GET_ME).catch(() => null);
      if (userData?.user?.preferredCity) {
        setSelectedCity(userData.user.preferredCity);
        return;
      }
      const data = await apiRequest(API.DISCOVERY.LOCATION_PREFERENCE).catch(() => null);
      setSelectedCity(data?.city || '');
    } catch (error) {
      console.error('Error fetching preference:', error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCities(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLocateMe = async () => {
    if (!navigator.geolocation) return;
    
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const data = await apiRequest(API.DISCOVERY.LOCATE_ME, {
          method: 'POST',
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        });
        if (data.city) {
          // Note: LOCATE_ME might return a label, but we should ideally have a value
          setSelectedCity(data.value || data.city);
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
      await Promise.all([
        apiRequest(API.USERS.UPDATE_PREFERRED_CITY, {
          method: 'PATCH',
          body: JSON.stringify({ preferredCity: selectedCity || null })
        }).catch(() => null),
        apiRequest(API.DISCOVERY.UPDATE_LOCATION_PREFERENCE, {
          method: 'PATCH',
          body: JSON.stringify({ city: selectedCity || null })
        }).catch(() => null)
      ]);
      onClose();
    } catch (error) {
      console.error('Error saving preference:', error);
    } finally {
      setLoading(false);
    }
  };


  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center md:p-6"
      onClick={onClose}
    >
      {/* Backdrop (Full screen) */}

      {/* Modal Content */}
      <div
        className="relative z-10 w-full max-w-[1000px] h-full md:max-h-[85vh] max-h-[100vh] md:border-2 md:border-white/30 md:rounded-[40px] bg-purple-950/40 backdrop-blur-xl md:p-4 p-2 animate-in fade-in zoom-in duration-300 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >


              <div
        className="absolute inset-0 bg-[#02004A]/60 backdrop-blur-md"
        style={{
          backgroundImage: "url(/assets/mb.jpg)",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

        <div className="relative font-[family-name:var(--font-otomanopee)] rounded-[36px] flex flex-col h-full border-2 border-white/20 overflow-hidden ">
          {/* Background Pattern */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'url(/assets/1.png)',
              backgroundSize: '120px 120px',
              backgroundRepeat: 'repeat',
            }}
          />

          <div className="relative z-10 md:px-6 px-4 py-8 flex flex-col h-full  md:w-[70%] mx-auto">
            {/* Header */}
            <div className="flex items-center mb-3">
              <button 
                onClick={onClose} 
                className="md:hidden text-white p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Go back"
              >
                <IoMdArrowBack className="text-2xl" />
              </button>
              <h2 className="text-lg font-bold text-white px-2 text-left w-full tracking-wide">
                Select City
              </h2>
            </div>

            {/* Search */}
            <div className="mb-8 relative mx-auto w-full">
              <IoSearchOutline className="absolute left-5 top-1/2 -translate-y-1/2 text-white/50 text-xl  " />
              <input
                type="text"
                placeholder="Search City"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-6 py-3 border border-white/20 rounded-full text-white placeholder:text-white/50 focus:outline-none focus:border-purple-400 text-base shadow-inner transition-all"
              />
            </div>



            {/* Info */}
            <p className="text-white/90 text-sm  text-left font-sans tracking-wide">
              Cities having most fun
            </p>

            {/* City List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex justify-center pb-6 mt-4">
  <div className="grid grid-cols-2 sm:grid-cols-6 gap-5 max-w-[750px] w-full content-start">
    {(searchLoading && cities.length === 0) ? (
      Array(6).fill(0).map((_, i) => (
        <div 
          key={i} 
          className="rounded-2xl border-2 border-white animate-pulse h-24 col-span-1 sm:col-span-2"
        />
      ))
    ) : cities.map((city, index) =>  (
      <button
        key={city.value + city.name}
        onClick={() => setSelectedCity(city.value)}
       className={`md:px-6 px-3 py-3 md:py-5 md:rounded-[18px] rounded-[15px] border border-b-[4px] md:border-b-[4px] text-left transition-all relative overflow-hidden group
  col-span-1 
  sm:${index < 2 ? 'col-span-3' : 'col-span-2'}
  ${
    selectedCity === city.value
      ? 'border-yellow-400 border-b-[3px]'
      : 'border-white/40 border-b-[3px] hover:bg-white/10 hover:border-white/50'
  }`}
      >
        <div className="text-white md:text-sm  text-[10px] group-hover:translate-x-1 transition-transform">
          {city.name}
        </div>
        <div className="text-white text-xs font-sans">
          {city.availableCount
            ? `${city.availableCount.toLocaleString()} online`
            : 'Active city'}
        </div>
      </button>
    ))}
  </div>
</div>

            {/* Empty State */}
            {cities.length === 0 && !searchLoading && (
              <div className="flex-1 flex items-center justify-center text-white/40 italic">
                No cities found
              </div>
            )}

            {/* Divider */}


            {/* CTA */}
            
          </div>
          
        </div>
   <div className="flex pb-2 pt-2 mt-3 mb-4 justify-end px-10 z-10">
              <button
                onClick={handleSave}
                disabled={loading || !selectedCity}
                className="px-12 py-4 border-[1px] border-b-[3px] border-white/40 rounded-2xl text-white font-bold  disabled:opacity-90 disabled:hover:scale-100 "
              >
                {loading ? 'Saving...' : 'Start Beaming'}
              </button>
            </div>
      </div>
    </div>
  );
}
