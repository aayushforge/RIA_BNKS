/* ==========================================================================
   HISAB — dashboard.js
   Data layer + render logic for both Personal and Business dashboards.
   Data is stored per-account in localStorage (hisab_data_<email>) so the
   dashboards are fully interactive in demo mode; swap loadData()/persist()
   for real API calls (see backend/routes.py) when wiring a live backend.
   ========================================================================== */

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Healthcare', 'Education', 'Savings', 'Insurance', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Business', 'Investment', 'Rental', 'Other'];
const BUSINESS_EXPENSE_CATEGORIES = ['Operational', 'Employee Salaries', 'Inventory', 'Marketing', 'Green Investment', 'Other'];

const HisabData = (() => {
  function key(email) { return `hisab_data_${email}`; }

  function seed(userType) {
    const now = new Date();
    const iso = (d) => d.toISOString().slice(0, 10);
    const daysAgo = (n) => { const d = new Date(now); d.setDate(d.getDate() - n); return iso(d); };
    const daysAhead = (n) => { const d = new Date(now); d.setDate(d.getDate() + n); return iso(d); };

    const base = {
      transactions: [
        { id: 't1', type: 'income', category: userType === 'business' ? 'Business' : 'Salary', amount: userType === 'business' ? 185000 : 65000, date: daysAgo(2), description: userType === 'business' ? 'Product sales revenue' : 'Monthly salary' },
        { id: 't2', type: 'expense', category: userType === 'business' ? 'Operational' : 'Food', amount: userType === 'business' ? 32000 : 8500, date: daysAgo(3), description: userType === 'business' ? 'Utility & operations' : 'Groceries & dining' },
        { id: 't3', type: 'expense', category: userType === 'business' ? 'Employee Salaries' : 'Transport', amount: userType === 'business' ? 68000 : 4200, date: daysAgo(5), description: userType === 'business' ? 'Staff payroll' : 'Fuel & commute' },
        { id: 't4', type: 'expense', category: userType === 'business' ? 'Inventory' : 'Utilities', amount: userType === 'business' ? 41000 : 3600, date: daysAgo(8), description: userType === 'business' ? 'Raw material restock' : 'Electricity & water' },
        { id: 't5', type: 'income', category: userType === 'business' ? 'Business' : 'Freelance', amount: userType === 'business' ? 52000 : 15000, date: daysAgo(10), description: userType === 'business' ? 'Service contract' : 'Freelance project' },
        { id: 't6', type: 'expense', category: userType === 'business' ? 'Marketing' : 'Entertainment', amount: userType === 'business' ? 12000 : 2800, date: daysAgo(12), description: userType === 'business' ? 'Social media ads' : 'Movies & subscriptions' },
        { id: 't7', type: 'expense', category: userType === 'business' ? 'Green Investment' : 'Savings', amount: userType === 'business' ? 25000 : 10000, date: daysAgo(15), description: userType === 'business' ? 'Solar maintenance reserve' : 'Auto-transfer to savings' }
      ],
      loans: [
        {
          id: 'L1001', type: userType, equipmentName: userType === 'business' ? 'Solar Panel System (5kW)' : 'Personal Emergency Loan',
          amount: userType === 'business' ? 350000 : 40000, purpose: userType === 'business' ? 'Reduce grid dependency & operating cost' : 'Medical emergency',
          status: 'active', disbursementDate: daysAgo(40), dueDate: daysAhead(320),
          repaymentFrequency: userType === 'business' ? 'daily' : 'monthly', dailyRepayment: userType === 'business' ? 950 : 0,
          interestRate: 6.5, expectedROI: userType === 'business' ? '18 months payback via reduced electricity cost' : '', paidAmount: userType === 'business' ? 78000 : 15000
        },
        {
          id: 'L1002', type: userType, equipmentName: userType === 'business' ? 'Energy-Efficient Cold Storage Unit' : 'Two-Wheeler Loan',
          amount: userType === 'business' ? 180000 : 120000, purpose: userType === 'business' ? 'Reduce spoilage & energy cost' : 'Commute vehicle',
          status: 'pending', disbursementDate: '', dueDate: '',
          repaymentFrequency: 'monthly', dailyRepayment: 0, interestRate: 7, expectedROI: userType === 'business' ? '24 months' : '', paidAmount: 0
        }
      ],
      savingsGoals: [
        { id: 'g1', name: userType === 'business' ? 'Green Equipment Reserve Fund' : 'Emergency Fund', target: userType === 'business' ? 300000 : 100000, current: userType === 'business' ? 142000 : 62000, deadline: daysAhead(150) },
        { id: 'g2', name: userType === 'business' ? 'New Branch Expansion' : 'Dream Vacation', target: userType === 'business' ? 800000 : 80000, current: userType === 'business' ? 165000 : 22000, deadline: daysAhead(300) }
      ],
      businessProfile: userType === 'business' ? {
        monthlyRevenue: 237000, operationalExpenses: 32000, employeeSalaries: 68000, inventoryCosts: 41000, marketingExpenses: 12000, greenInvestment: 25000
      } : null,
      reminders: [
        { id: 'r1', title: 'Loan repayment due', date: daysAhead(4), type: 'loan' },
        { id: 'r2', title: userType === 'business' ? 'GST filing deadline' : 'Electricity bill due', date: daysAhead(9), type: 'bill' }
      ]
    };
    return base;
  }

  function loadData(email, userType) {
    const raw = localStorage.getItem(key(email));
    if (raw) {
      try { return JSON.parse(raw); } catch { /* fallthrough */ }
    }
    const data = seed(userType);
    persist(email, data);
    return data;
  }

  function persist(email, data) {
    localStorage.setItem(key(email), JSON.stringify(data));
  }

  function addTransaction(email, data, tx) {
    tx.id = 't' + Date.now();
    data.transactions.unshift(tx);
    persist(email, data);
    return data;
  }

  function addLoan(email, data, loan) {
    loan.id = 'L' + Date.now();
    loan.status = loan.status || 'pending';
    loan.paidAmount = 0;
    data.loans.unshift(loan);
    persist(email, data);
    return data;
  }

  function addSavingsGoal(email, data, goal) {
    goal.id = 'g' + Date.now();
    goal.current = goal.current || 0;
    data.savingsGoals.unshift(goal);
    persist(email, data);
    return data;
  }

  function contributeSavings(email, data, goalId, amount) {
    const goal = data.savingsGoals.find(g => g.id === goalId);
    if (goal) goal.current = Math.min(goal.target, goal.current + Number(amount));
    persist(email, data);
    return data;
  }

  function recordRepayment(email, data, loanId, amount) {
    const loan = data.loans.find(l => l.id === loanId);
    if (loan) {
      loan.paidAmount = (loan.paidAmount || 0) + Number(amount);
      if (loan.paidAmount >= loan.amount) loan.status = 'paid';
    }
    persist(email, data);
    return data;
  }

  return { loadData, persist, addTransaction, addLoan, addSavingsGoal, contributeSavings, recordRepayment, seed };
})();

/* ---------------- Derived calculations ---------------- */
function summarize(data) {
  const income = data.transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = data.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  return { income, expense, savings: income - expense };
}

function expenseBreakdown(data) {
  const map = {};
  data.transactions.filter(t => t.type === 'expense').forEach(t => {
    map[t.category] = (map[t.category] || 0) + Number(t.amount);
  });
  return map;
}

function aiTips(summary, breakdown) {
  const tips = [];
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0) || 1;
  const top = Object.entries(breakdown).sort((a, b) => b[1] - a[1])[0];
  if (top) {
    const pct = Math.round((top[1] / total) * 100);
    tips.push(`Your largest expense category is <strong>${top[0]}</strong> at ${pct}% of spending — consider setting a monthly cap.`);
  }
  if (summary.expense > summary.income * 0.8) {
    tips.push(`You've spent over 80% of your income this period. Review discretionary categories to protect your savings.`);
  } else {
    tips.push(`Great job — you're spending within a healthy range of your income. Keep it up!`);
  }
  tips.push(`Based on your repayment history, you may qualify for a higher green-loan limit next cycle.`);
  return tips;
}

/* ---------------- Rendering: shared bits ---------------- */
function renderTransactionList(el, transactions) {
  if (!el) return;
  el.innerHTML = transactions.slice(0, 6).map(t => `
    <div class="tx-item">
      <div class="tx-icon"><i class="fa-solid ${t.type === 'income' ? 'fa-arrow-down' : 'fa-arrow-up'}" style="color:${t.type === 'income' ? '#27AE60' : '#e74c3c'}"></i></div>
      <div class="tx-info">
        <strong>${t.description || t.category}</strong>
        <span>${t.category} · ${t.date}</span>
      </div>
      <div class="tx-amt ${t.type}">${t.type === 'income' ? '+' : '-'} ${Hisab.currency(t.amount)}</div>
    </div>
  `).join('') || '<p>No transactions yet. Add your first one!</p>';
}

function renderLoansTable(el, loans) {
  if (!el) return;
  el.innerHTML = loans.map(l => `
    <tr>
      <td>${l.id}</td>
      <td>${l.equipmentName}</td>
      <td>${Hisab.currency(l.amount)}</td>
      <td>${l.purpose}</td>
      <td><span class="status-pill ${l.status}">${l.status}</span></td>
      <td>${l.dueDate || '—'}</td>
    </tr>
  `).join('') || '<tr><td colspan="6">No loans yet.</td></tr>';
}

function renderGoals(el, goals) {
  if (!el) return;
  el.innerHTML = goals.map(g => {
    const pct = Math.min(100, Math.round((g.current / g.target) * 100));
    return `
    <div class="goal-card">
      <div class="goal-top"><span>${g.name}</span><span>${pct}%</span></div>
      <div class="progress-bar"><span style="width:${pct}%"></span></div>
      <div class="goal-meta"><span>${Hisab.currency(g.current)} of ${Hisab.currency(g.target)}</span><span>Due ${g.deadline}</span></div>
    </div>`;
  }).join('') || '<p>No savings goals yet.</p>';
}

function renderInsights(el, tips) {
  if (!el) return;
  el.innerHTML = tips.map(tip => `
    <div class="insight-card"><i class="fa-solid fa-sparkles"></i><p>${tip}</p></div>
  `).join('');
}

function renderCalendar(el, reminders, monthOffset = 0) {
  if (!el) return;
  const today = new Date();
  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear(), month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const reminderDays = new Set(reminders.map(r => r.date));
  let cells = '';
  for (let i = 0; i < firstDay; i++) cells += `<div class="day-cell muted"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === today.toISOString().slice(0, 10);
    cells += `<div class="day-cell ${isToday ? 'today' : ''}">${d}${reminderDays.has(dateStr) ? '<span class="dot-marker"></span>' : ''}</div>`;
  }

  el.innerHTML = `
    <div class="calendar-head">
      <strong>${monthLabel}</strong>
      <span class="text-small">${reminders.length} reminder(s) with alarm</span>
    </div>
    <div class="calendar-grid">
      ${['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => `<div class="day-label">${d}</div>`).join('')}
      ${cells}
    </div>
  `;
}

function exportCSV(transactions, filename = 'hisab-transactions.csv') {
  const header = 'Date,Type,Category,Description,Amount (NRs)\n';
  const rows = transactions.map(t => `${t.date},${t.type},${t.category},"${(t.description || '').replace(/"/g, '')}",${t.amount}`).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ---------------- Simple rule-based chatbot ---------------- */
function chatbotReply(msg) {
  const m = msg.toLowerCase();
  if (m.includes('loan')) return "You can apply for a loan from the Loans section. Green equipment loans need no credit score — just your business justification and expected ROI.";
  if (m.includes('savings') || m.includes('goal')) return "Set a savings goal in the Savings Goals card, then use 'Add Contribution' to track progress toward it.";
  if (m.includes('expense') || m.includes('spend')) return "Use 'Add Expense' to log a transaction. Your Pie Chart updates instantly with the new category breakdown.";
  if (m.includes('repay') || m.includes('payment')) return "Repayments can be recorded from the Loan Repayment section — daily, bi-weekly or monthly, based on your loan schedule.";
  if (m.includes('hi') || m.includes('hello')) return "Hi! I'm your HISAB assistant. Ask me about loans, savings, expenses or repayments.";
  return "I'm a simple demo assistant — try asking about loans, savings goals, expenses, or repayments.";
}

function initChatbot() {
  const fab = document.querySelector('[data-action="toggle-chat"]');
  const win = document.getElementById('chat-window');
  const body = document.getElementById('chat-body');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  if (!fab || !win) return;

  fab.addEventListener('click', () => win.classList.toggle('hidden'));
  document.getElementById('chat-close')?.addEventListener('click', () => win.classList.add('hidden'));

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    body.insertAdjacentHTML('beforeend', `<div class="chat-msg user">${text}</div>`);
    input.value = '';
    body.scrollTop = body.scrollHeight;
    setTimeout(() => {
      body.insertAdjacentHTML('beforeend', `<div class="chat-msg bot">${chatbotReply(text)}</div>`);
      body.scrollTop = body.scrollHeight;
    }, 500);
  });
}
