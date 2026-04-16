"use client";

import { useState, useEffect } from "react";

import Button from "../ui/Button";
import { API, apiRequest } from "@/lib/api";

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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-blur-sm bg-black/30"
      onClick={onClose}
    >
    
        
 
      <div
        className="relative z-10 w-full h-[60vh] my-auto max-w-[700px] border-2 border-white/30 rounded-[40px] bg-purple-950/40 backdrop-blur-xl p-2 animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >

          <div
        className="absolute inset-0 bg-[#02004A] -z-50 pointer-events-none rounded-[40px]"
        style={{
          backgroundImage: "url(/assets/mb.jpg)",
          backgroundRepeat: "repeat",
          backgroundSize: "cover",
        }}
      ></div>
        <div className="relative font-[family-name:var(--font-otomanopee)] flex flex-col justify-center p-2  max-w-[650px] mx-auto">
          {/* Background */}

          <div className="relative z-10 px-10 sm:px-8 py-10 border-2 border-white/30 rounded-[36px] items-center justify-center ">




<div className="max-w-[300px] mx-auto">

            <h2 className="text-lg sm:text-xl font-bold text-white mb-5 ">
              Select Gender
            </h2>

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
                  <button
                    key={filter.gender}
                    onClick={() => setSelectedGender(filter.gender)}
                    className={`p-[2.62px] py-3 rounded-[16.2px] border-[1px] border-b-4 border-white/50 transition h-full flex flex-col items-center justify-center ${
                      selectedGender === filter.gender
                        ? "border-white bg-purple-500/20"
                        : "border-white/30 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="text-3xl sm:text-4xl mb-1 flex justify-center items-center h-12">
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
                    <div className="text-white font-semibold text-[10px] sm:text-xs line-clamp-1 px-1">
                      {filter.label}
                    </div>
                    <div className="text-white/60 text-[8px] sm:text-[10px] mb-1">
                      10+ Matches
                    </div>
                    <div className="flex justify-center gap-1 text-yellow-400 text-[10px] sm:text-xs">
                      <img
                        src="/assets/Coin-token.svg"
                        alt=""
                        className="w-4 h-4"
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
                <Button
                  key="ALL"
                  variant="outline2"
                  onClick={() => setSelectedGender("ALL")}
                  className={`justify-between w-full rounded-xl border-2 transition mb-5 ${
                    selectedGender === "ALL"
                      ? "border-purple-500 bg-purple-500/30"
                      : "border-purple-500/30 bg-white/5 hover:bg-white/10"
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
                      <span className="text-green-400 font-semibold text-sm">
                        Free
                      </span>
                    </div>
                  </div>
                </Button>
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
