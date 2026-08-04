/** Indian states / UTs for address dropdowns */
export const INDIA_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export function normalizeIndiaPhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export function isValidIndiaPhone(raw) {
  return /^[6-9]\d{9}$/.test(normalizeIndiaPhone(raw));
}

export function isValidIndiaPincode(raw) {
  return /^[1-9]\d{5}$/.test(String(raw || "").trim());
}

/**
 * Lookup pincode via India Post public API (best-effort).
 * Returns { state, city, offices } or null.
 */
export async function lookupPincode(pincode) {
  if (!isValidIndiaPincode(pincode)) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const block = Array.isArray(data) ? data[0] : null;
    if (!block || block.Status !== "Success" || !block.PostOffice?.length) {
      return null;
    }
    const offices = block.PostOffice;
    const cities = [
      ...new Set(offices.map((o) => o.District || o.Block || o.Name).filter(Boolean)),
    ];
    return {
      state: offices[0].State || "",
      city: cities[0] || offices[0].District || "",
      cities,
      offices,
    };
  } catch {
    return null;
  }
}
