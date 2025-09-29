# Firebase Setup Guide

## Overview
This BJJ Strength Training App now includes Firebase Authentication and Firestore database integration. Follow these steps to set up your Firebase project.

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter your project name (e.g., "bjj-strength-app")
4. Enable Google Analytics (optional)
5. Click "Create project"

## 2. Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable "Email/Password" authentication
5. Click "Save"

## 3. Create Firestore Database

1. In your Firebase project, go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location for your database
5. Click "Done"

## 4. Get Firebase Configuration

1. In your Firebase project, go to "Project settings" (gear icon)
2. Scroll down to "Your apps" section
3. Click "Add app" and select the web icon (</>)
4. Register your app with a nickname
5. Copy the Firebase configuration object

## 5. Update Configuration in Code

Replace the placeholder configuration in `script.js` with your actual Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-actual-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-actual-app-id"
};
```

## 6. Set Up Firestore Security Rules

In the Firestore Database section, go to "Rules" and update them:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Workout plans are user-specific
    match /workout_plans/{planId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.user_uid;
    }
    
    // Workout history is user-specific
    match /workout_history/{historyId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.user_uid;
    }
  }
}
```

## 7. Test the Application

1. Open `index.html` in your browser
2. Click "Start Your Journey" to test signup
3. Check your email for verification
4. Click "Log In" to test login
5. Verify that the dashboard loads after authentication

## Features Implemented

### Authentication
- ✅ User signup with email/password
- ✅ Email verification required before login
- ✅ User login with email/password
- ✅ Password reset functionality
- ✅ Automatic logout and session management

### Database Structure
- ✅ `users` collection with user data
- ✅ `workout_plans` collection with training programs
- ✅ `workout_history` collection with completed workouts

### User Experience
- ✅ Homepage with "Start Your Journey" and "Log In" buttons
- ✅ Authentication modal with form validation
- ✅ Protected routes (dashboard, workout, progress, profile)
- ✅ Navigation updates based on authentication state
- ✅ Error handling and user feedback

## Troubleshooting

### Step 1: Test Firebase Connection
1. Open `firebase-test.html` in your browser
2. Update the Firebase config in the test file with your actual values
3. Run the tests to identify the specific issue

### Common Issues

1. **"Firebase not defined" error**
   - Make sure Firebase SDK is loaded before your script
   - Check that the Firebase configuration is correct
   - Verify you're using the correct Firebase version

2. **"Firebase configuration error" message**
   - Replace placeholder values in `script.js` with your actual Firebase config
   - Double-check the configuration object format
   - Ensure all required fields are present

3. **Authentication not working**
   - Verify that Email/Password is enabled in Firebase Console
   - Check that the domain is authorized in Firebase settings
   - Test with the `firebase-test.html` page first

4. **Database permission denied**
   - Update Firestore security rules as shown above
   - Make sure users are authenticated before accessing data
   - Check if Firestore is enabled in your Firebase project

5. **Email verification not working**
   - Check spam folder
   - Verify that the sender email is not blocked
   - Test with a different email provider
   - Check Firebase Console for email delivery issues

6. **Network errors**
   - Check your internet connection
   - Verify Firebase project is active
   - Check if there are any firewall restrictions

### Debug Steps

1. **Open browser console** (F12) and look for error messages
2. **Run `checkFirebaseStatus()`** in the console to see Firebase state
3. **Check the Network tab** for failed requests to Firebase
4. **Use the test page** (`firebase-test.html`) to isolate issues

## Next Steps

1. Set up your Firebase project following the steps above
2. Update the configuration in `script.js`
3. Test the authentication flow
4. Customize the app further as needed

The app is now ready to use with Firebase Authentication and Firestore database!
