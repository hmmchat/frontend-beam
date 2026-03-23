'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import { calculateProgress, getZodiac, calculateAge } from '@/lib/facecard-utils';

// Components
import FacecardDisplay from '@/components/facecard/FacecardDisplay';
import FacecardEditor from '@/components/facecard/FacecardEditor';
import SelectorOverlay from '@/components/facecard/SelectorOverlay';

export default function FacecardPage() {
  const router = useRouter();
  const [view, setView] = useState('success'); // 'success' or 'editor'
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);
  const [activeSlot, setActiveSlot] = useState(null);

  // Dynamic Data State
  const [masterInterests, setMasterInterests] = useState([]);
  const [masterValues, setMasterValues] = useState([]);
  const [masterBrands, setMasterBrands] = useState([]);
  const [allInterests, setAllInterests] = useState([]);
  const [allValues, setAllValues] = useState([]);
  const [allBrands, setAllBrands] = useState([]);
  const [showSelector, setShowSelector] = useState(null); // 'interests' | 'values' | 'brands' | 'music'
  const [searchingMusic, setSearchingMusic] = useState(false);
  const [musicQuery, setMusicQuery] = useState("");
  const [musicResults, setMusicResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingItems, setIsSearchingItems] = useState(false);

  const progress = calculateProgress(user);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/');
        return;
      }

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const uid = payload.sub || payload.uid;
        
        const response = await fetch(`${API.USERS.GET_USER(uid)}?fields=username,dateOfBirth,gender,displayPictureUrl,intent,photos,musicPreference,brandPreferences,interests,values`, {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          console.error('❌ Failed to fetch profile:', response.status);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchChoices = async () => {
      try {
        const [intRes, valRes, brRes] = await Promise.all([
          fetch(API.DISCOVERY.GET_INTERESTS),
          fetch(API.DISCOVERY.GET_VALUES),
          fetch(API.DISCOVERY.GET_BRANDS)
        ]);
        if (intRes.ok) {
          const data = (await intRes.json()).interests;
          setMasterInterests(data);
          setAllInterests(data);
        }
        if (valRes.ok) {
          const data = (await valRes.json()).values;
          setMasterValues(data);
          setAllValues(data);
        }
        if (brRes.ok) {
          const data = (await brRes.json()).brands;
          setMasterBrands(data);
          setAllBrands(data);
        }
      } catch (error) {
        console.error('Error fetching choices:', error);
      }
    };

    fetchProfile();
    fetchChoices();
  }, [router]);

  useEffect(() => {
    if (!showSelector) {
      if (masterInterests.length > 0) setAllInterests(masterInterests);
      if (masterValues.length > 0) setAllValues(masterValues);
      if (masterBrands.length > 0) setAllBrands(masterBrands);
    }
  }, [showSelector, masterInterests, masterValues, masterBrands]);

  const toggleInterest = async (interestId, name) => {
    const token = localStorage.getItem('accessToken');
    const current = user.interests || [];
    const exists = current.find(i => i.interestId === interestId);
    let newList;
    
    if (exists) {
      newList = current.filter(i => i.interestId !== interestId);
    } else {
      newList = [...current, { interestId, interest: { name } }];
    }

    setUser(prev => ({ ...prev, interests: newList }));

    try {
      await fetch(API.USERS.UPDATE_INTERESTS, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ interestIds: newList.map(i => i.interestId) })
      });
    } catch (err) {
      console.error('Error saving interests:', err);
    }
  };

  const toggleValue = async (valueId, name) => {
    const token = localStorage.getItem('accessToken');
    const current = user.values || [];
    const exists = current.find(v => v.valueId === valueId);
    let newList;

    if (exists) {
      newList = current.filter(v => v.valueId !== valueId);
    } else {
      newList = [...current, { valueId, value: { name } }];
    }

    setUser(prev => ({ ...prev, values: newList }));

    try {
      await fetch(API.USERS.UPDATE_VALUES, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ valueIds: newList.map(v => v.valueId) })
      });
    } catch (err) {
      console.error('Error saving values:', err);
    }
  };

  const toggleBrand = async (brandId, name, logoUrl) => {
    const token = localStorage.getItem('accessToken');
    const current = user.brandPreferences || [];
    const exists = current.find(b => b.brandId === brandId);
    let newList;

    if (exists) {
      newList = current.filter(b => b.brandId !== brandId);
    } else {
      if (current.length >= 5) return;
      newList = [...current, { brandId, brand: { name, logoUrl } }];
    }

    setUser(prev => ({ ...prev, brandPreferences: newList }));

    try {
      await fetch(API.USERS.UPDATE_BRANDS, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ brandIds: newList.map(b => b.brandId) })
      });
    } catch (err) {
      console.error('Error saving brands:', err);
    }
  };

  const levenshtein = (a, b) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    return matrix[a.length][b.length];
  };

  const fuzzySearch = (query, items) => {
    if (!query) return items;
    const lowerQuery = query.toLowerCase();
    
    return items.map(item => {
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
      
      const prefixMatch = text.substring(0, lowerQuery.length + 2);
      const dist = levenshtein(lowerQuery, prefixMatch);
      if (dist <= 2 && score < 40 - (dist * 10)) score = 40 - (dist * 10);
      
      return { item, score };
    })
    .filter(match => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(match => match.item);
  };

  const searchItems = async (category, query) => {
    if (!query) {
      if (category === 'brands') setAllBrands(masterBrands);
      else if (category === 'interests') setAllInterests(masterInterests);
      else if (category === 'values') setAllValues(masterValues);
      return;
    }

    if (category === 'interests' || category === 'values') {
      setIsSearchingItems(true);
      setTimeout(() => {
        if (category === 'interests') {
          setAllInterests(fuzzySearch(query, masterInterests));
        } else {
          setAllValues(fuzzySearch(query, masterValues));
        }
        setIsSearchingItems(false);
      }, 50);
      return;
    }

    if (query.length < 1) return;
    setIsSearchingItems(true);
    try {
      let endpoint;
      if (category === 'brands') endpoint = API.DISCOVERY.SEARCH_BRANDS;
      else if (category === 'interests') endpoint = API.DISCOVERY.SEARCH_INTERESTS;
      else if (category === 'values') endpoint = API.DISCOVERY.SEARCH_VALUES;
      
      if (!endpoint) return;

      const fullUrl = typeof endpoint === 'function' ? endpoint(query) : `${endpoint}?q=${encodeURIComponent(query)}`;
      const response = await fetch(fullUrl);
      if (response.ok) {
        const data = await response.json();
        if (category === 'brands') setAllBrands(data.brands || []);
        else if (category === 'interests') setAllInterests(data.interests || []);
        else if (category === 'values') setAllValues(data.values || []);
      }
    } catch (err) {
      console.error(`Error searching ${category}:`, err);
    } finally {
      setIsSearchingItems(false);
    }
  };

  const searchMusic = async (query) => {
    if (!query || query.length < 2) return;
    setSearchingMusic(true);
    try {
      const response = await fetch(API.USERS.SEARCH_MUSIC(query));
      if (response.ok) {
        const data = await response.json();
        setMusicResults(data.songs || []);
      }
    } catch (err) {
      console.error('Error searching music:', err);
    } finally {
      setSearchingMusic(false);
    }
  };

  const selectMusic = async (song) => {
    const token = localStorage.getItem('accessToken');
    try {
      const createRes = await fetch(API.USERS.CREATE_MUSIC_PREFERENCE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songName: song.name,
          artistName: song.artist,
          albumArtUrl: song.albumArtUrl,
          spotifyId: song.spotifyId
        })
      });
      
      if (createRes.ok) {
        const { song: savedSong } = await createRes.json();
        const updateRes = await fetch(API.USERS.UPDATE_MUSIC_PREFERENCE, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ musicPreferenceId: savedSong.id })
        });

        if (updateRes.ok) {
          setUser(prev => ({ ...prev, musicPreference: savedSong }));
          setShowSelector(null);
        }
      }
    } catch (err) {
      console.error('Error selecting music:', err);
    }
  };

  const handleSlotClick = (slotIndex) => {
    setActiveSlot(slotIndex);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'profile-photos');

      const token = localStorage.getItem('accessToken');
      const uploadRes = await fetch(`${API.FILES.UPLOAD}?folder=profile-photos`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        console.error('❌ Upload Response Error:', uploadRes.status, errData);
        throw new Error(`Upload failed: ${errData.message || uploadRes.statusText}`);
      }
      const uploadData = await uploadRes.json();
      const uploadedUrl = uploadData.file.url;
      
      if (activeSlot === 0) {
        const updateRes = await fetch(API.USERS.UPDATE_PROFILE, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ displayPictureUrl: uploadedUrl })
        });
        if (updateRes.ok) {
          setUser(prev => ({ ...prev, displayPictureUrl: uploadedUrl }));
        }
      } else {
        const order = activeSlot - 1;
        const photoRes = await fetch(API.USERS.ADD_PHOTO, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ url: uploadedUrl, order })
        });
        if (photoRes.ok) {
          setUser(prev => {
            const currentPhotos = prev.photos || [];
            const existingIndex = currentPhotos.findIndex(p => p.order === order);
            const newPhotos = [...currentPhotos];
            if (existingIndex > -1) {
              newPhotos[existingIndex] = { ...newPhotos[existingIndex], url: uploadedUrl };
            } else {
              newPhotos.push({ url: uploadedUrl, order });
              newPhotos.sort((a, b) => a.order - b.order);
            }
            return { ...prev, photos: newPhotos };
          });
        }
      }
    } catch (err) {
      console.error('Photo upload error:', err);
      alert('Failed to upload photo. Please try again.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-purple-950 flex items-center justify-center text-white">
        <div className="animate-pulse">Loading Facecard...</div>
      </div>
    );
  }

  const zodiac = getZodiac(user?.dateOfBirth);
  const age = calculateAge(user?.dateOfBirth);
  const firstName = user?.username?.split(' ')[0] || "User";

  return (
    <>
      {view === 'success' ? (
        <FacecardDisplay 
          user={user} 
          firstName={firstName} 
          zodiac={zodiac} 
          age={age} 
          setView={setView} 
          router={router} 
        />
      ) : (
        <FacecardEditor 
          user={user} 
          firstName={firstName} 
          zodiac={zodiac} 
          setView={setView} 
          handleSlotClick={handleSlotClick} 
          setShowSelector={setShowSelector} 
          progress={progress}
          fileInputRef={fileInputRef}
          handleFileChange={handleFileChange}
        />
      )}

      <SelectorOverlay 
        showSelector={showSelector}
        setShowSelector={setShowSelector}
        user={user}
        toggleInterest={toggleInterest}
        toggleValue={toggleValue}
        toggleBrand={toggleBrand}
        allInterests={allInterests}
        allValues={allValues}
        allBrands={allBrands}
        musicQuery={musicQuery}
        setMusicQuery={setMusicQuery}
        musicResults={musicResults}
        searchingMusic={searchingMusic}
        searchMusic={searchMusic}
        selectMusic={selectMusic}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchItems={searchItems}
        isSearchingItems={isSearchingItems}
      />
    </>
  );
}
