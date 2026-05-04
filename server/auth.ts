import { auth, db } from './firebaseAdmin.ts';

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
