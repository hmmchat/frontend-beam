'use client';

import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { IoSearchOutline, IoLocationOutline } from 'react-icons/io5';

export default function LocationModal({ isOpen, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const cities = [
    { name: 'Pune', online: '26,772 online' },
    { name: 'Delhi', online: '24,472 Chatting' },
    { name: 'Bangalore', online: '26,772 online' },
    { name: 'Mumbai', online: '24,472 Chatting' },
    { name: 'Kolkata', online: '19,772 online' },
    { name: 'Assam', online: '26,772 online' },
    { name: 'Ahmedabad', online: '24,472 Chatting' },
    { name: 'Bhubaneshwar', online: '19,772 online' },
  ];

  const filteredCities = cities.filter(city =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="600px">
      <div className="relative text-center">
        {/* Background */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'url(/assets/1.png)',
            backgroundSize: '120px 120px',
            backgroundRepeat: 'repeat',
          }}
        />

        <div className="relative z-10 px-4 sm:px-8 py-6">
          {/* Title */}
          <h2 className="text-lg sm:text-2xl font-bold text-white mb-4">
            Select Location
          </h2>

          {/* Search */}
          <div className="mb-5 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <IoSearchOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-lg" />
              <input
                type="text"
                placeholder="Search City"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white/8 border-2 border-purple-500/30 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/80 text-sm"
              />
            </div>

            <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/8 border-2 border-purple-500/30 rounded-xl text-white hover:bg-white/12 transition text-sm">
              <IoLocationOutline className="text-lg" />
              Locate me
            </button>
          </div>

          {/* Info */}
          <p className="text-white/70 text-xs sm:text-sm mb-3 text-left">
            Cities having most fun, Hmmm... Safe Fun etc!
          </p>

          {/* City List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 max-h-[260px] sm:max-h-[320px] overflow-y-auto pr-1">
            {filteredCities.map((city) => (
              <button
                key={city.name}
                onClick={() => setSelectedCity(city.name)}
                className={`p-3 rounded-xl border-2 text-left transition ${selectedCity === city.name
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-purple-500/30 bg-white/5 hover:bg-white/10'
                  }`}
              >
                <div className="text-white font-semibold text-sm">
                  {city.name}
                </div>
                <div className="text-white/60 text-xs">
                  {city.online}
                </div>
              </button>
            ))}
          </div>

          {/* CTA */}
          <Button variant="secondary" fullWidth onClick={onClose}>
            Start Match
          </Button>
        </div>
      </div>
    </Modal>
  );
}
