'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';


export default function FacecardPage() {
  const router = useRouter();
  const [view, setView] = useState('success'); // 'success' or 'editor'
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);
  const [activeSlot, setActiveSlot] = useState(null);

  // Dynamic Data State
  const [allInterests, setAllInterests] = useState([]);
  const [allValues, setAllValues] = useState([]);
  const [allBrands, setAllBrands] = useState([]);
  const [showSelector, setShowSelector] = useState(null); // 'interests' | 'values' | 'brands'

  // Progress Calculation
  const calculateProgress = (userData) => {
    if (!userData) return 0;
    let score = 0;
    if (userData.username) score += 5;
    if (userData.dateOfBirth) score += 5;
    if (userData.gender) score += 5;
    if (userData.intent && userData.intent !== "Here to meet strangers and here to meet strangers and overthink later.") score += 10;
    if (userData.displayPictureUrl) score += 15;
    
    // Photos
    const additionalPhotos = userData.photos?.filter(p => p.url) || [];
    if (additionalPhotos.length >= 1) score += 10;
    if (additionalPhotos.length >= 2) score += 10;

    // Categories
    if (userData.interests?.length >= 3) score += 10;
    else if (userData.interests?.length >= 1) score += 5;

    if (userData.values?.length >= 3) score += 10;
    else if (userData.values?.length >= 1) score += 5;

    if (userData.brandPreferences?.length >= 3) score += 10;
    else if (userData.brandPreferences?.length >= 1) score += 5;

    if (userData.musicPreference) score += 10;
    
    return Math.min(score, 100);
  };

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
          console.log('✅ Facecard: User profile loaded:', data.user);
          console.log('📸 Display Picture URL:', data.user?.displayPictureUrl);
          console.log('📸 Additional Photos:', data.user?.photos);
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
        if (intRes.ok) setAllInterests((await intRes.json()).interests);
        if (valRes.ok) setAllValues((await valRes.json()).values);
        if (brRes.ok) setAllBrands((await brRes.json()).brands);
      } catch (error) {
        console.error('Error fetching choices:', error);
      }
    };

    fetchProfile();
    fetchChoices();
  }, [router]);

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

    // Optimistic update
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

    // Optimistic update
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
      if (current.length >= 5) return; // Limit to 5
      newList = [...current, { brandId, brand: { name, logoUrl } }];
    }

    // Optimistic update
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

  const getZodiac = (dateStr) => {
    if (!dateStr) return { name: "Unknown", symbol: "?" };
    const date = new Date(dateStr);
    const d = date.getDate();
    const m = date.getMonth() + 1;
    if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return { name: "Aries", symbol: "♈" };
    if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return { name: "Taurus", symbol: "♉" };
    if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return { name: "Gemini", symbol: "♊" };
    if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return { name: "Cancer", symbol: "♋" };
    if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return { name: "Leo", symbol: "♌" };
    if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return { name: "Virgo", symbol: "♍" };
    if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return { name: "Libra", symbol: "♎" };
    if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return { name: "Scorpio", symbol: "♏" };
    if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return { name: "Sagittarius", symbol: "♐" };
    if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return { name: "Capricorn", symbol: "♑" };
    if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return { name: "Aquarius", symbol: "♒" };
    return { name: "Pisces", symbol: "♓" };
  };

  const calculateAge = (dateStr) => {
    if (!dateStr) return 0;
    const dob = new Date(dateStr);
    const diff = Date.now() - dob.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  };

  const handleSlotClick = (slotIndex) => {
    setActiveSlot(slotIndex);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 1. Upload to Files Service
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'profile-photos');

      const token = localStorage.getItem('accessToken');
      const uploadRes = await fetch(API.FILES.UPLOAD, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!uploadRes.ok) throw new Error('Upload failed');
      const uploadData = await uploadRes.json();
      const uploadedUrl = uploadData.file.url;
      
      console.log('✅ File uploaded successfully!');
      console.log('📸 Uploaded URL:', uploadedUrl);
      console.log('📦 Full upload response:', uploadData);

      // 2. Update Backend
      if (activeSlot === 0) {
        // Update display picture
        const updateRes = await fetch(API.USERS.UPDATE_PROFILE, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ displayPictureUrl: uploadedUrl })
        });
        if (updateRes.ok) {
          console.log('✅ Display picture updated in backend');
          setUser(prev => ({ ...prev, displayPictureUrl: uploadedUrl }));
        } else {
          console.error('❌ Failed to update display picture:', updateRes.status);
        }
      } else {
        // Add or update photo
        // Slots 1 and 2 in UI correspond to order 0 and 1 in backend
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
          console.log(`✅ Photo order ${order} updated in backend`);
          // Fetch the full profile again to ensure state is in sync with backend
          // (Alternative: update local state manually correctly)
          const updatedPhotoData = await photoRes.json();
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
        } else {
          console.error(`❌ Failed to update photo ${order}:`, photoRes.status);
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

  if (view === 'success') {
    return (
      <div className="max-h-screen gap-4  w-full relative bg-purple-950 text-white outfit-font overflow-hidden flex items-center justify-center p-6" 
           style={{ backgroundImage: "url('/assets/mb.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <section className="flex flex-col items-center justify-center w-full text-center animate-fade-in border-2 border-white/40 h-[100vh] rounded-[3.5rem]">
        <div className="w-full max-w-[1000px] grid gap-12 h-[75vh] mx-auto justify-center items-center ">
          
          {/* Left Pane - Facecard Preview */}
  <div className="relative  border-2 border-white/40 w-[500px] py-2 flex items-center justify-center pl-22   rounded-[3.5rem] ">
            
            {/* Vertical Name + Age - Outer left */}
            <div className="absolute left-10 bottom-0 -translate-y-1/2">
              <span
                className="text-6xl font-black text-yellow-400 tracking-tighter uppercase"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              >
                {firstName}, {age}
              </span>
            </div>

            {/* Phone Frame */}
            <div className="relative w-full max-w-sm aspect-[9/16] rounded-[3.5rem] border-[3px] border-yellow-400/80 overflow-hidden shadow-2xl ">
              <img src={user?.displayPictureUrl || "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1974&auto=format&fit=crop"} className="w-full h-full object-cover" alt="Profile" />
              
              <div className="absolute inset-0 flex flex-col justify-end p-6 ">
                {/* Zodiac Symbol */}
                <div className="absolute right-10 bottom-32 -translate-y-1/2 flex flex-col items-center gap-1">
                  <span className="text-4xl filter drop-shadow-lg">{zodiac.symbol}</span>
                  <span className="text-[10px] uppercase font-bold tracking-[0.3em] opacity-80">{zodiac.name}</span>
                </div>

                {/* Quote Box */}
                <div className="mx-auto mb-6 w-[90%]  px-5 py-6 text-center relative border border-2 border-white/40 rounded-[1rem]">
                  <span className="absolute top-1 left-1/2 -translate-x-1/2 text-white/40 text-5xl font-serif">“</span>
                  <p className="text-xs font-medium leading-relaxed tracking-wide italic">
                    {user?.intent || "Here to meet strangers and here to meet strangers and overthink later."}
                  </p>
                  <span className="absolute bottom-1  left-1/2 -translate-x-1/2 text-white/40 text-5xl font-serif rotate-180">“</span>
                </div>
              </div>
            </div>


          </div>



    
        </div>
</section>

        <section className="flex flex-col items-center justify-center w-full text-center animate-fade-in border-2 border-white/40 h-[100vh] rounded-[3.5rem]">
          <div className="flex flex-col items-center justify-center p-12 text-center ">
             <h1 className="text-5xl font-extrabold mb-6 tracking-tight">Meet your Facecard</h1>
             <p className="max-w-md text-white/70 leading-relaxed mb-16 text-base font-medium">
               This is what people see before meeting you.<br/>
               Adding more details makes it cooler and gets you<br/>
               better matches & conversations.
             </p>

             <div className="space-y-6 w-full max-w-sm">
               <button 
                 onClick={() => setView('editor')}
                 className="w-full py-4 border-2 border-white/30 border-b-4 rounded-2xl text-xl font-bold  hover:bg-yellow-400 hover:text-black hover:border-yellow-400 transition-all duration-300 transform active:scale-95 shadow-xl"
               >
                 Make my Facecard cooler 🤩
               </button>

                <button 
                  onClick={() => router.push('/')}
                  className="w-full text-white/50 text-sm font-medium flex items-center justify-center gap-2 hover:text-white transition-colors"
                >
                  I'll do it later 🥱
                </button>
             </div>
          </div>
          </section>




      </div>
    );
  }



















  return (
    <div className="min-h-screen  w-full relative text-white outfit-font overflow-hidden flex items-center justify-center p-6" 
         style={{ backgroundImage: "url('/assets/mb.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
      
      {/* Outer Glow Card */}
      <div className="w-full max-w-[1150px]   relative   border border-2 border-white/60 rounded-[4rem] p-6  flex gap-10">
        
        {/* Main Editor UI */}
        <div className="flex-1 border border-2 border-white/40 rounded-[3.5rem]  p-8 relative flex flex-col gap-10">
          
          {/* Back Button Area */}
{/* Top Header Row */}
<div className="flex items-start gap-6 ">

  {/* Left: Back + Name */}
{/* Left: Back + Vertical Name */}
<div className="relative flex flex-col items-start ">

  {/* Back Button */}
  <button 
    onClick={() => setView('success')}
    className="w-14 h-14 rounded-full border border-white/80 flex items-center justify-center hover:bg-white/10 transition"
  >
    <span className="text-2xl mb-1">←</span>
  </button>

  {/* Vertical Name Wrapper */}
  <div className="relative h-[264px] w-[70px] flex items-center justify-center">
    
    {/* Rotated content */}
<div className="absolute rotate-[-90deg] whitespace-nowrap px-12 py-2 relative">

  {/* Corner brackets */}
  <span className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/60"></span>
  <span className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/60"></span>
  <span className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/60"></span>
  <span className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/60"></span>

  <h2 className="text-3xl font-black tracking-wide uppercase leading-none text-center">
    {firstName}
  </h2>

  <p className="text-[11px] opacity-40 font-mono tracking-widest uppercase mt-1 text-center">
    USERID: {user?.id?.slice(0, 8)}
  </p>

</div>


  </div>
</div>


  {/* Right: Photo Slots */}
  <div className="flex gap-4  justify-center">

    {/* Slot 1 */}
    <div 
      onClick={() => handleSlotClick(0)}
      className="w-[200px] h-[300px] border-b-6 rounded-[2.5rem] border border-2 border-white/50 overflow-hidden relative cursor-pointer"
    >
      <img
        src={user?.displayPictureUrl || "/imageprofile.png"}
        className="w-full h-full object-cover"
        alt="Photo 1"
      />
      <button className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center text-sm shadow-lg">
        ✎
      </button>
    </div>

    {/* Slot 2 (Photo Order 0) */}
    <div 
      onClick={() => handleSlotClick(1)}
      className="w-[200px] border-b-6 h-[300px] border-white/50 rounded-[2.5rem] border-2 border-white/20 flex items-center justify-center relative overflow-hidden cursor-pointer bg-white/5 hover:bg-white/10 transition-colors"
    >
      {user?.photos?.find(p => p.order === 0)?.url ? (
        <img src={user.photos.find(p => p.order === 0).url} className="w-full h-full object-cover" alt="Photo 2" />
      ) : (
        <span className="text-5xl opacity-60 border border-4 border-white/80 rounded-full px-3">+</span>
      )}
    </div>

    {/* Slot 3 (Photo Order 1) */}
    <div 
      onClick={() => handleSlotClick(2)}
      className="w-[200px] border-b-6 h-[300px] border-white/50 rounded-[2.5rem] border-2 border-white/20 flex items-center justify-center relative overflow-hidden cursor-pointer bg-white/5 hover:bg-white/10 transition-colors"
    >
      {user?.photos?.find(p => p.order === 1)?.url ? (
        <img src={user.photos.find(p => p.order === 1).url} className="w-full h-full object-cover" alt="Photo 3" />
      ) : (
        <span className="text-5xl opacity-60 border border-4 border-white/80 rounded-full px-3">+</span>
      )}
    </div>

    {/* Hidden File Input */}
    <input 
      type="file"
      ref={fileInputRef}
      onChange={handleFileChange}
      accept="image/*"
      className="hidden"
    />

  </div>
</div>


          {/* Info Sections Area */}
          <div className="grid grid-cols-10 gap-10 items-center">
            
            {/* DOB & Gender Text Labels */}
       <div className="col-span-3 space-y-14">

  {/* DOB + Zodiac */}
  <div className="relative px-5 py-5">
    {/* Corners */}
    <span className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/40"></span>
    <span className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/40"></span>
    <span className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/40"></span>
    <span className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/40"></span>

    <p className="text-[9px] uppercase tracking-widest opacity-80">
      DOB : {user?.dateOfBirth
        ? new Date(user.dateOfBirth).toLocaleDateString("en-GB")
        : "22/08/1998"}
    </p>
    <p className="text-[9px] uppercase tracking-widest opacity-80 mt-1">
      Zodiac : {zodiac.name}
    </p>
  </div>

  {/* Gender */}
  <div className="relative px-4 py-5">
    {/* Corners */}
    <span className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/40"></span>
    <span className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/40"></span>
    <span className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/40"></span>
    <span className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/40"></span>

    <p className="text-[9px] uppercase tracking-widest opacity-80">
      Gender Identity
    </p>
    <p className="text-[9px] uppercase tracking-widest opacity-80 mt-1">
      {user?.gender || "Female"}
    </p>
  </div>

  {/* Brands */}
  <div className="relative px-4 py-5">
    {/* Corners */}
    <span className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/40"></span>
    <span className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/40"></span>
    <span className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/40"></span>
    <span className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/40"></span>

    <p className="text-[9px] font-bold uppercase tracking-widest">
      Brands
    </p>
    <p className="text-[9px] uppercase tracking-tight opacity-50 mt-1">
      Can't live w/o 'em
    </p>
  </div>

</div>


            {/* Icon Pills & Brand Grid */}
            <div className="col-span-7 space-y-12 mb-2">
              
                <div className="flex items-center gap-4">
                  {/* Icon box */}
                  <div className="w-20 h-20 rounded-2xl border border-white/80 flex items-center justify-center text-4xl shadow-inner">
                    {zodiac.symbol}
                  </div>

                  {/* Main pill */}
                  <div 
                    onClick={() => setShowSelector('interests')}
                    className="flex-1 h-16 rounded-full border border-white/60 px-8 flex items-center justify-between cursor-pointer hover:bg-white/5 transition"
                  >
                    <span className="text-sm opacity-60 tracking-wide">Interests:</span>
                    <span className="text-sm opacity-90 truncate max-w-[150px]">
                      {user?.interests?.map(i => i.interest?.name).join(', ') || 'Basketball, Music...'}
                    </span>
                  </div>

                  {/* Plus button */}
                  <button 
                    onClick={() => setShowSelector('interests')}
                    className="w-18 h-18 rounded-2xl border border-white/80 flex items-center justify-center text-3xl transition hover:bg-white/10"
                  >+</button>
                </div>

                <div className="flex items-center gap-4">
                  {/* Icon box */}
                  <div className="w-20 h-20 rounded-2xl border border-white/80 flex items-center justify-center text-3xl shadow-inner">
                    {user?.gender === 'MALE' ? '♂' : user?.gender === 'FEMALE' ? '♀' : '⚧'}
                  </div>

                  {/* Main pill */}
                  <div 
                    onClick={() => setShowSelector('values')}
                    className="flex-1 h-16 rounded-full border border-white/50 px-8 flex items-center justify-between cursor-pointer hover:bg-white/5 transition"
                  >
                    <span className="text-sm opacity-60 tracking-wide">Causes:</span>
                    <span className="text-sm opacity-90 italic truncate max-w-[150px]">
                      {user?.values?.map(v => v.value?.name).join(', ') || 'Environment, Equality...'}
                    </span>
                  </div>

                  {/* Plus button */}
                  <button 
                    onClick={() => setShowSelector('values')}
                    className="w-18 h-18 rounded-2xl border border-white/80  flex items-center justify-center text-3xl  transition hover:bg-white/10"
                  >+</button>
                </div>

               {/* Brand Icons Row */}
           <div className="flex gap-6 mt-5 overflow-x-auto scrollbar-hide">
             {[0, 1, 2, 3, 4].map(i => {
               const selection = user?.brandPreferences?.[i];
               return (
                 <div 
                   key={i} 
                   onClick={() => setShowSelector('brands')}
                   className={`relative w-20 h-20 rounded-2xl border border-2 border-b-6 border-white/50 flex items-center justify-center shadow-inner cursor-pointer transition-all hover:scale-105 ${selection ? 'bg-white/10' : 'bg-transparent'}`}
                 >
                   {selection ? (
                     <img 
                       src={selection.brand?.logoUrl || `https://ui-avatars.com/api/?name=${selection.brand?.name}&background=random&color=fff`} 
                       alt={selection.brand?.name} 
                       className="w-12 h-12 object-contain"
                     />
                   ) : (
                     <span className="text-white/30 text-2xl relative z-10">+</span>
                   )}
                 </div>
               );
             })}
           </div>

            </div>
          </div>
        </div>

        {/* Right Side Info Col */}
        <div className="w-72 flex flex-col gap-10 py-6 pr-4">
            
            {/* Progress Area */}
            <div className="flex flex-col items-center gap-6">
               <div className="relative w-48 h-48">
                  {/* Outer Glow Circle */}
                  <div className="absolute inset-0 rounded-full border-[10px] border-white/5"></div>
                  <div className="absolute inset-0 rounded-full border-[12px] border-yellow-400 opacity-20 blur-xl scale-110"></div>
                  
                  {/* Neon Progress Path */}
                  <svg className="w-full h-full drop-shadow-[0_0_15px_rgba(255,200,0,0.5)]" viewBox="0 0 100 100">
                    <circle className="text-white/10" strokeWidth="6" cx="50" cy="50" r="44" fill="transparent" stroke="currentColor"></circle>
                    <circle 
                        className="text-yellow-400 transition-all duration-1000" 
                        strokeWidth="8" 
                        strokeLinecap="round" 
                        cx="50" 
                        cy="50" 
                        r="44" 
                        fill="transparent" 
                        stroke="currentColor" 
                        strokeDasharray="276" 
                        strokeDashoffset={276 - (276 * (progress / 100))} 
                        transform="rotate(-90 50 50)"
                    ></circle>
                  </svg>
                  
                  <div className="absolute inset-0 flex items-end justify-center mb-18">
                    <span className="text-5xl font-black text-white/90">{progress}<span className="text-xl opacity-40 ml-1">%</span></span>
                  </div>
               </div>

               {/* Eye Facecard button */}
               <button className="w-full py-4 border-2 border-white/30 rounded-3xl flex items-center justify-center gap-3 hover:bg-white/5 transition font-bold tracking-widest uppercase text-xs">
                  <span className="text-lg">👁</span> Facecard
               </button>
            </div>

            {/* Music Section */}
            <div className="flex-1 flex flex-col items-center  gap-6 relative">
                {/* Decorative Dots */}
              
                <div className="relative w-44 h-44 group">
                    {/* Outer rotating ring */}
                    <div className="absolute inset-0 rounded-full border-[3px] border-white/20 animate-spin-slow"></div>
                    {/* Inner rotating album art */}
                    <div className="absolute inset-2 rounded-full overflow-hidden animate-spin-slow border-2 border-white/10 shadow-2xl">
                        <img 
                          src="/spotify1.png" 
                          className="w-full h-full object-cover rounded-full opacity-90 group-hover:opacity-100 transition-opacity" 
                          alt="Album Art" 
                        />
                    </div>
                    {/* Center hole effect */}
                    <div className="absolute inset-[4.5rem] bg-black/40 rounded-full border border-white/20 z-10 flex items-center justify-center shadow-inner backdrop-blur-md">
                       <div className="w-4 h-4 rounded-full bg-white/20 border border-white/40"></div>
                    </div>
                </div>

      <div className="relative w-full py-6 flex justify-center">
        <div className="relative px-16 py-4 text-center text-white">
    
    {/* Top Left */}
    <span className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/60" />
    <span className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/60" />
    <span className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/60" />
    <span className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/60" />

    <p className="text-sm font-medium">Starboy</p>
    <p className="text-xs opacity-60">The Weeknd</p>
  </div>
</div>







                {/* Footer text */}
                  <div className=" grid grid-cols-12 gap-1 opacity-70">
                   {[...Array(36)].map((_, i) => <div key={i} className="w-1 h-1 bg-white rounded-full"></div>)}
                </div>


            </div>
        </div>

      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out forwards;
        }
        .animate-spin-slow {
          animation: spin-slow 15s linear infinite;
        }
      `}</style>

      {/* NEW Full-Page Selector View (Mobile/Phone Style) */}
      {showSelector && (
        <div 
          className="fixed inset-0 z-[100] bg-purple-950 flex flex-col animate-fade-in overflow-y-auto"
          style={{ backgroundImage: "url('/assets/mb.jpg')", backgroundSize: 'cover', backgroundAttachment: 'fixed' }}
        >
          <div className="w-full max-w-2xl mx-auto px-6 py-12 flex flex-col gap-10">
            
            {/* Header Area */}
            <div className="space-y-8">
              <button 
                onClick={() => setShowSelector(null)}
                className="w-14 h-14 rounded-full border border-white/40 flex items-center justify-center bg-white/5 backdrop-blur-md hover:bg-white/10 transition shadow-xl"
              >
                <span className="text-2xl text-white">←</span>
              </button>

              <div className="space-y-4">
                <h1 className="text-4xl font-extrabold tracking-tight capitalize">{showSelector}</h1>
                <p className="text-white/80 leading-relaxed text-sm max-w-md">
                  {showSelector === 'interests' && "Select things you love to do. These help us find people who share your passions and give you something to yap about!"}
                  {showSelector === 'values' && "Select what you care about. These values help connect you with people who share your vision of the world."}
                  {showSelector === 'brands' && "Select your favorite brands. These show what you're into and help find people with similar tastes."}
                </p>
              </div>
            </div>

            {/* Content List */}
            <div className="space-y-12 pb-20">
              {/* Grouping for Interests (Mock Categories for UI matching) */}
              {showSelector === 'interests' ? (
                <>
                  {[
                    { name: "Sports", items: allInterests.filter(i => ["Sports", "Fitness", "Yoga", "Cycling"].includes(i.name)) },
                    { name: "Lifestyle", items: allInterests.filter(i => ["Travel", "Photography", "Reading", "Cooking", "Food"].includes(i.name)) },
                    { name: "Creative & Tech", items: allInterests.filter(i => ["Art", "Dancing", "Writing", "Technology", "Gaming", "Music", "Singing"].includes(i.name)) },
                  ].map(group => (
                    <div key={group.name} className="space-y-5">
                      <h2 className="text-xl font-bold opacity-90">{group.name}</h2>
                      <div className="flex flex-wrap gap-3">
                        {group.items.map(item => {
                          const isSelected = user?.interests?.some(i => i.interestId === item.id);
                          return (
                            <button
                              key={item.id}
                              onClick={() => toggleInterest(item.id, item.name)}
                              className={`flex items-center gap-2 px-6 py-3 rounded-2xl border transition-all duration-300 transform active:scale-95 ${
                                isSelected 
                                  ? 'bg-yellow-400 text-black border-yellow-400 font-bold shadow-[0_0_15px_rgba(250,204,21,0.4)]' 
                                  : 'bg-white/5 text-white border-white/20 hover:border-white/40'
                              }`}
                            >
                              <span className="text-sm uppercase tracking-wide">{item.name}</span>
                              <span className="text-lg leading-none">{isSelected ? '✕' : '+'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {(showSelector === 'values' ? allValues : allBrands).map(item => {
                    const isSelected = showSelector === 'values' 
                      ? user?.values?.some(v => v.valueId === item.id)
                      : user?.brandPreferences?.some(b => b.brandId === item.id);
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (showSelector === 'values') toggleValue(item.id, item.name);
                          else toggleBrand(item.id, item.name, item.logoUrl);
                        }}
                        className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all duration-300 transform active:scale-95 ${
                          isSelected 
                            ? 'bg-yellow-400 text-black border-yellow-400 font-bold shadow-[0_0_15px_rgba(250,204,21,0.4)]' 
                            : 'bg-white/5 text-white border-white/20 hover:border-white/40'
                        }`}
                      >
                        {item.logoUrl && <img src={item.logoUrl} alt="" className="w-5 h-5 object-contain" />}
                        <span className="text-sm uppercase tracking-wide">{item.name}</span>
                        <span className="text-lg leading-none">{isSelected ? '✕' : '+'}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Floating Bottom Bar (Optional but good for UX) */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-sm px-6">
              <button 
                onClick={() => setShowSelector(null)}
                className="w-full py-4 bg-yellow-400 text-black rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
