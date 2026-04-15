"use client";

import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
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
      setFilters(data.availableFilters || []);

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="400px"
      bottom="0"
      left="0"
      right="0"
    >
      <div className="relative font-[family-name:var(--font-otomanopee)] flex flex-col justify-center p-2">
        {/* Background */}

        <div className="relative z-10 px-34 sm:px-8 py-10 border-2 border-white/30 rounded-[36px] items-center justify-center">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-5">
            Select Gender
          </h2>

          {/* Cards */}
          <div className="grid grid-cols-2 gap-4 mb-4 text-center items-center justify-center">
            {filters
              .filter((f) => f.gender !== "ALL")
              .map((filter) => (
                <button
                  key={filter.gender}
                  onClick={() => setSelectedGender(filter.gender)}
                  className={`p-[2.62px] rounded-[26.2px] border-2 transition ${
                    selectedGender === filter.gender
                      ? "border-purple-500 bg-purple-500/20"
                      : "border-purple-500/30 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="text-3xl sm:text-4xl mb-1">
                    {filter.gender === "FEMALE"
                      ? "👩"
                      : filter.gender === "MALE"
                        ? "🧑"
                        : "🌈"}
                  </div>
                  <div className="text-white font-semibold text-sm">
                    {filter.label}
                  </div>
                  <div className="text-white/60 text-xs mb-2">10+ Matches</div>
                  <div className="flex justify-center gap-1 text-yellow-400 text-sm">
                    <img
                      src="/assets/Coin-token.svg"
                      alt=""
                      className="w-5 h-5"
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
    </Modal>
  );
}
