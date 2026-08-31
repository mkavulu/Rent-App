import React, { useState, useEffect } from 'react';

// Generates all months from January 2010 to December 2050
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
  const [defaultRent, setDefaultRent] = useState(0);

  // Base unit structure with isolated monthly histories
  const [units, setUnits] = useState(() => {
    const saved = localStorage.getItem('rental_units_history_v8');
    if (saved) return JSON.parse(saved);

    return Array.from({ length: 11 }, (_, i) => ({
      id: i + 1,
      houseNo: `House ${i + 1}`,
      tenantName: `Tenant ${i + 1}`,
      history: []
    }));
  });

  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);
  const [editingUnit, setEditingUnit] = useState(null);
  const [receiptUnit, setReceiptUnit] = useState(null);

  const [monthlyRentInput, setMonthlyRentInput] = useState(0);
  const [payAmount, setPayAmount] = useState(0);
  const [payDate, setPayDate] = useState('');

  useEffect(() => {
    localStorage.setItem('rental_units_history_v8', JSON.stringify(units));
  }, [units]);

  // Retrieve monthly history record strictly for the chosen period
  const getMonthRecord = (unit, month) => {
    const record = unit.history.find(h => h.month === month);
    return record || { month, monthlyRent: 0, amountPaid: 0, datePaid: '', balance: 0 };
  };

  const handleOpenEdit = (unit) => {
    const currentRecord = getMonthRecord(unit, selectedMonth);
    setEditingUnit({ ...unit });
    setMonthlyRentInput(currentRecord.monthlyRent || 0);
    setPayAmount(currentRecord.amountPaid || 0);
    setPayDate(currentRecord.datePaid || new Date().toISOString().split('T')[0]);
  };

  const handleSavePayment = (e) => {
    e.preventDefault();
    const paid = Number(payAmount);
    const rentTarget = Number(monthlyRentInput);

    setUnits(units.map(u => {
      if (u.id !== editingUnit.id) return u;

      const newHistory = [...u.history];
      const existingIndex = newHistory.findIndex(h => h.month === selectedMonth);

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
    }));

    setEditingUnit(null);
  };

  const handleAddHouse = () => {
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
    setUnits([...units, newUnit]);
  };

  const handleDeleteHouse = (id) => {
    if (window.confirm("Are you sure you want to delete this house?")) {
      setUnits(units.filter(u => u.id !== id));
    }
  };

  const totalExpected = units.reduce((acc, u) => acc + getMonthRecord(u, selectedMonth).monthlyRent, 0);
  const totalCollected = units.reduce((acc, u) => acc + getMonthRecord(u, selectedMonth).amountPaid, 0);
  const totalBalance = totalExpected - totalCollected;

  return (
    <div className="app-container">
      <div className={receiptUnit ? "no-print" : ""}>

        {/* Header Bar */}
        <header className="app-header">
          <div>
            <h1 className="header-title">Rental Income Ledger</h1>
            <p className="header-subtitle">Managing {units.length} Properties | Period: 2010 to 2050</p>
          </div>

          <div className="toolbar no-print">
            {/* Period Dropdown Selector (2010 - 2050) */}
            <div className="period-picker">
              <label>Period:</label>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                {ALL_MONTHS.map((m) => (
                  <option key={m} value={m} style={{ background: '#151c2c', color: '#ffffff' }}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Default Rent Picker */}
            <div className="default-rent-picker">
              <label>Default Rent:</label>
              <input
                type="number"
                value={defaultRent}
                onChange={(e) => setDefaultRent(e.target.value)}
                placeholder="0"
              />
            </div>

            <button onClick={handleAddHouse} className="btn btn-add">+ Add House</button>
            <button onClick={() => window.print()} className="btn btn-print">Print Statement</button>
          </div>
        </header>

        {/* Financial Overview Cards */}
        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">Target ({selectedMonth})</span>
            <p className="summary-value">KES {totalExpected.toLocaleString()}</p>
          </div>
          <div className="summary-card">
            <span className="summary-label">Total Collected</span>
            <p className="summary-value text-emerald">KES {totalCollected.toLocaleString()}</p>
          </div>
          <div className="summary-card">
            <span className="summary-label">Outstanding Balance</span>
            <p className="summary-value text-red">KES {totalBalance.toLocaleString()}</p>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="table-card">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>House No</th>
                <th>Tenant Name</th>
                <th>Monthly Rent</th>
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
                    <td>KES {record.monthlyRent.toLocaleString()}</td>
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
        </div>
      </div>

      {/* Record Modal */}
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
                <label>Monthly Rent Target for {selectedMonth} (KES)</label>
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

      {/* Printable Receipt Modal */}
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
              <div className="receipt-row receipt-row border-top">
                <span>Monthly Rent Target:</span>
                <span>KES {receiptUnit.record.monthlyRent.toLocaleString()}</span>
              </div>
              <div className="receipt-row">
                <span>Amount Paid:</span>
                <strong style={{ color: '#047857' }}>KES {receiptUnit.record.amountPaid.toLocaleString()}</strong>
              </div>
              <div className="receipt-row receipt-row border-top" style={{ fontSize: '1rem', fontWeight: 800 }}>
                <span>Remaining Balance:</span>
                <span style={{ color: receiptUnit.record.balance > 0 ? '#dc2626' : '#000000' }}>
                  KES {receiptUnit.record.balance.toLocaleString()}
                </span>
              </div>
            </div>

            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b', borderTop: '1px dashed #cbd5e1', paddingTop: '1rem' }}>
              Thank you for your prompt payment!
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