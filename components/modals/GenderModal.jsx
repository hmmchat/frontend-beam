"use client";

import { useState, useEffect } from "react";
import Button from "../ui/Button";
import { API, apiRequest } from "@/lib/api";
import { IoMdArrowBack } from "react-icons/io";

const MALE_COST = Number(process.env.NEXT_PUBLIC_MALE_FILTER_COST);
const FEMALE_COST = Number(process.env.NEXT_PUBLIC_FEMALE_FILTER_COST);
const NON_BINARY_COST = Number(process.env.NEXT_PUBLIC_NON_BINARY_FILTER_COST);

const defaultFilters = [
  { gender: "ALL", label: "All Genders", cost: 0 },
  { gender: "MALE", label: "Male", cost: MALE_COST },
  { gender: "FEMALE", label: "Female", cost: FEMALE_COST },
  { gender: "NON_BINARY", label: "Non-binary", cost: NON_BINARY_COST }
];

export default function GenderModal({ isOpen, onClose, userCoins: externalUserCoins, onCoinsUpdated, onStartBeaming }) {
  const [selectedGender, setSelectedGender] = useState("ALL");
  const [initialGender, setInitialGender] = useState("ALL");
  const [coinsPerScreen, setCoinsPerScreen] = useState(20);
  const [screensPerPurchase, setScreensPerPurchase] = useState(10);
  const [filters, setFilters] = useState(defaultFilters);
  const [loading, setLoading] = useState(false);
  const [internalUserCoins, setInternalUserCoins] = useState(25500);

  const userCoins = externalUserCoins !== undefined ? externalUserCoins : internalUserCoins;

  useEffect(() => {
    if (isOpen) {
      fetchFilters();
      if (externalUserCoins === undefined) {
        fetchUserCoins();
      }
    }
  }, [isOpen, externalUserCoins]);

  const fetchUserCoins = async () => {
    try {
      const data = await apiRequest(API.WALLET.GET_BALANCE);
      if (data && typeof data.balance === "number") {
        setInternalUserCoins(data.balance);
      } else if (data && typeof data.balance === "string") {
        setInternalUserCoins(Number(data.balance));
      }
    } catch (error) {
      console.error("Error fetching user coins:", error);
    }
  };

  const fetchFilters = async () => {
    try {
      // GET /gender-filters — authenticated via JWT, no userId param
      const data = await apiRequest(API.DISCOVERY.GENDER_FILTERS);

      const coinsPer = data && data.coinsPerScreen !== undefined ? data.coinsPerScreen : (data && data.coinsperScreen !== undefined ? data.coinsperScreen : 200);
      const screensPer = data && data.screensPerPurchase !== undefined ? data.screensPerPurchase : 10;
      setCoinsPerScreen(coinsPer);
      setScreensPerPurchase(screensPer);

      if (data && data.availableFilters && data.availableFilters.length > 0) {
        const apiFilters = data.availableFilters;
        const hasNonBinary = apiFilters.some(f => f.gender === "NON_BINARY");

        // Add Non-binary if not present
        if (!hasNonBinary) {
          apiFilters.push({
            gender: "NON_BINARY",
            label: "Non-binary",
            cost: coinsPer
          });
        }

        // Override costs with backend values
        const updatedFilters = apiFilters.map(f => {
          if (f.gender === "MALE") return { ...f, cost: coinsPer };
          if (f.gender === "FEMALE") return { ...f, cost: coinsPer };
          if (f.gender === "NON_BINARY") return { ...f, cost: coinsPer };
          if (f.gender === "ALL") return { ...f, cost: 0 };
          return f;
        });

        setFilters(updatedFilters);
      } else {
        // Fallback using coinsPer
        const fallbackFilters = [
          { gender: "ALL", label: "All Genders", cost: 0 },
          { gender: "MALE", label: "Male", cost: coinsPer },
          { gender: "FEMALE", label: "Female", cost: coinsPer },
          { gender: "NON_BINARY", label: "Non-binary", cost: coinsPer }
        ];
        setFilters(fallbackFilters);
      }

      if (data && data.currentPreference && data.currentPreference.genders && data.currentPreference.genders.length > 0) {
        setSelectedGender(data.currentPreference.genders[0]);
        setInitialGender(data.currentPreference.genders[0]);
      } else {
        const savedPreference = localStorage.getItem("genderPreference") || "ALL";
        setSelectedGender(savedPreference);
        setInitialGender(savedPreference);
      }
    } catch (error) {
      console.error("Error fetching filters, using defaults:", error);
      // Fallback
      const coinsPer = 200;
      const fallbackFilters = [
        { gender: "ALL", label: "All Genders", cost: 0 },
        { gender: "MALE", label: "Male", cost: coinsPer },
        { gender: "FEMALE", label: "Female", cost: coinsPer },
        { gender: "NON_BINARY", label: "Non-binary", cost: coinsPer }
      ];
      setFilters(fallbackFilters);
      const savedPreference = localStorage.getItem("genderPreference") || "ALL";
      setSelectedGender(savedPreference);
      setInitialGender(savedPreference);
    }
  };

  const handleApply = async () => {
    setLoading(true);
    try {
      await apiRequest(API.DISCOVERY.APPLY_GENDER_FILTER, {
        method: "POST",
        body: JSON.stringify({
          genders: selectedGender === "ALL" ? ["ALL"] : [selectedGender],
        }),
      });

      if (selectedGender !== initialGender) {
        const targetFilter = filters.find(f => f.gender === selectedGender);
        const cost = targetFilter ? targetFilter.cost : 0;
        if (cost > 0 && onCoinsUpdated) {
          onCoinsUpdated(cost);
        }
      }

      localStorage.setItem("genderPreference", selectedGender);
      onClose();
      // Trigger discovery flow after applying filter
      if (onStartBeaming) onStartBeaming();
    } catch (error) {
      console.error("Error applying filter, falling back locally:", error);

      if (selectedGender !== initialGender) {
        const targetFilter = filters.find(f => f.gender === selectedGender);
        const cost = targetFilter ? targetFilter.cost : 0;
        if (cost > 0 && onCoinsUpdated) {
          onCoinsUpdated(cost);
        }
      }

      localStorage.setItem("genderPreference", selectedGender);
      onClose();
      if (onStartBeaming) onStartBeaming();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-6 border border-white/30"
      onClick={onClose}
    >
      <div
        className="relative z-10 w-full h-[60vh] md:h-auto mt-auto md:my-auto max-w-[700px] rounded-t-[36px] md:rounded-[36px] bg-purple-950/40 backdrop-blur-xl p-2 animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="absolute inset-0 bg-[#02004A] -z-50 pointer-events-none rounded-t-[36px] md:rounded-[40px] border border-white/50"
          style={{
            backgroundImage: "url(/assets/mb.jpg)",
            backgroundRepeat: "repeat",
            backgroundSize: "cover",
          }}
        ></div>

        <div className="relative font-[family-name:var(--font-otomanopee)] flex flex-col justify-center p-2 max-w-[650px] mx-auto ">
          <div className="relative z-10 md:px-8 py-10 border-2 border-white/30 rounded-[36px] items-center justify-center ">
            <div className="md:max-w-[340px] w-full mx-auto px-3 md:px-0">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">

                  <h2 className="text-lg ml-2 sm:text-xl font-bold text-white tracking-wide">
                    Select Gender
                  </h2>
                </div>

                {/* Coins display */}

              </div>

              {/* Cards Grid */}
              <div
                className={`grid ${filters.filter((f) => f.gender !== "ALL").length === 3
                  ? "grid-cols-3"
                  : "grid-cols-2"
                  } gap-2 mb-4 text-center items-center justify-center`}
              >
                {filters
                  .filter((f) => f.gender !== "ALL")
                  .map((filter) => {
                    const isDisabled = userCoins < filter.cost;
                    const isSelected = selectedGender === filter.gender;

                    return (
                      <button
                        key={filter.gender}
                        onClick={() => !isDisabled && setSelectedGender(filter.gender)}
                        disabled={isDisabled}
                        className={`p-[2.62px] md:py-3 py-6 rounded-[16.2px] border-[2px] border-b-4 transition h-full flex flex-col items-center justify-center transition-all duration-300 ease-out relative overflow-hidden select-none ${isDisabled
                          ? "border-white/10 bg-white/2 opacity-35 cursor-not-allowed filter grayscale"
                          : isSelected
                            ? "border-yellow-500 bg-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.4)] cursor-pointer"
                            : "border-white/30  hover:border-white/50 cursor-pointer"
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
                          {screensPerPurchase}+ Matches
                        </div>
                        <div className="flex justify-center gap-1 mt-2 text-white text-[14px] sm:text-xs">
                          <img
                            src="/assets/Coin-token.svg"
                            alt=""
                            className="md:w-4 md:h-4 w-5 h-5"
                          />
                          <span className="font-bold">{filter.cost}</span>
                        </div>
                      </button>
                    );
                  })}
              </div>

              {/* All Gender (Free) */}
              {filters
                .filter((f) => f.gender === "ALL")
                .map((filter) => {
                  const isSelected = selectedGender === "ALL";

                  return (
                    <button
                      key="ALL"
                      onClick={() => setSelectedGender("ALL")}
                      className={`justify-between w-full border-2 border-b-4 transition mb-5 inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-[20px] text-base font-semibold transition-all duration-300 ease-out relative overflow-hidden cursor-pointer select-none ${isSelected
                        ? "border-yellow-500 bg-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                        : "border-white/40 bg-white/5 hover:bg-white/10 hover:border-white/50"
                        }`}
                    >
                      <div className="flex items-center justify-between w-full ">
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
                  );
                })}
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
    </div >
  );
}
