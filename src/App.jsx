import { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Auth from './Auth';
import AdminPanel from './AdminPanel';
import TenantDashboard from './TenantDashboard';

const ADMIN_EMAILS = ["mutukukavulu2000@gmail.com", "dmiltechenterprises@gmail.com"];

const generateMonthOptions = () => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const options = [];

  for (let year = 2010; year <= 2050; year++) {
    for (const month of months) {
      options.push(`${month} ${year}`);
    }
  }
  return options;
};

const ALL_MONTHS = generateMonthOptions();
const CURRENT_MONTH = 'August 2026';

export default function App() {
  // Authentication & Navigation State
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [viewAdminTab, setViewAdminTab] = useState(false);

  // App Ledger & Expense State
  const [defaultRent, setDefaultRent] = useState(0);
  const [units, setUnits] = useState([]);
  const [globalExpenses, setGlobalExpenses] = useState([]);

  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);
  const [editingUnit, setEditingUnit] = useState(null);
  const [receiptUnit, setReceiptUnit] = useState(null);

  const [monthlyRentInput, setMonthlyRentInput] = useState(0);
  const [payAmount, setPayAmount] = useState(0);
  const [payDate, setPayDate] = useState('');

  // Global Expense Form State
  const [expCategory, setExpCategory] = useState('Electricity');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expNotes, setExpNotes] = useState('');

  // 1. Listen for Authentication state changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userEmail = (user.email || '').toLowerCase();
        
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && userDoc.data().role) {
            setUserRole(userDoc.data().role.toLowerCase());
          } else if (ADMIN_EMAILS.includes(userEmail)) {
            setUserRole('admin');
          } else {
            setUserRole('tenant');
          }
        } catch (err) {
          console.error("Error fetching user role:", err);
          if (ADMIN_EMAILS.includes(userEmail)) {
            setUserRole('admin');
          } else {
            setUserRole('tenant');
          }
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Safe Live updates listener for Firestore
  useEffect(() => {
    if (!currentUser) return;

    const unitsRef = doc(db, 'rental_data', 'current_ledger');
    const unsubscribeUnits = onSnapshot(unitsRef, (docSnap) => {
      if (docSnap.exists()) {
        setUnits(docSnap.data().units || []);
      } else {
        setUnits([]);
      }
    }, (error) => {
      console.error("Error loading units:", error);
    });

    const expensesRef = doc(db, 'rental_data', 'global_expenses');
    const unsubscribeExpenses = onSnapshot(expensesRef, (docSnap) => {
      if (docSnap.exists()) {
        setGlobalExpenses(docSnap.data().expenses || []);
      } else {
        setGlobalExpenses([]);
      }
    }, (error) => {
      console.error("Error loading expenses:", error);
    });

    return () => {
      unsubscribeUnits();
      unsubscribeExpenses();
    };
  }, [currentUser]);

  // Helpers to save updates safely to Firestore
  const saveUnitsToCloud = async (newUnits) => {
    setUnits(newUnits);
    await setDoc(doc(db, 'rental_data', 'current_ledger'), { units: newUnits }, { merge: true });
  };

  const saveExpensesToCloud = async (newExpenses) => {
    setGlobalExpenses(newExpenses);
    await setDoc(doc(db, 'rental_data', 'global_expenses'), { expenses: newExpenses }, { merge: true });
  };

  const getPreviousMonthIndex = (currentMonthStr) => {
    const index = ALL_MONTHS.indexOf(currentMonthStr);
    return index > 0 ? ALL_MONTHS[index - 1] : null;
  };

  const getMonthRecord = (unit, month) => {
    const existingRecord = unit.history.find((h) => h.month === month);
    if (existingRecord) return existingRecord;

    const prevMonthStr = getPreviousMonthIndex(month);
    let previousArrears = 0;

    if (prevMonthStr) {
      const prevRecord = unit.history.find((h) => h.month === prevMonthStr);
      if (prevRecord && prevRecord.balance > 0) {
        previousArrears = prevRecord.balance;
      }
    }

    const calculatedTarget = Number(defaultRent) + previousArrears;

    return {
      month,
      monthlyRent: calculatedTarget,
      amountPaid: 0,
      datePaid: '',
      balance: calculatedTarget,
      arrearsCarriedOver: previousArrears
    };
  };

  const handleOpenEdit = (unit) => {
    const currentRecord = getMonthRecord(unit, selectedMonth);
    setEditingUnit({ ...unit });
    setMonthlyRentInput(currentRecord.monthlyRent);
    setPayAmount(currentRecord.amountPaid || 0);
    setPayDate(currentRecord.datePaid || new Date().toISOString().split('T')[0]);
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    const paid = Number(payAmount);
    const rentTarget = Number(monthlyRentInput);

    const updatedUnits = units.map((u) => {
      if (u.id !== editingUnit.id) return u;

      const newHistory = [...u.history];
      const existingIndex = newHistory.findIndex((h) => h.month === selectedMonth);

      const newRecord = {
        month: selectedMonth,
        monthlyRent: rentTarget,
        amountPaid: paid,
        datePaid: payDate,
        balance: rentTarget - paid
      };

      if (existingIndex >= 0) {
        newHistory[existingIndex] = newRecord;
      } else {
        newHistory.push(newRecord);
      }

      return {
        ...u,
        houseNo: editingUnit.houseNo,
        tenantName: editingUnit.tenantName,
        history: newHistory
      };
    });

    await saveUnitsToCloud(updatedUnits);
    setEditingUnit(null);
  };

  const handleAddHouse = async () => {
    const newCount = units.length + 1;
    const rentVal = Number(defaultRent) || 0;

    const newUnit = {
      id: Date.now(),
      houseNo: `House ${newCount}`,
      tenantName: `Tenant ${newCount}`,
      history: [
        { month: selectedMonth, monthlyRent: rentVal, amountPaid: 0, datePaid: '', balance: rentVal }
      ]
    };

    await saveUnitsToCloud([...units, newUnit]);
  };

  const handleDeleteHouse = async (id) => {
    if (window.confirm("Are you sure you want to delete this house?")) {
      const updatedUnits = units.filter((u) => u.id !== id);
      await saveUnitsToCloud(updatedUnits);
    }
  };

  const handleAddGlobalExpense = async (e) => {
    e.preventDefault();
    if (!expAmount) return;

    const newExpense = {
      id: Date.now(),
      category: expCategory,
      amount: Number(expAmount),
      date: expDate,
      month: selectedMonth,
      notes: expNotes
    };

    const updatedExpenses = [...globalExpenses, newExpense];
    await saveExpensesToCloud(updatedExpenses);

    setExpAmount('');
    setExpNotes('');
  };

  const handleDeleteExpense = async (id) => {
    const updatedExpenses = globalExpenses.filter((e) => e.id !== id);
    await saveExpensesToCloud(updatedExpenses);
  };

  // Financial Calculations for selected month
  const totalExpected = units.reduce((acc, u) => acc + getMonthRecord(u, selectedMonth).monthlyRent, 0);
  const totalIncome = units.reduce((acc, u) => acc + getMonthRecord(u, selectedMonth).amountPaid, 0);
  const totalBalance = totalExpected - totalIncome;

  const currentMonthExpenses = globalExpenses.filter((e) => e.month === selectedMonth);
  const totalGlobalExpenses = currentMonthExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

  const netOverallProfit = totalIncome - totalGlobalExpenses;

  if (loadingAuth) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading application...</div>;
  }

  if (!currentUser) {
    return <Auth />;
  }

  return (
    <div className="container app-container">
      {/* Top Navigation */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #e2e8f0', marginBottom: '1rem' }}>
        <div>
          <span>Logged in as: <strong>{currentUser.email}</strong> ({userRole})</span>
        </div>
        <div>
          {userRole === 'admin' && (
            <button 
              onClick={() => setViewAdminTab(!viewAdminTab)} 
              className="btn btn-action" 
              style={{ marginRight: '0.5rem' }}
            >
              {viewAdminTab ? 'Go to Ledger' : 'Admin Panel'}
            </button>
          )}
          <button onClick={() => signOut(auth)} className="btn btn-delete">Sign Out</button>
        </div>
      </div>

      {/* MAIN VIEW ROUTING */}
      {viewAdminTab && userRole === 'admin' ? (
        <AdminPanel />
      ) : userRole === 'tenant' ? (
        <TenantDashboard user={{ email: currentUser.email, role: userRole }} />
      ) : (
        <div className={receiptUnit ? "no-print" : ""}>
          {/* Header Bar */}
          <header className="app-header no-print" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 className="header-title" style={{ margin: 0 }}>Rental Ledger</h1>
              <p className="header-subtitle" style={{ margin: 0, color: '#64748b' }}>
                Managing {units.length} Properties
              </p>
            </div>

            <div className="toolbar" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="period-picker">
                <label style={{ marginRight: '0.5rem' }}>Period:</label>
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                  {ALL_MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="default-rent-picker">
                <label style={{ marginRight: '0.5rem' }}>Default Rent:</label>
                <input
                  type="number"
                  value={defaultRent}
                  onChange={(e) => setDefaultRent(e.target.value)}
                  placeholder="0"
                  style={{ width: '100px' }}
                />
              </div>

              <button onClick={handleAddHouse} className="btn btn-add">+ Add House</button>
              <button onClick={() => window.print()} className="btn btn-print">Print Statement</button>
            </div>
          </header>

          {/* Top Dashboard Summary Cards */}
          <div className="dashboard-cards summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="card summary-card">
              <h3>Target Rent ({selectedMonth})</h3>
              <p className="summary-value">KES {totalExpected.toLocaleString()}</p>
            </div>
            <div className="card summary-card">
              <h3>Total Collected Rent</h3>
              <p className="summary-value text-emerald">KES {totalIncome.toLocaleString()}</p>
            </div>
            <div className="card summary-card">
              <h3>Outstanding Balance</h3>
              <p className="summary-value text-red">KES {totalBalance.toLocaleString()}</p>
            </div>
            <div className="card summary-card">
              <h3>Overall Expenses</h3>
              <p className="summary-value text-red">KES {totalGlobalExpenses.toLocaleString()}</p>
            </div>
            <div className="card summary-card">
              <h3>Net Profit</h3>
              <p className="summary-value text-emerald">KES {netOverallProfit.toLocaleString()}</p>
            </div>
          </div>

          {/* Expenses Section */}
          <section className="overall-expenses-section table-card" style={{ marginBottom: '2rem' }}>
            <h2>General / Property Expenses ({selectedMonth})</h2>
            
            <form onSubmit={handleAddGlobalExpense} className="no-print" style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0', flexWrap: 'wrap' }}>
              <select value={expCategory} onChange={(e) => setExpCategory(e.target.value)}>
                <option value="Electricity">Electricity</option>
                <option value="Water">Water</option>
                <option value="Maintenance">Maintenance & Repairs</option>
                <option value="Caretaker">Caretaker / Security</option>
                <option value="Rates">Land Rates / Taxes</option>
                <option value="Other">Other</option>
              </select>
              <input 
                type="number" 
                placeholder="Amount (KES)" 
                value={expAmount} 
                onChange={(e) => setExpAmount(e.target.value)} 
                required 
              />
              <input 
                type="date" 
                value={expDate} 
                onChange={(e) => setExpDate(e.target.value)} 
              />
              <input 
                type="text" 
                placeholder="Notes / Description" 
                value={expNotes} 
                onChange={(e) => setExpNotes(e.target.value)} 
              />
              <button type="submit" className="btn btn-add">+ Add Expense</button>
            </form>

            <table className="ledger-table" style={{ width: '100%', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Notes</th>
                  <th>Amount</th>
                  <th className="no-print" style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentMonthExpenses.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8' }}>
                      No expenses recorded for this month.
                    </td>
                  </tr>
                ) : (
                  currentMonthExpenses.map((exp) => (
                    <tr key={exp.id}>
                      <td>{exp.date}</td>
                      <td>{exp.category}</td>
                      <td>{exp.notes || '—'}</td>
                      <td className="text-red" style={{ fontWeight: 600 }}>KES {exp.amount.toLocaleString()}</td>
                      <td className="no-print" style={{ textAlign: 'center' }}>
                        <button onClick={() => handleDeleteExpense(exp.id)} className="btn btn-delete">Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          {/* Rental Units Table */}
          <section className="rental-units-section table-card">
            <h2>Rental Units Status</h2>
            <table className="ledger-table" style={{ width: '100%', textAlign: 'left', marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th>House No</th>
                  <th>Tenant Name</th>
                  <th>Target Rent (inc. Arrears)</th>
                  <th>Amount Paid</th>
                  <th>Balance</th>
                  <th>Date Paid</th>
                  <th className="no-print" style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {units.map((unit) => {
                  const record = getMonthRecord(unit, selectedMonth);
                  const balance = record.monthlyRent - record.amountPaid;

                  return (
                    <tr key={unit.id}>
                      <td><strong className="text-gold">{unit.houseNo}</strong></td>
                      <td>{unit.tenantName}</td>
                      <td>
                        KES {record.monthlyRent.toLocaleString()}
                        {record.arrearsCarriedOver > 0 && (
                          <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--accent-red, #ef4444)' }}>
                            (+KES {record.arrearsCarriedOver.toLocaleString()} default from prev month)
                          </span>
                        )}
                      </td>
                      <td className="text-emerald" style={{ fontWeight: 600 }}>KES {record.amountPaid.toLocaleString()}</td>
                      <td className={balance > 0 ? 'text-red' : ''} style={{ fontWeight: 700 }}>
                        KES {balance.toLocaleString()}
                      </td>
                      <td style={{ color: '#94a3b8' }}>{record.datePaid || '—'}</td>
                      <td className="no-print" style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button onClick={() => handleOpenEdit(unit)} className="btn btn-action">Record</button>
                          <button onClick={() => setReceiptUnit({ unit, record })} className="btn btn-receipt">Receipt</button>
                          <button onClick={() => handleDeleteHouse(unit.id)} className="btn btn-delete">Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {/* Edit Modal */}
      {editingUnit && (
        <div className="modal-overlay no-print">
          <div className="modal-card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>Update Entry: {editingUnit.houseNo}</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', marginBottom: '1rem' }}>Period: {selectedMonth}</p>

            <form onSubmit={handleSavePayment}>
              <div className="form-group">
                <label>House Number</label>
                <input
                  type="text"
                  value={editingUnit.houseNo}
                  onChange={(e) => setEditingUnit({ ...editingUnit, houseNo: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Tenant Name</label>
                <input
                  type="text"
                  value={editingUnit.tenantName}
                  onChange={(e) => setEditingUnit({ ...editingUnit, tenantName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Monthly Target (KES)</label>
                <input
                  type="number"
                  value={monthlyRentInput}
                  onChange={(e) => setMonthlyRentInput(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Amount Paid (KES)</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Date Paid</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setEditingUnit(null)} className="btn btn-action">Cancel</button>
                <button type="submit" className="btn btn-print">Save Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptUnit && (
        <div className="modal-overlay">
          <div className="receipt-box">
            <div className="receipt-header">
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>RENTAL RECEIPT</h2>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Period: {receiptUnit.record.month}</p>
              </div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                DATE: {receiptUnit.record.datePaid || 'N/A'}
              </p>
            </div>

            <div style={{ margin: '1.5rem 0', fontSize: '0.875rem' }}>
              <div className="receipt-row">
                <span>House Number:</span>
                <strong>{receiptUnit.unit.houseNo}</strong>
              </div>
              <div className="receipt-row">
                <span>Tenant Name:</span>
                <strong>{receiptUnit.unit.tenantName}</strong>
              </div>
              <div className="receipt-row border-top">
                <span>Total Target Due:</span>
                <span>KES {receiptUnit.record.monthlyRent.toLocaleString()}</span>
              </div>
              <div className="receipt-row">
                <span>Amount Paid:</span>
                <strong style={{ color: '#047857' }}>KES {receiptUnit.record.amountPaid.toLocaleString()}</strong>
              </div>
              <div className="receipt-row border-top" style={{ fontSize: '1rem', fontWeight: 800 }}>
                <span>Remaining Balance:</span>
                <span style={{ color: receiptUnit.record.balance > 0 ? '#dc2626' : '#000000' }}>
                  KES {receiptUnit.record.balance.toLocaleString()}
                </span>
              </div>
            </div>

            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b', borderTop: '1px dashed #cbd5e1', paddingTop: '1rem' }}>
              Thank you for your payment!
            </p>

            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              <button onClick={() => setReceiptUnit(null)} className="btn btn-action">Close</button>
              <button onClick={() => window.print()} className="btn btn-print">Print Receipt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}