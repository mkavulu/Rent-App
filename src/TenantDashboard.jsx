import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function RentalDashboard({ user }) {
  const [tenantRecords, setTenantRecords] = useState([]);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!user) return;

    let q;
    if (isAdmin) {
      // Admins fetch all rental records
      q = collection(db, 'rental_data');
    } else {
      // Tenants ONLY fetch records matching their email
      q = query(
        collection(db, 'rental_data'),
        where('tenantEmail', '==', user.email.toLowerCase())
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTenantRecords(records);
    });

    return () => unsubscribe();
  }, [user, isAdmin]);

  return (
    <div style={styles.container}>
      {/* 1. ADMIN-ONLY SECTION: Global Overview Metrics */}
      {isAdmin && (
        <>
          <div style={styles.metricsGrid}>
            <div style={styles.card}>
              <span style={styles.cardTitle}>Target Rent</span>
              <p style={styles.amount}>KES 12,300</p>
            </div>
            <div style={styles.card}>
              <span style={styles.cardTitle}>Total Collected Rent</span>
              <p style={{ ...styles.amount, color: '#10b981' }}>KES 2,500</p>
            </div>
            <div style={styles.card}>
              <span style={styles.cardTitle}>Outstanding Balance</span>
              <p style={{ ...styles.amount, color: '#ef4444' }}>KES 9,800</p>
            </div>
            <div style={styles.card}>
              <span style={styles.cardTitle}>Overall Expenses</span>
              <p style={{ ...styles.amount, color: '#ef4444' }}>KES 0</p>
            </div>
            <div style={styles.card}>
              <span style={styles.cardTitle}>Net Profit</span>
              <p style={{ ...styles.amount, color: '#10b981' }}>KES 2,500</p>
            </div>
          </div>

          <div style={styles.section}>
            <h3>General / Property Expenses</h3>
            <p style={styles.emptyText}>No expenses recorded for this month.</p>
          </div>
        </>
      )}

      {/* 2. TENANT VIEW: Only shows their specific unit & rent balance */}
      <div style={styles.section}>
        <h3>{isAdmin ? 'All Tenant Statements' : 'My Rent Statement'}</h3>
        
        {tenantRecords.length === 0 ? (
          <p style={styles.emptyText}>No rental statements found for your account.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Unit / Property</th>
                <th style={styles.th}>Monthly Rent</th>
                <th style={styles.th}>Amount Paid</th>
                <th style={styles.th}>Balance Due</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {tenantRecords.map((item) => (
                <tr key={item.id} style={styles.tr}>
                  <td style={styles.td}>{item.unitName || 'Unit 1A'}</td>
                  <td style={styles.td}>KES {item.monthlyRent?.toLocaleString()}</td>
                  <td style={styles.td}>KES {item.amountPaid?.toLocaleString()}</td>
                  <td style={styles.td}>KES {item.balanceDue?.toLocaleString()}</td>
                  <td style={styles.td}>
                    <span style={item.balanceDue <= 0 ? styles.paidBadge : styles.dueBadge}>
                      {item.balanceDue <= 0 ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '1.5rem', color: '#ffffff', backgroundColor: '#0b0f19' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' },
  card: { backgroundColor: '#161e2e', padding: '1.25rem', borderRadius: '12px', border: '1px solid #2d3748' },
  cardTitle: { color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600' },
  amount: { fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem', margin: 0 },
  section: { backgroundColor: '#161e2e', padding: '1.5rem', borderRadius: '12px', border: '1px solid #2d3748', marginTop: '1.5rem' },
  emptyText: { color: '#94a3b8', textAlign: 'center', padding: '1rem 0' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '1rem' },
  th: { textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #2d3748', color: '#94a3b8' },
  tr: { borderBottom: '1px solid #1f2937' },
  td: { padding: '0.75rem', color: '#f8fafc' },
  paidBadge: { backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem' },
  dueBadge: { backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem' },
};