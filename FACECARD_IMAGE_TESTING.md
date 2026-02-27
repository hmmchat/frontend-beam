# Facecard Image Display Testing Guide

## How to Test if Images are Visible on Facecard Page

### Step 1: Open Browser Console
1. Go to http://localhost:3000/facecard
2. Open browser DevTools (F12 or Right-click → Inspect)
3. Go to **Console** tab

### Step 2: Check Console Logs
Look for these console messages I just added:

#### ✅ **Profile Loaded Successfully**
```
✅ Facecard: User profile loaded: {username: "...", displayPictureUrl: "...", ...}
📸 Display Picture URL: https://f005.backblazeb2.com/file/aiofhtheworlsgif/profile-photos/...
📸 Additional Photos: [{url: "...", order: 1}, ...]
```

#### ❌ **Profile Load Failed**
```
❌ Failed to fetch profile: 404
```
or
```
Error fetching profile: TypeError: Failed to fetch
```

### Step 3: Check Network Tab
1. Go to **Network** tab in DevTools
2. Look for requests to:
   - `http://localhost:3002/users/...` (should return 200 OK)
   - `https://f005.backblazeb2.com/file/aiofhtheworlsgif/...` (image requests)

#### What to Check:
- ✅ User API returns 200 OK
- ✅ Image URLs start with `https://f005.backblazeb2.com/file/aiofhtheworlsgif/`
- ✅ Image requests return 200 OK (not 404 or CORS errors)

### Step 4: Check Image Elements
In the **Elements** tab, search for `<img` tags:

```html
<!-- Main display picture -->
<img src="https://f005.backblazeb2.com/file/aiofhtheworlsgif/profile-photos/user123/..." 
     class="w-full h-full object-cover" 
     alt="Profile">

<!-- Additional photos -->
<img src="https://f005.backblazeb2.com/file/aiofhtheworlsgif/profile-photos/user123/..." 
     class="w-full h-full object-cover" 
     alt="Photo 2">
```

### Step 5: Test Image Upload
1. Click on any photo slot (the boxes with + sign or existing photos)
2. Select an image file
3. Check console for:

```
✅ File uploaded successfully!
📸 Uploaded URL: https://f005.backblazeb2.com/file/aiofhtheworlsgif/profile-photos/...
📦 Full upload response: {success: true, file: {...}}
✅ Display picture updated in backend
```

### Step 6: Verify Image Visibility

#### ✅ **Images ARE Visible If:**
- You can see the uploaded photos in the photo slots
- No broken image icons (🖼️ with X)
- Images load and display correctly
- Console shows Backblaze B2 URLs

#### ❌ **Images NOT Visible If:**
- Broken image icons appear
- Console shows 404 errors for image URLs
- CORS errors in console
- Images show placeholder/default images only

## Common Issues & Solutions

### Issue 1: Images Not Loading (404 Error)
**Symptom:** Console shows `404 Not Found` for Backblaze URLs

**Solution:**
1. Check if bucket `aiofhtheworlsgif` is set to **Public** in Backblaze B2
2. Verify public URL format: `https://f005.backblazeb2.com/file/aiofhtheworlsgif/`
3. Check if files actually exist in Backblaze B2 console

### Issue 2: CORS Error
**Symptom:** Console shows CORS policy error

**Solution:**
Add CORS rules in Backblaze B2 bucket settings:
```json
[
  {
    "corsRuleName": "allowAll",
    "allowedOrigins": ["http://localhost:3000"],
    "allowedHeaders": ["*"],
    "allowedOperations": ["s3_get"],
    "maxAgeSeconds": 3600
  }
]
```

### Issue 3: User Profile Not Found
**Symptom:** Console shows `❌ Failed to fetch profile: 404`

**Solution:**
1. Make sure you're logged in (check localStorage for `accessToken`)
2. Complete onboarding first at http://localhost:3000/onboarding
3. Check if user-service is running on port 3002

### Issue 4: Upload Fails
**Symptom:** Upload doesn't work, no console logs appear

**Solution:**
1. Check if files-service is running on port 3008
2. Verify Backblaze B2 credentials in `.env`
3. Check files-service logs for errors

## Quick Checklist

Run through this checklist:

- [ ] Frontend running on port 3000
- [ ] User-service running on port 3002  
- [ ] Files-service running on port 3008
- [ ] Logged in with valid token
- [ ] Profile created (completed onboarding)
- [ ] Console shows user profile loaded
- [ ] Console shows Backblaze B2 URLs
- [ ] Images visible in photo slots
- [ ] Can upload new images
- [ ] Uploaded images appear immediately

## Expected Console Output (Success)

When everything works correctly, you should see:

```
✅ Facecard: User profile loaded: {
  id: "user123",
  username: "John",
  displayPictureUrl: "https://f005.backblazeb2.com/file/aiofhtheworlsgif/profile-photos/user123/1234567890-uuid-photo.jpg",
  photos: [
    {url: "https://f005.backblazeb2.com/file/aiofhtheworlsgif/profile-photos/user123/...", order: 1}
  ]
}
📸 Display Picture URL: https://f005.backblazeb2.com/file/aiofhtheworlsgif/profile-photos/user123/1234567890-uuid-photo.jpg
📸 Additional Photos: [{url: "...", order: 1}]
```

## What the Code Does

### Image Display Logic:
```javascript
// Main photo (Slot 1)
<img src={user?.displayPictureUrl || "/imageprofile.png"} />

// Additional photos (Slots 2 & 3)
{user?.photos?.[0]?.url ? (
  <img src={user.photos[0].url} />
) : (
  <span>+</span>  // Show + if no photo
)}
```

### Upload Flow:
1. User clicks photo slot → File picker opens
2. User selects image → `handleFileChange` triggered
3. Upload to files-service (port 3008) → Returns Backblaze B2 URL
4. Update user-service (port 3002) → Saves URL to database
5. Update local state → Image appears immediately

## Next Steps

1. **Open** http://localhost:3000/facecard in browser
2. **Open** DevTools Console (F12)
3. **Check** for the console logs mentioned above
4. **Verify** images are visible
5. **Test** uploading a new image
6. **Report** what you see in the console

The console logs will tell you exactly what's happening!
