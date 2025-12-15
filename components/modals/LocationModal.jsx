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
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="text-center relative">
        {/* Dot Pattern Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url(/assets/1.png)', backgroundSize: '100px 100px', backgroundRepeat: 'repeat' }}></div>
        
        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-white mb-6">Select Location</h2>

          {/* Search Bar */}
          <div className="mb-6 flex gap-3">
            <div className="flex-1 relative">
              <IoSearchOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-xl" />
              <input
                type="text"
                placeholder="Search City"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/8 border-2 border-purple-500/30 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/80"
              />
            </div>
            <button className="px-4 py-3 bg-white/8 border-2 border-purple-500/30 rounded-xl text-white hover:bg-white/12 transition-all flex items-center gap-2">
              <IoLocationOutline className="text-xl" />
              <span className="text-sm">Locate me</span>
            </button>
          </div>

          {/* Fun Message */}
          <p className="text-white/70 text-sm mb-4 text-left">
            Cities having most fun, Hmmm... Safe Fun etc!
          </p>

          {/* Cities Grid */}
          <div className="grid grid-cols-2 gap-3 mb-8 max-h-[300px] overflow-y-auto pr-2">
            {filteredCities.map((city) => (
              <button
                key={city.name}
                onClick={() => setSelectedCity(city.name)}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                  selectedCity === city.name
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-purple-500/30 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="text-white font-semibold mb-1">{city.name}</div>
                <div className="text-white/60 text-xs">{city.online}</div>
              </button>
            ))}
          </div>

          {/* Start Match Button */}
          <Button
            variant="secondary"
            fullWidth
            onClick={onClose}
          >
            Start Match
          </Button>
        </div>
      </div>
    </Modal>
  );
}
