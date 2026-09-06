// Server-side Firebase Admin SDK initialization (Zero Client Exposure)
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfigJson.projectId;
const databaseId = firebaseConfigJson.firestoreDatabaseId || '(default)';

function initAdminApp(): App {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0]!;
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  }

  // Cloud Run or environment with default credentials
  return initializeApp({
    projectId,
  });
}

export const adminApp = initAdminApp();
export const adminAuth = getAuth(adminApp);
export const adminFirestore =
  databaseId && databaseId !== '(default)'
    ? getFirestore(adminApp, databaseId)
    : getFirestore(adminApp);

export const hasServiceAccount = Boolean(
  process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY
);

export { databaseId, projectId };
