'use client';

import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { IoSearchOutline, IoLocationOutline } from 'react-icons/io5';
import { IoMdArrowBack } from "react-icons/io";

export default function LocationModal({ isOpen, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const cities = [
    { name: 'Pune', online: '26,772 online' },
    { name: 'Delhi', online: '24,472 Chatting' },
    { name: 'Bangalore', online: '26,772 online' },
    { name: 'Mumbai', online: '24,472 Chatting' },
    { name: 'Kolkata', online: '19,772 online' },
    { name: 'Bhubaneshwar', online: '19,772 online' },
    { name: 'Assam', online: '26,772 online' },
    { name: 'Ahmedabad', online: '24,472 Chatting' },

  ];

  const filteredCities = cities.filter(city =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase())
  );


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
          <button className="flex items-center gap-2 text-white/80 hover:text-white transition text-sm mb-6 ml-1 w-fit">
            <IoLocationOutline className="text-lg" />
            <span className="underline decoration-white/50 underline-offset-4">Locate me</span>
          </button>


          {/* Info */}
          <p className="text-white/70 text-sm mb-3 outfit-font">
            Cites having most fun. Hmmm... Safe Fun ofc!
          </p>

          {/* City List */}
          <div className="grid grid-cols-2 gap-3 mb-6 overflow-y-auto pr-1 flex-1 content-start">
            {filteredCities.map((city) => (
              <button
                key={city.name}
                onClick={() => setSelectedCity(city.name)}
                className={`p-4 rounded-2xl border-2 text-left transition relative overflow-hidden ${selectedCity === city.name
                  ? 'border-yellow-400 bg-[#2C0058]'
                  : 'border-white/20 bg-[#ffffff1a] hover:bg-white/10'
                  }`}
              >
                {/* Selection Indicator (optional, or just border) */}
                <div className="text-white  text-sm mb-0.5">
                  {city.name}
                </div>
                <div className="text-white/60 text-xs outfit-font">
                  {city.online}
                </div>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-white/20 -mx-6 mb-4" />

          {/* CTA */}
          <div className="flex justify-end">
            <Button
              variant="outline2"
              width="auto"
              onClick={onClose}
              position='none'
              className="px-8 py-3 rounded-xl text-sm bg-[#2a0060] border border-white/20"
            >
              Start Matching
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
