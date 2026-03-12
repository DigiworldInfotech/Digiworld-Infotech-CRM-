import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { LogIn } from 'lucide-react';

const Login: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  if (loading) return null;
  if (user) return <Navigate to="/" />;

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to login with Google');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200">
            <span className="text-white text-3xl font-black">D</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">DigiWorld Infotech</h1>
          <p className="text-slate-500 mb-8">GST Invoice & CRM Automation System</p>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-[0.98]"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
            Sign in with Google
          </button>

          <div className="mt-8 pt-8 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
