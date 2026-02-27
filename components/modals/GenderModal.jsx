'use client';

import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { API, apiRequest } from '@/lib/api';

export default function GenderModal({ isOpen, onClose }) {
  const [selectedGender, setSelectedGender] = useState('ALL');
  const [filters, setFilters] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFilters();
    }
  }, [isOpen]);

  const fetchFilters = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub || payload.uid || payload.id;

      const data = await apiRequest(API.DISCOVERY.GENDER_FILTERS(userId));
      setFilters(data.availableFilters || []);
      
      if (data.currentPreference) {
        setSelectedGender(data.currentPreference.genders[0]);
      } else {
        setSelectedGender('ALL');
      }
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const handleApply = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub || payload.uid || payload.id;

      await apiRequest(API.DISCOVERY.APPLY_GENDER_FILTER, {
        method: 'POST',
        body: JSON.stringify({
          userId,
          genders: [selectedGender]
        })
      });
      onClose();
    } catch (error) {
      console.error('Error applying filter:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="400px" bottom='0' left='0' right='0'>
      <div className="relative font-[family-name:var(--font-otomanopee)] rounded-xl flex flex-col justify-end ">
        {/* Background */}


        <div className="relative z-10 px-4 sm:px-8 py-6">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-5">
            Select Gender
          </h2>

          {/* Cards */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {filters.filter(f => f.gender !== 'ALL').map((filter) => (
              <button
                key={filter.gender}
                onClick={() => setSelectedGender(filter.gender)}
                className={`p-4 rounded-xl border-2 transition ${selectedGender === filter.gender
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-purple-500/30 bg-white/5 hover:bg-white/10'
                  }`}
              >
                <div className="text-3xl sm:text-4xl mb-1">
                  {filter.gender === 'FEMALE' ? '👩' : filter.gender === 'MALE' ? '🧑' : '🌈'}
                </div>
                <div className="text-white font-semibold text-sm">
                  {filter.label}
                </div>
                <div className="text-white/60 text-xs mb-2">
                  10+ Matches
                </div>
                <div className="flex justify-center gap-1 text-yellow-400 text-sm">
                  <img src="/assets/Coin-token.svg" alt="" className='w-5 h-5' />
                  <span className="font-bold">{filter.cost}</span>
                </div>
              </button>
            ))}
          </div>

          {/* All Gender (Free) */}
          {filters.filter(f => f.gender === 'ALL').map((filter) => (
            <Button
              key="ALL"
              variant="outline2"
              onClick={() => setSelectedGender('ALL')}
              className={`justify-between w-full rounded-xl border-2 transition mb-5 ${selectedGender === 'ALL'
                ? 'border-purple-500 bg-purple-500/30'
                : 'border-purple-500/30 bg-white/5 hover:bg-white/10'
                }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span className="text-lg">👩🧑</span>
                  <span className="text-white font-semibold text-sm">
                    {filter.label}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <span className="text-green-400 font-semibold text-sm">
                    Free
                  </span>
                </div>
              </div>
            </Button>
          ))}

          {/* Divider */}
          <div className="border-t border-white/20 -mx-4 sm:-mx-8 mb-6 mt-2" />

          {/* CTA */}
          <div className="flex justify-end">
            <Button
              variant="outline2"
              width="auto"
              position="none"
              onClick={handleApply}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Start Match'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
