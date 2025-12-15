'use client';

import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function GenderModal({ isOpen, onClose }) {
  const [selectedGender, setSelectedGender] = useState('both');

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="600px" maxHeight="auto">
      <div className="text-center relative">
        {/* Dot Pattern Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url(/assets/5471985.jpg)', backgroundSize: '100px 100px' }}></div>
        
        <div className="relative z-10 ">
          <h2 className="text-xl font-bold text-white mb-6">Select Gender</h2>

          <div className="grid grid-cols-2 gap-3 mb-4 px-20">
            {/* Only Girls */}
            <button
              onClick={() => setSelectedGender('girls')}
              className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                selectedGender === 'girls'
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-purple-500/30 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="text-4xl mb-2">👩</div>
              <div className="text-white font-semibold text-sm mb-1">Only Girls</div>
              <div className="text-white/60 text-xs mb-2">10 Matches</div>
              <div className="flex items-center justify-center gap-1 text-yellow-400">
                <span className="text-lg">🪙</span>
                <span className="font-bold text-sm">200</span>
              </div>
            </button>

            {/* Only Guys */}
            <button
              onClick={() => setSelectedGender('guys')}
              className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                selectedGender === 'guys'
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-purple-500/30 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="text-4xl mb-2">👨</div>
              <div className="text-white font-semibold text-sm mb-1">Only Guys</div>
              <div className="text-white/60 text-xs mb-2">10 Matches</div>
              <div className="flex items-center justify-center gap-1 text-yellow-400">
                <span className="text-lg">🪙</span>
                <span className="font-bold text-sm">200</span>
              </div>
            </button>
          </div>

  <button
  onClick={() => setSelectedGender('both')}
  className={`p-3 rounded-xl border-2 transition-all duration-300 mb-6 ${
    selectedGender === 'both'
      ? 'border-purple-500 bg-purple-500 px-10 w-[260px]'
      : 'border-purple-500/30 bg-white px-10 hover:bg-white/10 w-[300px]'
  }`}
>
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className="text-xl">👩👨</span>
      <span className="text-white font-semibold text-sm">Both Gender</span>
    </div>
    <span className="text-green-400 font-semibold text-sm">Free</span>
  </div>
</button>

          {/* Start Match Button */}
          <Button
            variant="secondary"
            fullWidth
            onClick={onClose}
                 width="quarter"
          >
            Start Match
          </Button>
        </div>
      </div>
    </Modal>
  );
}
