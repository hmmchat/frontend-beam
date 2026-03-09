export const calculateProgress = (userData) => {
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

export const getZodiac = (dateStr) => {
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

export const calculateAge = (dateStr) => {
    if (!dateStr) return 0;
    const dob = new Date(dateStr);
    const diff = Date.now() - dob.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
};
