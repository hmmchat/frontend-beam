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
      // GET /location/preference — authenticated via JWT
      const data = await apiRequest(API.DISCOVERY.LOCATION_PREFERENCE);
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
        const data = await apiRequest(API.DISCOVERY.LOCATE_ME, {
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
      // PATCH /location/preference — authenticated via JWT
      await apiRequest(API.DISCOVERY.UPDATE_LOCATION_PREFERENCE, {
        method: 'PATCH',
        body: JSON.stringify({
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


  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6"
      onClick={onClose}
    >
      {/* Backdrop (Full screen) */}

      {/* Modal Content */}
      <div
        className="relative z-10 w-full max-w-[850px] h-full max-h-[85vh] border-2 border-white/30 rounded-[40px] bg-purple-950/40 backdrop-blur-xl p-2 animate-in fade-in zoom-in duration-300 overflow-hidden flex flex-col"
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

          <div className="relative z-10 px-6 py-8 flex flex-col h-full  w-[70%] mx-auto">
            {/* Header */}
            <h2 className="text-lg font-bold text-white text-left w-full tracking-wide mx-auto mb-3 ">
                Select City
              </h2>

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
            <div className="flex-1 overflow-y-auto px-2 custom-scrollbar flex justify-center pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-[750px] w-full content-start">
                {cities.map((city) => (
                  <button
                    key={city.name}
                    onClick={() => setSelectedCity(city.name)}
                    className={`px-6 py-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden backdrop-blur-md group ${
                      selectedCity === city.name
                        ? 'border-yellow-400 bg-purple-900/40 shadow-[0_0_20px_rgba(255,200,0,0.3)]'
                        : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40'
                    }`}
                  >
                    <div className="text-white text-base font-semibold group-hover:translate-x-1 transition-transform">
                      {city.name}
                    </div>
                    <div className="text-white/60 text-xs mt-1.5 font-sans">
                      {city.availableCount
                        ? `${city.availableCount.toLocaleString()} online`
                        : 'Active city'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Empty State */}
            {cities.length === 0 && !loading && (
              <div className="flex-1 flex items-center justify-center text-white/40 italic">
                No cities found
              </div>
            )}

            {/* Divider */}


            {/* CTA */}
            
          </div>
          
        </div>
   <div className="flex pb-2 pt-2 mt-3 mb-4 justify-end px-10">
              <button
                onClick={handleSave}
                disabled={loading || !selectedCity}
                className="px-12 py-4 rounded-2xl text-white font-bold border-2 border-white/30  disabled:opacity-90 disabled:hover:scale-100 "
              >
                {loading ? 'Saving...' : 'Start Beaming'}
              </button>
            </div>
      </div>
    </div>
  );
}
