# **App Name**: AgriVision Data Insights

## Core Features:

- User Authentication: Secure user sign-in/sign-up using Firebase auth with email/password and custom tokens for initial load. Store user ID.
- Profile Management: Allow users to manage profile data: full name, farm name, location, phone, farm size, unit system, and notification preferences; uses Firestore to store data. Use tool for knowing when some of the settings will affect calculations elsewhere in the application.
- Real-time Profile Data: Fetch and display user profile settings in real-time from Firestore using onSnapshot, updating UI elements.
- Image Analysis via Gemini AI: Upload images, convert them to Base64, and send to the Gemini AI model for crop diagnosis and actionable treatment plans.
- AI Scan History: Store every successful AI scan details: timestamp, cropName, diagnosis, Gemini response text, and imageThumbnail to Firestore. Display in UI.
- Scan History Retrieval: Fetch and display a list of historical crop scans from Firestore using onSnapshot, updating the scan history UI in real-time.
- Dashboard with Data Visualization: Responsive dashboard with stat cards, yield prediction chart (recharts), crop distribution pie chart (recharts), and active crops table (mock data).

## Style Guidelines:

- Primary color: Forest Green (#388E3C) to reflect the agricultural theme.
- Background color: Off-white (#F5F5F5), providing a clean and modern look.
- Accent color: Lime Green (#AEEA00) for interactive elements and highlights.
- Body and headline font: 'PT Sans', a humanist sans-serif with a modern and warm feel.
- Lucide icons for core objectives and key metrics.
- Fully responsive layout using Tailwind CSS grid and flexbox, ensuring no horizontal scrolling on any device.
- Subtle transition animations on button hover.