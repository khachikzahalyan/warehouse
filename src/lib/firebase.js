// Firebase singletons for the Warehouse Management System.
// Iteration 0: Auth + Firestore + (optional) Analytics.
//
// Every other module imports from here. Never call initializeApp a second time
// and never import from 'firebase/*' directly in a component or page — go
// through a repository in src/infra/repositories/*.

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported as analyticsIsSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Fail fast in development if the env file wasn't loaded.
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  // eslint-disable-next-line no-console
  console.error(
    '[firebase] Missing REACT_APP_FIREBASE_* environment variables. ' +
      'Check .env.local and restart the dev server.'
  );
}

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Analytics is optional — unsupported in jsdom/tests/SSR. Resolve to null there.
export const analyticsPromise = (async () => {
  try {
    if (typeof window === 'undefined') return null;
    const ok = await analyticsIsSupported();
    return ok ? getAnalytics(app) : null;
  } catch {
    return null;
  }
})();
