📞 Call Hub - Frontend
A complete call management dashboard for the Twilio + Deepgram call recording system. This frontend application allows agents to make calls, view call logs, listen to recordings, and generate transcripts on demand.

🚀 Features
📱 Agent Dashboard - Make and receive calls directly from the browser

📋 Call Logs - View all calls with recordings and transcripts

🎙️ On-Demand Transcription - Generate transcripts for any recorded call

📊 Lead Management - Track leads with status updates

💬 Messages - Send notifications and alerts

📝 Surveys - Create and manage surveys

🔐 Firebase Authentication - Secure login with email/password

🎧 Audio Playback - Listen to call recordings directly in the browser

🛠️ Tech Stack
Technology	Purpose
React 18	Frontend framework
TypeScript	Type-safe JavaScript
Vite	Build tool and dev server
Firebase	Authentication & Database
Twilio Voice SDK	Browser-based calling
Deepgram API	Speech-to-text transcription
date-fns	Date formatting
📋 Prerequisites
Node.js (v16 or higher)

npm or yarn

Firebase account (free tier)

Twilio account (free trial available)

Deepgram API key (free $200 credit)

📦 Installation
1. Clone the Repository
bash
git clone https://github.com/unfazed24072005io/call-hub-spa.git
cd call-hub-spa
2. Install Dependencies
bash
npm install
3. Environment Variables
Create a .env file in the root directory:

env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_BACKEND_URL=https://your-backend-url.onrender.com
4. Start Development Server
bash
npm run dev
Open http://localhost:5173 in your browser.

🏗️ Project Structure
text
src/
├── components/
│   ├── Layout/
│   │   └── Layout.tsx          # Main layout wrapper
│   ├── Calls.tsx               # Call logs with recordings
│   ├── Leads.tsx               # Lead management
│   ├── Dashboard.tsx           # Overview dashboard
│   └── ...
├── lib/
│   ├── firebase.ts             # Firebase configuration
│   └── FirebaseContext.tsx     # Firebase provider
├── hooks/
│   └── useFirebase.ts          # Firebase custom hook
├── types/
│   └── index.ts                # TypeScript interfaces
├── App.tsx                     # Main app component
├── main.tsx                    # Entry point
└── index.css                   # Global styles
🔧 Key Features Explained
1. Call Management
Make Calls: Dial any phone number directly from the browser

Incoming Calls: Receive calls from your Twilio number

Call Status: Real-time status updates (ringing, connected, ended)

Call Duration: Automatic call duration tracking

2. Call Logs
Merged Entries: Combines frontend data (agent, lead) with server data (recording, duration)

Recording Playback: Load and play recordings with one click

Transcript Generation: Generate AI-powered transcripts on demand

Search & Filter: Search by agent, lead, or phone number

3. Lead Management
Status Tracking: Update lead status (New, Contacted, Won, Lost, etc.)

Quick Actions: Call leads directly from the list

Search & Filter: Find leads by name, phone, or status

Notes: Add notes and custom status messages

4. Transcription
On-Demand: Generate transcripts only when needed

Speaker Identification: Identifies who said what

Saves to Firebase: Transcripts are stored for future viewing

View Transcript: Popup modal to view full transcript

🎯 Usage Guide
Making a Call
Login with your Firebase credentials

Navigate to the Calls tab

Enter a phone number in the input field

Click Call button

Wait for the call to connect

Click Hang Up to end the call

Viewing Call Logs
Go to Call Logs page

All calls with recordings are displayed

Click Load to load a recording

Click Play to listen to the recording

Click Generate to create a transcript

Managing Leads
Go to Leads page

Search or filter leads

Click Call to call a lead

Click Status to update lead status

Use Quick Status dropdown for common status updates

🔐 Authentication
The app uses Firebase Authentication with email/password login. Demo credentials:

text
Email: admin@luxe.com
Password: [your-password]
🚀 Deployment
Build for Production
bash
npm run build
The build output will be in the dist/ folder.

Deploy to Vercel/Netlify
Build the project

Deploy the dist/ folder

Set environment variables in your hosting platform

Deploy to Firebase Hosting
bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
📊 Environment Variables
Variable	Description
VITE_FIREBASE_API_KEY	Firebase API key
VITE_FIREBASE_AUTH_DOMAIN	Firebase auth domain
VITE_FIREBASE_PROJECT_ID	Firebase project ID
VITE_FIREBASE_STORAGE_BUCKET	Firebase storage bucket
VITE_FIREBASE_MESSAGING_SENDER_ID	Firebase messaging sender ID
VITE_FIREBASE_APP_ID	Firebase app ID
VITE_BACKEND_URL	Backend API URL (Render)
🔗 Related Repositories
Backend: CALL-RECORDING-BACKEND

🤝 Contributing
Fork the repository

Create a feature branch (git checkout -b feature/amazing-feature)

Commit your changes (git commit -m 'Add amazing feature')

Push to the branch (git push origin feature/amazing-feature)

Open a Pull Request

📝 License
This project is licensed under the MIT License - see the LICENSE file for details.

🙏 Acknowledgments
Twilio for telephony infrastructure

Deepgram for AI transcription

Firebase for authentication and database

Render for hosting

📞 Support
For issues or questions, please open an issue on GitHub or contact the maintainers.

Made with ❤️ by Systems Solutions
