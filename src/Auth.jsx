import { useState } from 'react';
import { auth, db } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function Auth() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // List of authorized admin emails that can bypass the default tenant role
  const ADMIN_EMAILS = [
    'mutukukavulu2000@gmail.com',
    'dmiltechenterprises@gmail.com'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        // 1. Create account in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Automatically assign 'admin' if email matches allowed list, otherwise force 'tenant'
        const lowerEmail = user.email.toLowerCase();
        const assignedRole = ADMIN_EMAILS.includes(lowerEmail) ? 'admin' : 'tenant';

        // 3. Store user role profile in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: lowerEmail,
          role: assignedRole,
          createdAt: new Date().toISOString()
        });
      } else {
        // Sign in existing user
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      // User-friendly error message formatting
      let msg = err.message;
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
        msg = 'Invalid email or password.';
      } else if (msg.includes('auth/email-already-in-use')) {
        msg = 'An account with this email address already exists.';
      } else if (msg.includes('auth/operation-not-allowed')) {
        msg = 'Email/Password sign-in is disabled in your Firebase Console.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoBadge}>🏢</div>
          <h2 style={styles.title}>{isRegistering ? 'Create Account' : 'Welcome Back'}</h2>
          <p style={styles.subtitle}>
            {isRegistering ? 'Sign up to access the rental portal' : 'Log in to access your account'}
          </p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <span style={{ marginRight: '6px' }}>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email Address</label>
            <input 
              type="email" 
              placeholder="name@example.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={styles.input}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Processing...' : isRegistering ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div style={styles.footer}>
          <button 
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
            }} 
            style={styles.toggleBtn}
          >
            {isRegistering 
              ? 'Already have an account? Sign In' 
              : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  pageContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b0f19',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: '1.5rem',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#161e2e',
    borderRadius: '16px',
    border: '1px solid #2d3748',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    padding: '2.5rem 2rem',
    boxSizing: 'border-box',
  },
  header: {
    textAlign: 'center',
    marginBottom: '1.75rem',
  },
  logoBadge: {
    fontSize: '2rem',
    marginBottom: '0.5rem',
  },
  title: {
    color: '#ffffff',
    fontSize: '1.5rem',
    fontWeight: '700',
    margin: '0 0 0.5rem 0',
    letterSpacing: '-0.025em',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '0.875rem',
    margin: 0,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid #ef4444',
    color: '#f87171',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    fontSize: '0.85rem',
    marginBottom: '1.25rem',
    lineHeight: '1.4',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    color: '#cbd5e1',
    fontSize: '0.85rem',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    color: '#ffffff',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  submitBtn: {
    backgroundColor: '#d97706',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.85rem',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.5rem',
    transition: 'background-color 0.2s',
  },
  footer: {
    marginTop: '1.5rem',
    textAlign: 'center',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: '#f59e0b',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
};