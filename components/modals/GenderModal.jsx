'use client';

import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function GenderModal({ isOpen, onClose }) {
  const [selectedGender, setSelectedGender] = useState('both');

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="400px" bottom='0' left='0' right='0'>
      <div className="relative font-[family-name:var(--font-otomanopee)] rounded-xl flex flex-col justify-end ">
        {/* Background */}


        <div className="relative z-10 px-4 sm:px-8 py-6">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-5">
            Select Gender
          </h2>

          {/* Cards */}
          <div className="grid grid-cols-2 md:grid-cols-2 gap-3 mb-4">
            {/* Girls */}
            <button
              onClick={() => setSelectedGender('girls')}
              className={`p-4 rounded-xl border-2 transition ${selectedGender === 'girls'
                ? 'border-purple-500 bg-purple-500/20'
                : 'border-purple-500/30 bg-white/5 hover:bg-white/10'
                }`}
            >
              <div className="text-3xl sm:text-4xl mb-1">👩</div>
              <div className="text-white font-semibold text-sm">
                Only Girls
              </div>
              <div className="text-white/60 text-xs mb-2">
                10 Matches
              </div>
              <div className="flex justify-center gap-1 text-yellow-400 text-sm">
                <img src="/assets/Coin-token.svg" alt="" className='w-5 h-5' />
                <span className="font-bold">200</span>
              </div>
            </button>

            {/* Guys */}
            <button
              onClick={() => setSelectedGender('guys')}
              className={`p-4 rounded-xl border-2 transition ${selectedGender === 'guys'
                ? 'border-purple-500 bg-purple-500/20'
                : 'border-purple-500/30 bg-white/5 hover:bg-white/10'
                }`}
            >
              <div className="text-3xl sm:text-4xl mb-1">🧑</div>
              <div className="text-white font-semibold text-sm">
                Only Guys
              </div>
              <div className="text-white/60 text-xs mb-2">
                10 Matches
              </div>
              <div className="flex justify-center gap-1 text-yellow-400 text-sm">
                <img src="/assets/Coin-token.svg" alt="" className='w-5 h-5' />
                <span className="font-bold">200</span>
              </div>
            </button>
          </div>

          {/* Both Gender */}
          <Button
            variant="outline2"
            onClick={() => setSelectedGender('both')}
            className={`justify-between w-full  rounded-xl border-2 transition mb-5 ${selectedGender === 'both'
              ? 'border-purple-500 bg-purple-500/30'
              : 'border-purple-500/30 bg-white/5 hover:bg-white/10'
              }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className="text-lg">👩🧑</span>
                <span className="text-white font-semibold text-sm">
                  Both Gender
                </span>
              </div>
              <div className='flex items-center gap-2'><span className="text-green-400 font-semibold text-sm">
                Free
              </span>
              </div>

            </div>
          </Button>

          {/* Divider */}
          <div className="border-t border-white/20 -mx-4 sm:-mx-8 mb-6 mt-2" />

          {/* CTA */}
          <div className="flex justify-end">
            <Button
              variant="outline2"
              width="auto"
              position="none"
              onClick={onClose}
            >
              Start Match
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
