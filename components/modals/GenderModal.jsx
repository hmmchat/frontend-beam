"use client";

import { useState, useEffect } from "react";

import Button from "../ui/Button";
import { API, apiRequest } from "@/lib/api";
import { IoMdArrowBack } from "react-icons/io";

export default function GenderModal({ isOpen, onClose }) {
  const [selectedGender, setSelectedGender] = useState("ALL");
  const [filters, setFilters] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFilters();
    }
  }, [isOpen]);

  const fetchFilters = async () => {
    try {
      // GET /gender-filters — authenticated via JWT, no userId param
      const data = await apiRequest(API.DISCOVERY.GENDER_FILTERS);
const apiFilters = data.availableFilters || [];

const hasNonBinary = apiFilters.some(f => f.gender === "NON_BINARY");

if (!hasNonBinary) {
  apiFilters.push({
    gender: "NON_BINARY",
    label: "Non-binary",
    cost: 200
  });
}

setFilters(apiFilters);

      if (data.currentPreference) {
        setSelectedGender(data.currentPreference.genders[0]);
      } else {
        setSelectedGender("ALL");
      }
    } catch (error) {
      console.error("Error fetching filters:", error);
    }
  };

  const handleApply = async () => {
    setLoading(true);
    try {
      // POST /gender-filters/apply — authenticated via JWT
      await apiRequest(API.DISCOVERY.APPLY_GENDER_FILTER, {
        method: "POST",
        body: JSON.stringify({
          genders: selectedGender === "ALL" ? null : [selectedGender],
        }),
      });
      onClose();
    } catch (error) {
      console.error("Error applying filter:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
<div
  className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-6 bg-black/30 bg-blur-sm"
  onClick={onClose}
>
        
 
      <div
       className="relative z-10 w-full h-[60vh] md:h-auto mt-auto md:my-auto max-w-[700px] rounded-t-[36px] md:rounded-[36px] bg-purple-950/40 backdrop-blur-xl p-2 animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >

          <div
        className="absolute inset-0 bg-[#02004A] -z-50 pointer-events-none rounded-t-[36px] md:rounded-[40px]"
        style={{
          backgroundImage: "url(/assets/mb.jpg)",
          backgroundRepeat: "repeat",
          backgroundSize: "cover",
        }}
      ></div>
        <div className="relative font-[family-name:var(--font-otomanopee)] flex flex-col justify-center p-2  max-w-[650px] mx-auto">
          {/* Background */}

          <div className="relative z-10 md:px-8 py-10 border-2 border-white/30 rounded-[36px] items-center justify-center ">




<div className="md:max-w-[300px] w-[340px] mx-auto">

            <div className="flex items-center mb-5">
              <button 
                onClick={onClose} 
                className="md:hidden text-white p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Go back"
              >
                <IoMdArrowBack className="text-2xl" />
              </button>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                Select Gender
              </h2>
            </div>

            {/* Cards */}
            <div
              className={`grid ${
                filters.filter((f) => f.gender !== "ALL").length === 3
                  ? "grid-cols-3"
                  : "grid-cols-2"
              } gap-2 mb-4 text-center items-center justify-center`}
            >
              {filters
                .filter((f) => f.gender !== "ALL")
                .map((filter) => (
                  < button classname = "inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-2xl text-base font-semibold border-2 transition-all duration-300 ease-out relative overflow-hidden" 
                    key={filter.gender}
                    onClick={() => setSelectedGender(filter.gender)}
                    className={`p-[2.62px]  md:py-3 py-6 rounded-[16.2px] border-[2px] border-b-4 border-white/50 transition h-full flex flex-col items-center justify-center ${
                      selectedGender === filter.gender
                        ? "border-white bg-purple-500/20"
                        : "border-white/30 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="text-4xl sm:text-4xl mb-1 flex justify-center items-center h-12">
  {filter.gender === "FEMALE" ? (
    "👩"
  ) : filter.gender === "MALE" ? (
    "🧑"
  ) : filter.gender === "NON_BINARY" ? (
    <img
      src="/nonbinary.png"
      alt="non-binary"
      className="w-10 h-10 object-contain"
    />
  ) : (
    "🌈"
  )}
</div>
                    <div className="text-white font-semibold text-[11px] sm:text-xs line-clamp-1 px-1">
                      {filter.label}
                    </div>
                    <div className="text-white/60 font-outfit text-[10px] sm:text-[10px] mb-1">
                      10+ Matches
                    </div>
                    <div className="flex justify-center gap-1  mt-2  text-white text-[14px] sm:text-xs">
                      <img
                        src="/assets/Coin-token.svg"
                        alt=""
                        className="md:w-4 md:h-4 w-5 h-5"
                      />
                      <span className="font-bold">{filter.cost}</span>
                    </div>
                  </button>
                ))}
            </div>

            {/* All Gender (Free) */}
            {filters
              .filter((f) => f.gender === "ALL")
              .map((filter) => (
                <button
                  key="ALL"
                  onClick={() => setSelectedGender("ALL")}
                  className={`justify-between w-full  border-2 border-b-4 border-white/50 transition mb-5 inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-[20px] text-base font-semibold border-2 transition-all duration-300 ease-out relative overflow-hidden ${
                    selectedGender === "ALL"
                      ? "border-white/30 bg-white/5 hover:bg-white/10"
                      : "border-white/30 "
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">👩🧑</span>
                      <span className="text-white font-semibold text-sm">
                        {filter.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold text-sm font-outfit">
                        Free
                      </span>
                    </div>
                  </div>
                </button>
              ))}
          </div>

</div>





          {/* CTA */}
          <div className="flex justify-end items-center p-4">
            <Button
              variant="outline2"
              width="auto"
              position="none"
              onClick={handleApply}
              disabled={loading}
            >
              {loading ? "Saving..." : "Start Beaming"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
