
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signInWithPopup, signInWithEmailAndPassword, onAuthStateChanged, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { ShieldAlert, Lock, Sparkles, Terminal, Activity, Zap, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

// Define authorized emails that can be elevated to super admin
const AUTHORIZED_SUPER_ADMIN_EMAILS = [
  'admin@nexvoura.com',
  'owner@nexvoura.sh',
  // The system will also allow the first-ever super admin to be created if needed, 
  // but for production, this should be pre-configured.
];

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isEmailView, setIsEmailView] = useState(false);

  const [currentSessionUser, setCurrentSessionUser] = useState<any>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentSessionUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().isSuperAdmin) {
          navigate('/saas-nexvoura');
        }
      }
    });
    return unsub;
  }, [navigate]);

  const handleElevateCurrentSession = async () => {
    if (!currentSessionUser) return;
    
    // Safety check: Only specific emails can be elevated
    if (!AUTHORIZED_SUPER_ADMIN_EMAILS.includes(currentSessionUser.email || '')) {
      toast.error('Unauthorized identity detected. Elevation protocol denied.');
      return;
    }

    setLoading(true);
    try {
      const docRef = doc(db, 'users', currentSessionUser.uid);
      await setDoc(docRef, { isSuperAdmin: true }, { merge: true });
      toast.success('Session Elevated. Terminal Access Granted.');
      navigate('/saas-nexvoura');
    } catch (error) {
      toast.error('Elevation protocol failed. Critical error.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        if (docSnap.data().isSuperAdmin) {
          toast.success('Clearance Verified. Accessing SaaS Nexvoura.');
          navigate('/saas-nexvoura');
        } else {
          // Safety check: Only specific emails can be elevated
          if (AUTHORIZED_SUPER_ADMIN_EMAILS.includes(user.email || '')) {
            await setDoc(docRef, { isSuperAdmin: true }, { merge: true });
            toast.success('Clearance Elevated. Welcome to Command Center.');
            navigate('/saas-nexvoura');
          } else {
            toast.error('Unauthorized access attempt. Identity logged.');
            // Sign out for safety
            await auth.signOut();
          }
        }
      } else {
        // Only create new super admin if email is authorized
        if (AUTHORIZED_SUPER_ADMIN_EMAILS.includes(user.email || '')) {
          await setDoc(docRef, {
            uid: user.uid,
            name: user.displayName || 'Super Admin',
            email: user.email,
            role: 'admin',
            isSuperAdmin: true,
            createdAt: new Date().toISOString()
          });
          toast.success('Super Admin Identity Provisioned.');
          navigate('/saas-nexvoura');
        } else {
          toast.error('Identity not found in authorization roster.');
          await auth.signOut();
        }
      }
    } catch (error: any) {
      toast.error('Authentication bypass detected. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Safety check: Only specific emails can be super admins via email auth
    if (!AUTHORIZED_SUPER_ADMIN_EMAILS.includes(email)) {
      toast.error('Unauthorized email terminal. Access blocked.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;
        await updateProfile(user, { displayName: name });
        
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name,
          email,
          role: 'admin',
          isSuperAdmin: true,
          createdAt: new Date().toISOString()
        });
        
        toast.success('Super Admin account created. Accessing Command Center.');
        navigate('/saas-nexvoura');
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const user = result.user;
        
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          if (!docSnap.data().isSuperAdmin) {
            // Check authorization again just in case
            if (AUTHORIZED_SUPER_ADMIN_EMAILS.includes(user.email || '')) {
              await setDoc(docRef, { isSuperAdmin: true }, { merge: true });
              toast.success('Identity Verified. Access Clearance Elevated.');
            } else {
              toast.error('Unauthorized session elevation attempt.');
              await auth.signOut();
              return;
            }
          } else {
            toast.success('Nexvoura Authentication Successful');
          }
          navigate('/saas-nexvoura');
        } else {
          // Profile doesn't exist, create one if authorized
          if (AUTHORIZED_SUPER_ADMIN_EMAILS.includes(user.email || '')) {
            await setDoc(docRef, {
              uid: user.uid,
              name: user.displayName || 'Super Admin',
              email: user.email,
              role: 'admin',
              isSuperAdmin: true,
              createdAt: new Date().toISOString()
            });
            toast.success('Super Admin Identity Created and Verified.');
            navigate('/saas-nexvoura');
          } else {
            toast.error('Critical authorization failure.');
            await auth.signOut();
          }
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-mono">
      {/* HUD Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0%,transparent_70%)]" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-primary/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
          {/* Header Diagnostic Line */}
          <div className="h-1 bg-gradient-to-r from-brand-primary/0 via-brand-primary to-brand-primary/0" />
          
          <div className="p-10 space-y-8">
            <div className="space-y-3 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner group">
                  <Cpu className="text-brand-primary animate-pulse group-hover:scale-110 transition-transform" size={32} />
                </div>
              </div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tighter italic">
                {isSignUp ? 'Enroll New Personnel' : 'Command Center Access'}
              </h1>
              <div className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-brand-primary rounded-full animate-ping" />
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.3em]">
                  {isSignUp ? 'Registry Protocol Active' : 'Authorized Personnel Only'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {currentSessionUser && (
                <div className="p-6 bg-brand-primary/5 border border-brand-primary/20 rounded-2xl space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="text-brand-primary" size={20} />
                    <div>
                      <p className="text-[10px] font-black text-white uppercase tracking-widest">Active Session Detected</p>
                      <p className="text-[9px] text-slate-500 truncate max-w-[200px]">{currentSessionUser.email}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleElevateCurrentSession}
                    disabled={loading}
                    className="w-full py-3 bg-brand-primary/20 hover:bg-brand-primary text-brand-primary hover:text-white border border-brand-primary/30 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    Request Session Elevation
                  </button>
                  <p className="text-[8px] text-center text-slate-600 uppercase tracking-widest italic leading-relaxed">
                    Verify authorization before proceeding with system-wide elevation
                  </p>
                </div>
              )}

              {!isEmailView ? (
                <>
                  <button 
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-between px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white hover:bg-white/10 hover:border-brand-primary/30 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-white rounded-lg group-hover:scale-110 transition-transform">
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold uppercase tracking-widest">Identify via Nexvoura Auth</span>
                    </div>
                    <Zap size={18} className="text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>

                  <div className="relative py-4 flex items-center">
                    <div className="flex-1 h-[1px] bg-white/10" />
                    <span className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Internal Protocol</span>
                    <div className="flex-1 h-[1px] bg-white/10" />
                  </div>

                  <button 
                    onClick={() => setIsEmailView(true)}
                    className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Alternate Identity Access
                  </button>
                </>
              ) : (
                <form onSubmit={handleEmailAuth} className="space-y-6">
                  <div className="space-y-4">
                    {isSignUp && (
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Personnel Name</label>
                        <div className="relative">
                          <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                          <input 
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white text-sm focus:border-brand-primary outline-none transition-all placeholder:text-slate-700"
                            placeholder="Commander Name"
                          />
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Terminal ID (Email)</label>
                      <div className="relative">
                        <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                        <input 
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white text-sm focus:border-brand-primary outline-none transition-all placeholder:text-slate-700"
                          placeholder="ident@nexvoura.admin"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Access Key</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                        <input 
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white text-sm focus:border-brand-primary outline-none transition-all placeholder:text-slate-700"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-brand-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Activity size={16} />
                        {isSignUp ? 'Initiate Enrollment' : 'Establish Connection'}
                      </>
                    )}
                  </button>

                  <div className="flex flex-col gap-2">
                    <button 
                      type="button"
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-brand-primary transition-colors"
                    >
                      {isSignUp ? 'Already have a Super Admin account?' : 'Register new Super Admin account'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsEmailView(false)}
                      className="text-[9px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"
                    >
                      Return to Primary Interface
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="p-6 bg-slate-950/50 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert size={14} className="text-amber-500" />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Enforced Encryption</span>
            </div>
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">v2.4.0-Nexvoura</p>
          </div>
        </div>

        {/* Footer Security Note */}
        <div className="mt-8 flex items-center justify-center gap-4 text-slate-600">
           <Activity size={12} className="opacity-40" />
           <p className="text-[8px] font-black uppercase tracking-[0.4em] italic">System Monitoring and Surveillance Active</p>
           <Activity size={12} className="opacity-40" />
        </div>
      </motion.div>
    </div>
  );
}
