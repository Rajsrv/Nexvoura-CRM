import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Load Firebase config
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let auth: admin.auth.Auth | null = null;
let db: admin.firestore.Firestore | null = null;

try {
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Initialize Admin SDK
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }
    
    auth = admin.auth();
    // Use the specific firestoreDatabaseId from the config
    db = admin.firestore(firebaseConfig.firestoreDatabaseId);
  } else {
    console.warn('⚠️ firebase-applet-config.json not found at:', configPath);
  }
} catch (error) {
  console.error('❌ Error initializing Firebase in auth service:', error);
}

export async function createEmployeeAccount(adminUid: string, employeeData: any) {
  if (!auth || !db) throw new Error('Firebase Admin not initialized');

  // 1. Verify requester is an admin
  const adminDoc = await db.collection('users').doc(adminUid).get();
  const adminData = adminDoc.data();
  if (!adminData || adminData.role !== 'admin') {
    throw new Error('Unauthorized: Only admins can create employee accounts');
  }

  const { email, password, name, role, companyId, department, phone } = employeeData;

  if (adminData.companyId !== companyId) {
    throw new Error('Unauthorized: Cannot create account for different company');
  }

  // 2. Create User in Firebase Auth
  const userRecord = await auth.createUser({
    email,
    password,
    displayName: name,
  });

  // 3. Create Profile in Firestore
  const userProfile = {
    uid: userRecord.uid,
    name,
    email,
    companyId,
    role: role || 'sales',
    department: department || 'Sales',
    phone: phone || '',
    createdAt: new Date().toISOString(),
    status: 'Active',
    memberId: `EMP-${Date.now().toString().slice(-4)}`
  };

  await db.collection('users').doc(userRecord.uid).set(userProfile);

  return userProfile;
}
