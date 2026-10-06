import { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

export default function AdminPanel() {
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const users = snap.docs.map(doc => doc.data());
        setUsersList(users);
      } catch (err) {
        console.error("Error loading users:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleRoleChange = async (uid, newRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      setUsersList(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
    } catch (err) {
      alert("Failed to update role: " + err.message);
    }
  };

  return (
    <div style={styles.panelContainer}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.panelTitle}>Admin Control Panel</h2>
          <p style={styles.panelSubtitle}>Manage user roles and permissions across your application</p>
        </div>
        <div style={styles.userCountBadge}>
          Total Users: {usersList.length}
        </div>
      </div>

      {loading ? (
        <div style={styles.loadingText}>Loading user management table...</div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>User ID (UID)</th>
                <th style={styles.th}>Current Role</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map((u) => (
                <tr key={u.uid} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.emailText}>{u.email}</div>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.uidBadge}>{u.uid}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={u.role === 'admin' ? styles.adminBadge : styles.tenantBadge}>
                      {u.role ? u.role.toUpperCase() : 'TENANT'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <select 
                      value={u.role || 'tenant'} 
                      onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                      style={styles.roleSelect}
                    >
                      <option value="tenant" style={styles.option}>Tenant</option>
                      <option value="admin" style={styles.option}>Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  panelContainer: {
    backgroundColor: '#161e2e',
    borderRadius: '12px',
    border: '1px solid #2d3748',
    padding: '1.75rem',
    margin: '2rem auto',
    maxWidth: '1000px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: '#ffffff',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  panelTitle: {
    margin: 0,
    fontSize: '1.35rem',
    fontWeight: '700',
    color: '#ffffff',
  },
  panelSubtitle: {
    margin: '0.25rem 0 0 0',
    fontSize: '0.875rem',
    color: '#94a3b8',
  },
  userCountBadge: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    padding: '0.5rem 0.85rem',
    borderRadius: '20px',
    fontSize: '0.85rem',
    color: '#f59e0b',
    fontWeight: '600',
  },
  loadingText: {
    textAlign: 'center',
    padding: '2rem',
    color: '#94a3b8',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    padding: '0.85rem 1rem',
    backgroundColor: '#0f172a',
    color: '#cbd5e1',
    fontSize: '0.8rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #2d3748',
  },
  tr: {
    borderBottom: '1px solid #1e293b',
  },
  td: {
    padding: '1rem',
    verticalAlign: 'middle',
  },
  emailText: {
    fontWeight: '500',
    color: '#f8fafc',
    fontSize: '0.925rem',
  },
  uidBadge: {
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    color: '#64748b',
    backgroundColor: '#0f172a',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    border: '1px solid #1e293b',
  },
  adminBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    color: '#f59e0b',
    border: '1px solid #d97706',
    padding: '0.25rem 0.6rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '700',
  },
  tenantBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#60a5fa',
    border: '1px solid #2563eb',
    padding: '0.25rem 0.6rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '700',
  },
  roleSelect: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '0.4rem 0.75rem',
    fontSize: '0.85rem',
    cursor: 'pointer',
    outline: 'none',
  },
  option: {
    backgroundColor: '#161e2e',
    color: '#ffffff',
  },
};