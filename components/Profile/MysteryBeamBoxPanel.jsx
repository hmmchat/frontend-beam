"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API, apiRequest } from "@/lib/api";
import { calculateProgress } from "@/lib/facecard-utils";
import CompletionMeter from "@/components/facecard/CompletionMeter";
import {
  INDIA_STATES,
  isValidIndiaPhone,
  isValidIndiaPincode,
  lookupPincode,
  normalizeIndiaPhone,
} from "@/lib/indiaAddress";

const FACECARD_EDITOR_FROM_PROFILE = "/facecard?view=editor&from=profile";
const PROFILE_FIELDS =
  "username,dateOfBirth,gender,displayPictureUrl,intent,photos,musicPreference,brandPreferences,interests,values";

function ProgressBar({ percent }) {
  const width = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <div className="h-5 border border-white rounded-full p-[3px] border-b-4 w-full">
      <div
        className="h-full bg-white rounded-full transition-all duration-300"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function PrimaryButton({ children, disabled, onClick, type = "button" }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center justify-center gap-3 border border-white px-6 py-3 rounded-[10.986px] text-lg border-b-4 transition ${
        disabled
          ? "opacity-40 cursor-not-allowed"
          : "hover:bg-white hover:text-black active:scale-95"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-left w-full">
      <span className="text-xs text-white/70 font-outfit mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function FacecardLockedGate({ progress, onBack }) {
  const router = useRouter();

  return (
    <div className="flex h-full w-full min-h-0 flex-col items-center overflow-y-auto px-4 py-2 text-center scrollbar-hide md:px-8">
      {onBack}

      <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 pb-8">
        <p className="hidden font-sigmar text-xl font-extrabold text-[#F2AD00] md:block md:text-2xl">
          Mystery Beam Box
        </p>

        <CompletionMeter
          percent={progress}
          size="mobile"
          className="md:hidden"
        />
        <CompletionMeter
          percent={progress}
          size="desktop"
          className="hidden md:flex"
        />

        <button
          type="button"
          onClick={() => router.push(FACECARD_EDITOR_FROM_PROFILE)}
          className="flex w-[min(100%,240px)] items-center justify-center gap-3 rounded-[18px] border-2 border-b-4 border-white/40 px-4 py-4 transition hover:bg-white/5 active:scale-95"
        >
          <img src="/eye.svg" alt="" className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-widest text-white">
            Facecard
          </span>
        </button>

        <p className="font-outfit text-sm text-white/70">
          Hit <span className="text-[#F2AD00]">100%</span> on your Facecard to unlock
        </p>
      </div>
    </div>
  );
}

const inputClass =
  "w-full bg-transparent border border-white/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white";

const emptyAddress = {
  recipientName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  addressLine3: "",
  landmark: "",
  state: "",
  city: "",
  pincode: "",
};

export default function MysteryBeamBoxPanel({ onBack = null }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyAddress);
  const [cityOptions, setCityOptions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [pinLooking, setPinLooking] = useState(false);
  const [facecardProgress, setFacecardProgress] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [seasonResult, meResult] = await Promise.allSettled([
        apiRequest(API.SEASON.GET_MY_SEASON),
        apiRequest(`${API.USERS.GET_ME}?fields=${PROFILE_FIELDS}`),
      ]);

      if (meResult.status === "fulfilled") {
        const user = meResult.value?.user || meResult.value;
        setFacecardProgress(user ? calculateProgress(user) : 0);
      } else {
        console.error("Failed to load face card progress:", meResult.reason);
        setFacecardProgress(0);
      }

      if (seasonResult.status === "fulfilled") {
        setData(seasonResult.value);
      } else {
        console.error("Failed to load season:", seasonResult.reason);
        setError(
          seasonResult.reason?.message || "Failed to load Mystery Beam Box",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (data?.claim && data.uiMode === "REJECTED") {
      setForm({
        recipientName: data.claim.recipientName || "",
        phone: data.claim.phone || "",
        addressLine1: data.claim.addressLine1 || "",
        addressLine2: data.claim.addressLine2 || "",
        addressLine3: data.claim.addressLine3 || "",
        landmark: data.claim.landmark || "",
        state: data.claim.state || "",
        city: data.claim.city || "",
        pincode: data.claim.pincode || "",
      });
    }
  }, [data]);

  const globalPercent = useMemo(() => {
    const y = data?.global?.giftPoolSize || 0;
    const x = data?.global?.approvedCount || 0;
    if (!y) return 0;
    return Math.min(100, Math.round((x / y) * 100));
  }, [data]);

  const tasksDone = (data?.tasks || []).filter((t) => t.completed).length;
  const tasksTotal = (data?.tasks || []).length;

  const onPincodeBlur = async () => {
    if (!isValidIndiaPincode(form.pincode)) return;
    setPinLooking(true);
    const hit = await lookupPincode(form.pincode);
    setPinLooking(false);
    if (!hit) return;
    setForm((prev) => ({
      ...prev,
      state: hit.state || prev.state,
      city: hit.city || prev.city,
    }));
    setCityOptions(hit.cities || []);
  };

  const validateForm = () => {
    if (!form.recipientName.trim()) return "Full name is required";
    if (!isValidIndiaPhone(form.phone)) return "Enter a valid Indian mobile number";
    if (!form.addressLine1.trim()) return "Address line 1 is required";
    if (!form.state) return "Select a state";
    if (!form.city.trim()) return "City is required";
    if (!isValidIndiaPincode(form.pincode)) return "Enter a valid 6-digit pincode";
    return null;
  };

  const submitClaim = async () => {
    const v = validateForm();
    if (v) {
      setError(v);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await apiRequest(API.SEASON.CLAIM, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          phone: normalizeIndiaPhone(form.phone),
          recipientName: form.recipientName.trim(),
          addressLine1: form.addressLine1.trim(),
          addressLine2: form.addressLine2.trim() || null,
          addressLine3: form.addressLine3.trim() || null,
          landmark: form.landmark.trim() || null,
          city: form.city.trim(),
          pincode: form.pincode.trim(),
        }),
      });
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e?.message || "Failed to ship claim");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center text-center px-4">
        {onBack}
        <p className="text-sm text-white/70">Loading Mystery Beam Box…</p>
      </div>
    );
  }

  const progress =
    facecardProgress == null ? 0 : Math.round(Number(facecardProgress) || 0);

  if (progress < 100) {
    return <FacecardLockedGate progress={progress} onBack={onBack} />;
  }

  const uiMode = data?.uiMode || "NO_ACTIVE_SEASON";

  return (
    <div className="flex h-full w-full flex-col items-center text-center px-4 md:px-8 overflow-y-auto min-h-0 scrollbar-hide py-2">
      {onBack}

      {error ? (
        <p className="text-sm text-red-300 mb-3 w-full max-w-lg text-left">{error}</p>
      ) : null}

      {(uiMode === "NO_ACTIVE_SEASON" || !data?.season) && (
        <div className="w-full max-w-lg flex flex-col items-center gap-4 mt-6">
          <p className="text-lg font-semibold text-white">Mystery Beam Box</p>
          <p className="text-sm text-white/80 leading-relaxed">
            {data?.holdingMessage ||
              "Wait for the next season — we’re cooking the gifts and the tasks for you."}
          </p>
          <a
            href={data?.instagramUrl || "https://www.instagram.com/beam.place/"}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-[#F2AD00] underline font-outfit"
          >
            Check Instagram @beam.place
          </a>
        </div>
      )}

      {data?.season && uiMode !== "NO_ACTIVE_SEASON" && (
        <>
          {/* Global pool progress */}
          <div className="flex-shrink-0 w-full max-w-lg">
            <p className="text-sm text-white/80">
              {data.season.name} — Mystery Beam Box
            </p>
            <p className="text-sm text-white/60 mt-1 font-outfit">
              {data.global?.approvedCount ?? 0}/{data.global?.giftPoolSize ?? 0}{" "}
              have received gifts
            </p>
            <div className="mt-3 mb-4">
              <ProgressBar percent={globalPercent} />
            </div>
          </div>

          {(uiMode === "IN_PROGRESS" ||
            uiMode === "CLAIM_READY" ||
            uiMode === "ALL_CLAIMED" ||
            uiMode === "REJECTED") &&
            !showForm && (
              <div className="w-full max-w-lg space-y-4 [@media(max-height:768px)]:space-y-2 flex flex-col shrink-0">
                <p className="text-xs text-white/60 font-outfit text-left">
                  Your tasks · {tasksDone}/{tasksTotal} complete
                </p>
                {(data.tasks || []).map((task) => (
                  <div key={task.taskType} className="text-left">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-white">{task.label}</p>
                      <p className="text-xs text-white/70 font-outfit">
                        {task.current}/{task.target}
                      </p>
                    </div>
                    <ProgressBar percent={task.progressPercent} />
                  </div>
                ))}

                {uiMode === "ALL_CLAIMED" ? (
                  <p className="text-sm text-white/80 mt-2">
                    All boxes claimed for this season. Catch the next one!
                  </p>
                ) : null}

                {uiMode === "REJECTED" ? (
                  <div className="text-left border border-white/30 rounded-2xl p-3 mt-2">
                    <p className="text-sm text-white">Address needs an update</p>
                    <p className="text-xs text-white/70 font-outfit mt-1">
                      {data.claim?.rejectMessage ||
                        "Please update your address and try again."}
                    </p>
                  </div>
                ) : null}

                <div className="pt-2">
                  <PrimaryButton
                    disabled={uiMode === "IN_PROGRESS" || uiMode === "ALL_CLAIMED"}
                    onClick={() => {
                      setShowForm(true);
                      setError("");
                    }}
                  >
                    {uiMode === "REJECTED" ? "Update & Ship it" : "Claim beam box"}
                  </PrimaryButton>
                </div>
              </div>
            )}

          {showForm &&
            (uiMode === "CLAIM_READY" || uiMode === "REJECTED") && (
              <div className="w-full max-w-lg space-y-3 text-left pb-6">
                <p className="text-sm text-white text-center mb-2">
                  India shipping address
                </p>
                <Field label="Full name *">
                  <input
                    className={inputClass}
                    value={form.recipientName}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, recipientName: e.target.value }))
                    }
                    placeholder="Recipient full name"
                  />
                </Field>
                <Field label="Mobile (+91) *">
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, phone: e.target.value }))
                    }
                    placeholder="10-digit mobile"
                  />
                </Field>
                <Field label="Address line 1 *">
                  <input
                    className={inputClass}
                    value={form.addressLine1}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, addressLine1: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Address line 2">
                  <input
                    className={inputClass}
                    value={form.addressLine2}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, addressLine2: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Address line 3 (optional)">
                  <input
                    className={inputClass}
                    value={form.addressLine3}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, addressLine3: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Landmark">
                  <input
                    className={inputClass}
                    value={form.landmark}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, landmark: e.target.value }))
                    }
                  />
                </Field>
                <Field label={`Pincode *${pinLooking ? " (looking up…)" : ""}`}>
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    maxLength={6}
                    value={form.pincode}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, pincode: e.target.value }))
                    }
                    onBlur={onPincodeBlur}
                  />
                </Field>
                <Field label="State *">
                  <select
                    className={`${inputClass} bg-[#4E0093]`}
                    value={form.state}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, state: e.target.value }))
                    }
                  >
                    <option value="">Select state</option>
                    {INDIA_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="City / District *">
                  {cityOptions.length > 0 ? (
                    <select
                      className={`${inputClass} bg-[#4E0093]`}
                      value={form.city}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, city: e.target.value }))
                      }
                    >
                      <option value="">Select city</option>
                      {cityOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className={inputClass}
                      value={form.city}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, city: e.target.value }))
                      }
                      placeholder="City or district"
                    />
                  )}
                </Field>
                <PrimaryButton disabled={submitting} onClick={submitClaim}>
                  {submitting ? "Shipping…" : "Ship it"}
                </PrimaryButton>
                <button
                  type="button"
                  className="w-full text-sm text-white/60 underline font-outfit"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
              </div>
            )}

          {uiMode === "PENDING" && (
            <div className="w-full max-w-lg mt-4 space-y-3">
              <p className="text-lg font-semibold text-white">Waiting for approval</p>
              <p className="text-sm text-white/70 font-outfit">
                We got your address. Our team is reviewing it — hang tight.
              </p>
            </div>
          )}

          {uiMode === "APPROVED" && (
            <div className="w-full max-w-lg mt-4 space-y-3">
              <p className="text-lg font-semibold text-white">Preparing to ship</p>
              <p className="text-sm text-white/70 font-outfit">
                You’re in! We’re packing your Mystery Beam Box.
              </p>
            </div>
          )}

          {(uiMode === "GIFT_SENT" || uiMode === "SEASON_TEASER") && (
            <div className="w-full max-w-lg mt-4 space-y-4">
              {uiMode === "GIFT_SENT" && data.claim?.trackingNumber ? (
                <div className="border border-white/40 rounded-2xl p-4 text-left">
                  <p className="text-sm text-white">Gift sent</p>
                  <p className="text-xs text-white/70 font-outfit mt-2">
                    Courier: {data.claim.courierName || "—"}
                  </p>
                  <p className="text-sm text-white mt-1 break-all">
                    Tracking: {data.claim.trackingNumber}
                  </p>
                </div>
              ) : null}
              <p className="text-lg font-semibold text-white">
                Get ready for season 2
              </p>
              <p className="text-sm text-white/70 font-outfit leading-relaxed">
                Wait for the next season for more cool Beam Box drops. Check
                Instagram for updates and extra diamonds.
              </p>
              <a
                href={data.instagramUrl || "https://www.instagram.com/beam.place/"}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-sm text-[#F2AD00] underline font-outfit"
              >
                @beam.place on Instagram
              </a>
            </div>
          )}
        </>
      )}

      <div className="mt-auto pt-6 [@media(max-height:768px)]:pt-3 text-sm text-white/70 space-y-3 text-left w-full max-w-lg shrink-0 pb-4">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 flex items-center justify-center border border-white rounded-full text-lg leading-none">
            ?
          </span>
          <div>
            <p className="font-medium text-white">How do I unlock a box?</p>
            <p className="text-white/80 text-xs font-outfit">
              Complete the season tasks, then Ship it with an India address.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
