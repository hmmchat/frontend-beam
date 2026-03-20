'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';

export default function ValuesOnboarding() {
  const router = useRouter();
  const [values, setValues] = useState([]);
  const [selectedValues, setSelectedValues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchValues();
  }, []);

  const fetchValues = async () => {
    try {
      const response = await fetch(API.USERS.GET_VALUES);
      
      if (!response.ok) {
        throw new Error('Failed to fetch values');
      }

      const data = await response.json();
      setValues(data.values || []);
    } catch (error) {
      console.error('Error fetching values:', error);
      setError('Failed to load values');
    } finally {
      setLoading(false);
    }
  };

  const toggleValue = (valueId) => {
    setSelectedValues(prev => {
      if (prev.includes(valueId)) {
        return prev.filter(id => id !== valueId);
      } else {
        if (prev.length >= 4) {
          setError('Maximum 4 values allowed');
          return prev;
        }
        setError('');
        return [...prev, valueId];
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      
      if (selectedValues.length > 0) {
        const response = await fetch(API.USERS.UPDATE_VALUES, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            valueIds: selectedValues
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to save values');
        }
      }

      // Success! Move to next step
      router.push('/onboarding/location');
    } catch (error) {
      console.error('Error saving values:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    router.push('/onboarding/location');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        <div className="text-white text-2xl">Loading values...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Step 6 of 7</span>
            <span className="text-sm text-white/60">{Math.round((6/7) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${(6/7) * 100}%` }}></div>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">What Matters to You? ❤️</h1>
          <p className="text-white/70 text-lg">
            Select 1-4 values that are important to you
          </p>
          <p className="text-purple-300 mt-2">
            {selectedValues.length}/4 selected
          </p>
        </div>

        {/* Values Grid */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 mb-8">
          {error && (
            <div className="text-red-300 mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {values.map((value) => (
              <div
                key={value.id}
                onClick={() => toggleValue(value.id)}
                className={`p-6 rounded-xl cursor-pointer transition-all ${
                  selectedValues.includes(value.id)
                    ? 'bg-purple-600/30 border-2 border-purple-500 scale-105'
                    : 'bg-white/5 hover:bg-white/10 border-2 border-transparent'
                }`}
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">{value.emoji || '❤️'}</div>
                  <p className="font-semibold">{value.name}</p>
                  {selectedValues.includes(value.id) && (
                    <span className="text-green-400 text-sm">✓ Selected</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {values.length === 0 && (
            <div className="text-center text-white/60 py-12">
              No values available. Please contact support.
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-4">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full font-semibold transition-all"
          >
            ← Back
          </button>
          <button
            onClick={handleSkip}
            className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full font-semibold transition-all"
          >
            Skip for Now
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-full font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}
