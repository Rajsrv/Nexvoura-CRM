import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');

let app: admin.app.App;
let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;

try {
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Force the project ID from config to be the default for the environment
    if (firebaseConfig.projectId) {
      process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
      process.env.GCLOUD_PROJECT = firebaseConfig.projectId;
      console.log(`📡 Project ID from config: ${firebaseConfig.projectId}`);
    }
    
    if (admin.apps.length === 0) {
      app = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: firebaseConfig.projectId
      });
    } else {
      app = admin.app();
    }
    
    auth = admin.auth(app);
    
    let dbId = firebaseConfig.firestoreDatabaseId || '(default)';
    console.log(`📡 Initializing Firestore Admin | Project: ${firebaseConfig.projectId} | Target Database: ${dbId}`);
    
    db = getFirestore(app, dbId);
    
    // Connectivity probe with automatic fallback to (default)
    const probeDatabase = async (id: string) => {
      console.log(`🔍 Probing database "${id}"...`);
      try {
        await getFirestore(app, id).collection('companies').limit(1).get();
        console.log(`✅ Authorized to access database: ${id}`);
        return true;
      } catch (err: any) {
        console.error(`❌ Probe failure on "${id}": ${err.message} (Code: ${err.code})`);
        return false;
      }
    };

    probeDatabase(dbId).then(async (success) => {
      if (!success && dbId !== '(default)') {
        console.warn(`⚠️ Custom database "${dbId}" unavailable. Attempting fallback to "(default)"...`);
        const fallbackSuccess = await probeDatabase('(default)');
        if (fallbackSuccess) {
          db = getFirestore(app, '(default)');
          console.log('✅ Fallback success: Now using "(default)" database.');
        } else {
          console.error('❌ Critical: Both custom and "(default)" databases are unreachable.');
        }
      }
    });
  } else {
    throw new Error('firebase-applet-config.json not found. Backend services cannot initialize.');
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error);
  throw error;
}

export { db, auth, app };
