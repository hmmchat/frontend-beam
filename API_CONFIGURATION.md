# API Configuration - Direct Service Access

## Configuration
The frontend now connects **directly** to individual backend microservices on their respective ports.

### Service Ports
- **Auth Service**: `http://localhost:3001`
- **User Service**: `http://localhost:3002`
- **Files Service**: `http://localhost:3008`

## API Routes

### Auth Service (Port 3001)
- `POST /auth/google` - Google OAuth login
- `POST /auth/facebook` - Facebook OAuth login
- `POST /auth/phone/send-otp` - Send OTP to phone
- `POST /auth/phone/verify` - Verify OTP

### User Service (Port 3002)
- `GET /users/:userId` - Get user profile
- `POST /users/:userId/profile` - Create user profile
- `PATCH /me/profile` - Update own profile
- `POST /me/photos` - Add photo
- `PATCH /me/intent` - Update intent/prompt
- `PATCH /me/interests` - Update interests
- `PATCH /me/values` - Update values
- `PATCH /me/brand-preferences` - Update brand preferences
- `GET /interests` - Get all interests
- `GET /values` - Get all values
- `GET /brands` - Get all brands

### Files Service (Port 3008)
- `POST /files/upload` - Upload file

## Environment Variables (.env.local)
```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID="123101633457-thegk6vjutiomuiporl51rfmb2cqtdfj.apps.googleusercontent.com"
NEXT_PUBLIC_FACEBOOK_APP_ID=""
NEXT_PUBLIC_AUTH_SERVICE_URL="http://localhost:3001"
NEXT_PUBLIC_USER_SERVICE_URL="http://localhost:3002"
NEXT_PUBLIC_FILES_SERVICE_URL="http://localhost:3008"
```

## Usage in Components
All components import from `/lib/api.js`:

```javascript
import { API } from '@/lib/api';

// Auth
fetch(API.AUTH.GOOGLE, { ... })

// Users
fetch(API.USERS.GET_USER(userId), { ... })

// Files
fetch(API.FILES.UPLOAD, { ... })

// Discovery
fetch(API.DISCOVERY.GET_INTERESTS, { ... })
```

## Request Flow
```
Frontend (3000) → Direct → Backend Services
                          ├─ Auth Service (3001)
                          ├─ User Service (3002)
                          └─ Files Service (3008)
```

## Testing
1. Make sure all backend services are running:
   - Auth Service on port 3001
   - User Service on port 3002
   - Files Service on port 3008

2. Test the flow:
   - Visit http://localhost:3000
   - Click "Sign Up"
   - Try Google/Facebook/Phone login
   - Complete onboarding
   - View/edit facecard

All API calls will connect directly to the individual services! 🚀
