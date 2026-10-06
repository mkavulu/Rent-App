import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

export default function AdminPanel() {
  const [usersList, setUsersList] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, 'users'));
      const users = snap.docs.map(doc => doc.data());
      setUsersList(users);
    };
    fetchUsers();
  }, []);

  const handleRoleChange = async (uid, newRole) => {
    await updateDoc(doc(db, 'users', uid), { role: newRole });
    setUsersList(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
  };

  return (
    <div className="table-card" style={{ marginBottom: '2rem' }}>
      <h2>Admin Control Panel - User Management</h2>
      <table className="ledger-table" style={{ width: '100%', marginTop: '1rem' }}>
        <thead>
          <tr>
            <th>Email</th>
            <th>UID</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {usersList.map((u) => (
            <tr key={u.uid}>
              <td>{u.email}</td>
              <td style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.uid}</td>
              <td><strong>{u.role}</strong></td>
              <td>
                <select 
                  value={u.role} 
                  onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                >
                  <option value="tenant">Tenant</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}