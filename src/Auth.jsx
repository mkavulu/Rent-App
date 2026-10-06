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
  const [role, setRole] = useState('tenant'); // 'admin' or 'tenant'
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (isRegistering) {
        // Register user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Store user role profile in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          role: role,
          createdAt: new Date().toISOString()
        });
      } else {
        // Sign in user
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container" style={{ maxWidth: '400px', margin: '4rem auto', padding: '2rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
      <h2>{isRegistering ? 'Register Account' : 'Login'}</h2>
      {error && <p style={{ color: 'red', fontSize: '0.875rem' }}>{error}</p>}
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
        />

        {isRegistering && (
          <div>
            <label style={{ marginRight: '0.5rem' }}>Role:</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="tenant">Tenant</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        )}

        <button type="submit" className="btn btn-print">
          {isRegistering ? 'Sign Up' : 'Sign In'}
        </button>
      </form>

      <button 
        onClick={() => setIsRegistering(!isRegistering)} 
        style={{ marginTop: '1rem', background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}
      >
        {isRegistering ? 'Already have an account? Log In' : "Don't have an account? Register"}
      </button>
    </div>
  );
}