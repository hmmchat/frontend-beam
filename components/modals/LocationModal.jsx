'use client';

import { useState, useEffect } from 'react';
import { IoSearchOutline } from 'react-icons/io5';
import { IoMdArrowBack } from "react-icons/io";
import { API, apiRequest } from '@/lib/api';

const defaultCities = [
  { name: "Mumbai", value: "MUMBAI", availableCount: 24500 },
  { name: "Delhi", value: "DELHI", availableCount: 18200 },
  { name: "Bangalore", value: "BANGALORE", availableCount: 15400 },
  { name: "Hyderabad", value: "HYDERABAD", availableCount: 12100 },
  { name: "Ahmedabad", value: "AHMEDABAD", availableCount: 9800 },
  { name: "Chennai", value: "CHENNAI", availableCount: 8900 },
  { name: "Kolkata", value: "KOLKATA", availableCount: 7600 },
  { name: "Pune", value: "PUNE", availableCount: 6500 },
  { name: "Jaipur", value: "JAIPUR", availableCount: 5400 },
  { name: "Surat", value: "SURAT", availableCount: 4300 }
];

export default function LocationModal({ isOpen, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [masterCities, setMasterCities] = useState(defaultCities);
  const [cities, setCities] = useState(defaultCities);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCities();
      fetchPreference();
    }
  }, [isOpen]);

  const fetchCities = async () => {
    try {
      setSearchLoading(true);
      const data = await apiRequest(API.DISCOVERY.GET_ACTIVE_CITY_OPTIONS);
      if (data && data.options && data.options.length > 0) {
        const options = data.options.map(c => ({
          name: c.label || c.name,
          value: c.value || c.label || c.name,
          availableCount: c.count || 0
        }));
        setMasterCities(options);
        setCities(options);
      } else {
        setMasterCities(defaultCities);
        setCities(defaultCities);
      }
    } catch (error) {
      console.error('Error fetching cities, using defaults:', error);
      setMasterCities(defaultCities);
      setCities(defaultCities);
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

  // Local fuzzy search logic (similar to interests and brands)
  const fuzzySearch = (query, items) => {
    if (!query) return items;
    const lowerQuery = query.toLowerCase();

    return items
      .map((item) => {
        const text = item.name.toLowerCase();
        let score = 0;

        if (text === lowerQuery) score = 100;
        else if (text.startsWith(lowerQuery)) score = 80;
        else if (text.includes(lowerQuery)) score = 50;

        let i = 0, j = 0;
        while (i < lowerQuery.length && j < text.length) {
          if (lowerQuery[i] === text[j]) i++;
          j++;
        }
        if (i === lowerQuery.length && score < 30) score = 30;

        return { item, score };
      })
      .filter((match) => match.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((match) => match.item);
  };

  useEffect(() => {
    if (searchQuery) {
      setCities(fuzzySearch(searchQuery, masterCities));
    } else {
      setCities(masterCities);
    }
  }, [searchQuery, masterCities]);

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
      className="fixed inset-0 z-[110] flex items-center justify-center md:p-6 "
      onClick={onClose}
    >
      <div
        className="relative z-10 w-full max-w-[1000px] h-full md:max-h-[85vh] max-h-[100vh] md:border-2 md:border-white/30 md:rounded-[40px]  md:p-4 p-2 animate-in fade-in zoom-in duration-300 overflow-hidden flex flex-col"
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

          <div className="relative z-10 md:px-6 px-4 py-8 flex flex-col h-full md:w-[70%] mx-auto overflow-hidden">
            {/* Header */}
            <div className="flex items-center mb-3">
              <button
                onClick={onClose}
                className="md:hidden text-white p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Go back"
              >
                <IoMdArrowBack className="text-2xl" />
              </button>
              <h2 className="text-md font-outif font-bold text-white px-2 text-left w-full tracking-wide">
                Select City
              </h2>
            </div>

            {/* Search Input */}
            <div className="mb-6 relative mx-auto w-full">
              <IoSearchOutline className="absolute left-5 top-1/2 -translate-y-1/2 text-white/50 text-xl" />
              <input
                type="text"
                placeholder="Search City"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-6 py-3 border border-white/20 rounded-full  font-outfit text-white placeholder:text-white/50 focus:outline-none focus:border-purple-400 text-base shadow-inner transition-all"
              />
            </div>

            {/* Info label */}
            <p className="text-white/90 text-sm mb-3 text-left font-sans tracking-wide">
              Cities having most fun
            </p>

            {/* Scrollable City Grid */}
            <div className="flex-1 overflow-y-auto scrollbar-hide w-full max-w-[750px] pb-4">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 w-full content-start pr-1">
                {cities.map((city, index) => {
                  const isSelected = selectedCity === city.value;
                  return (
                    <button
                      key={city.value + city.name}
                      onClick={() => setSelectedCity(city.value)}
                      className={`
                        px-3 md:px-6
                        py-3 md:py-5
                        rounded-[15px] md:rounded-[18px]
                        border-2 border-b-4
                        text-left transition-all duration-300 relative overflow-hidden group cursor-pointer
                        ${index < 2
                          ? 'md:col-span-3' // desktop first row = 2 cards
                          : 'md:col-span-2' // desktop remaining rows = 3 cards
                        }
                        ${isSelected
                          ? 'border-yellow-400 bg-purple-500/20 shadow-[0_0_15px_rgba(242,173,0,0.3)]'
                          : 'border-white/30  hover:bg-white/10 hover:border-white/50 hover:scale-[1.02]'
                        }
                      `}
                    >
                      <div className="text-white md:text-sm text-[10px] group-hover:translate-x-1 transition-transform font-bold">
                        {city.name}
                      </div>

                      <div className="text-white text-xs font-sans ">
                        {city.availableCount
                          ? `${city.availableCount.toLocaleString()} online`
                          : 'Active city'}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Empty State */}
              {cities.length === 0 && !searchLoading && (
                <div className="text-center text-white/40 italic py-10 w-full font-sans">
                  No cities found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="flex pb-2 pt-2 mt-3 mb-4 justify-end px-10 z-10">
          <button
            onClick={handleSave}
            disabled={loading || !selectedCity}
            className="px-12 py-4 border-[1px] border-b-[3px] border-white/40 rounded-2xl text-white font-bold  hover:bg-white/20 hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:bg-white/5"
          >
            {loading ? 'Saving...' : 'Start Beaming'}
          </button>
        </div>
      </div>
    </div>
  );
}
