import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  Timestamp, 
  getDoc,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const storage = getStorage(undefined, firebaseConfig.storageBucket);

function cleanData(data: any): any {
  if (data instanceof File) return data; // Keep files for upload logic
  if (Array.isArray(data)) {
    return data.map(v => cleanData(v));
  } else if (data !== null && typeof data === 'object' && !(data instanceof Timestamp)) {
    const cleaned: any = {};
    Object.keys(data).forEach(key => {
      const value = cleanData(data[key]);
      if (value !== undefined) {
        cleaned[key] = value;
      }
    });
    return cleaned;
  }
  return data;
}

export interface FormFieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customError?: string;
}

export interface FormFieldLogic {
  showIfFieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_empty';
  value?: string;
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'email' | 'tel' | 'select' | 'checkbox' | 'radio' | 'date' | 'time' | 'switch' | 'range' | 'rating' | 'url' | 'file' | 'media' | 'signature';
  required: boolean;
  options?: string[];
  placeholder?: string;
  validation?: FormFieldValidation;
  width?: 'full' | 'half';
  defaultValue?: any;
  helpText?: string;
  logic?: FormFieldLogic;
}

export interface FormStyling {
  primaryColor: string;
  backgroundColor: string;
  backgroundGradient?: {
    from: string;
    to: string;
    direction: string;
  };
  backgroundImageUrl?: string;
  backgroundPattern?: string;
  cardColor: string;
  cardOpacity?: number;
  cardBlur?: boolean;
  textColor: string;
  labelColor?: string;
  buttonText: string;
  ctaText?: string;
  ctaIcon?: string;
  borderRadius: string;
  fontFamily: string;
  buttonStyle: 'filled' | 'outline' | 'ghost' | 'glow';
  logoUrl?: string;
  bannerUrl?: string;
  footerText?: string;
  formWidth: 'boxed' | 'full' | 'narrow';
  formHeight?: 'auto' | 'screen' | 'tall';
  fieldLayout?: 'grid' | 'list';
  headerAlignment: 'left' | 'center' | 'right';
  fieldSpacing: 'compact' | 'comfortable' | 'loose';
  inputStyle?: 'standard' | 'filled' | 'underlined';
  shadowSize?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  animationType?: 'none' | 'fade' | 'slide' | 'zoom' | 'stagger';
}

export interface FormRedirect {
  url: string;
  delay: number; // in seconds
  enabled: boolean;
  message?: string;
}

export interface DynamicForm {
  id?: string;
  companyId: string;
  name: string;
  description?: string;
  fields: FormField[];
  isActive: boolean;
  createdBy: string;
  createdAt: Timestamp;
  styling?: FormStyling;
  redirect?: FormRedirect;
}

export interface FormSubmission {
  id?: string;
  companyId: string;
  formId: string;
  formName: string;
  data: Record<string, any>;
  submittedAt: Timestamp;
  status: 'New' | 'Read' | 'Converted';
}

export const formService = {
  // Forms
  getCompanyForms: (companyId: string, callback: (forms: DynamicForm[]) => void) => {
    const q = query(
      collection(db, 'forms'),
      where('companyId', '==', companyId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const forms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DynamicForm));
      callback(forms);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'forms');
    });
  },

  createForm: async (formData: Omit<DynamicForm, 'id'>) => {
    try {
      return await addDoc(collection(db, 'forms'), cleanData(formData));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'forms');
    }
  },

  updateForm: async (formId: string, formData: Partial<DynamicForm>) => {
    try {
      return await updateDoc(doc(db, 'forms', formId), cleanData(formData));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `forms/${formId}`);
    }
  },

  deleteForm: async (formId: string) => {
    try {
      return await deleteDoc(doc(db, 'forms', formId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `forms/${formId}`);
    }
  },

  getFormById: async (formId: string) => {
    try {
      const docSnap = await getDoc(doc(db, 'forms', formId));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as DynamicForm;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `forms/${formId}`);
    }
  },

  // Submissions
  getFormSubmissions: (companyId: string, callback: (submissions: FormSubmission[]) => void) => {
    const q = query(
      collection(db, 'formSubmissions'),
      where('companyId', '==', companyId),
      orderBy('submittedAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FormSubmission));
      callback(submissions);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'formSubmissions');
    });
  },

  submitForm: async (companyId: string, formId: string, formName: string, data: Record<string, any>) => {
    try {
      const sanitizedData = { ...data };
      
      // 1. Handle File Uploads first
      const fileUploads = Object.entries(sanitizedData).filter(([_, val]) => val instanceof File);
      for (const [key, file] of fileUploads) {
        const fileRef = ref(storage, `forms/submissions/${formId}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(fileRef, file);
        sanitizedData[key] = await getDownloadURL(snapshot.ref);
      }

      const finalData = cleanData(sanitizedData);

      // 2. Store the raw submission
      const subRef = await addDoc(collection(db, 'formSubmissions'), {
        companyId,
        formId,
        formName,
        data: finalData,
        submittedAt: Timestamp.now(),
        status: 'New'
      });

      // 2. Also register as a Lead in the CRM if it contains lead-like data
      // We try to find name, email, phone in the submitted data keys
      const lowerKeys = Object.keys(sanitizedData).reduce((acc, key) => {
        acc[key.toLowerCase()] = key;
        return acc;
      }, {} as Record<string, string>);

      const nameKey = lowerKeys['name'] || lowerKeys['full name'] || Object.keys(lowerKeys).find(k => k.includes('name'));
      const emailKey = lowerKeys['email'] || lowerKeys['email address'] || Object.keys(lowerKeys).find(k => k.includes('email'));
      const phoneKey = lowerKeys['phone'] || lowerKeys['phone number'] || Object.keys(lowerKeys).find(k => k.includes('phone') || k.includes('tel'));
      const msgKey = lowerKeys['message'] || lowerKeys['comments'] || lowerKeys['notes'] || Object.keys(lowerKeys).find(k => k.includes('message'));

      if (nameKey || emailKey) {
        await addDoc(collection(db, 'leads'), {
          companyId,
          name: nameKey ? sanitizedData[nameKey] : 'Unknown Lead',
          email: emailKey ? sanitizedData[emailKey] : '',
          phone: phoneKey ? sanitizedData[phoneKey] : '',
          service: 'Custom Development', // Default or could be inferred
          message: msgKey ? sanitizedData[msgKey] : `Submitted via form: ${formName}`,
          status: 'New',
          createdAt: new Date().toISOString(), // Leads use ISO string for createdAt in this app based on types.ts and other components
          formId: formId // Linking lead to the form submission
        });
      }

      return subRef;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'formSubmissions');
    }
  },

  updateSubmissionStatus: async (submissionId: string, status: FormSubmission['status']) => {
    try {
      return await updateDoc(doc(db, 'formSubmissions', submissionId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `formSubmissions/${submissionId}`);
    }
  }
};
