// Constants
const EXCHANGE_RATES = {
    USD_TO_JPY: 151.67,
    JPY_TO_USD: 1 / 151.67
};

// State Management
let currentCurrency = (() => {
    const stored = localStorage.getItem('currentCurrency');
    return stored || 'JPY';
})();

let currentTab = 'main';
let monthlyBudget = (() => {
    try {
        const stored = localStorage.getItem('monthlyBudget');
        return stored ? JSON.parse(stored) : null;
    } catch (e) {
        console.error('Error loading monthly budget:', e);
        return null;
    }
})();

let transactions = (() => {
    try {
        const stored = localStorage.getItem('budgetTransactions');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Error loading transactions:', e);
        return [];
    }
})();

let recurringTransactions = (() => {
    try {
        const stored = localStorage.getItem('recurringTransactions');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Error loading recurring transactions:', e);
        return [];
    }
})();

// DOM Elements
const elements = {
    form: document.getElementById('transaction-form'),
    descriptionInput: document.getElementById('description'),
    amountInput: document.getElementById('amount'),
    typeSelect: document.getElementById('type'),
    categorySelect: document.getElementById('category'),
    dateInput: document.getElementById('date'),
    transactionsBody: document.getElementById('transactions-body'),
    totalIncomeEl: document.getElementById('total-income'),
    totalExpensesEl: document.getElementById('total-expenses'),
    balanceEl: document.getElementById('balance'),
    toast: document.getElementById('toast'),
    currencyToggle: document.getElementById('currency-toggle'),
    currentCurrencyLabel: document.getElementById('current-currency'),
    exportBtn: document.getElementById('export-btn'),
    importBtn: document.getElementById('import-btn'),
    importFile: document.getElementById('import-file'),
    viewMonthlyBtn: document.getElementById('view-monthly'),
    viewTransactionsBtn: document.getElementById('view-transactions'),
    searchInput: document.getElementById('search'),
    filterType: document.getElementById('filter-type'),
    filterCategory: document.getElementById('filter-category'),
    filterMonth: document.getElementById('filter-month'),
    monthlyContainer: document.getElementById('monthly-container'),
    monthlyView: document.getElementById('monthly-view'),
    transactionContainer: document.querySelector('.container:nth-of-type(4)'),
    goalForm: document.getElementById('goal-form'),
    recurringForm: document.getElementById('recurring-form'),
    goalsList: document.getElementById('goals-list'),
    recurringList: document.getElementById('recurring-list'),
    navTabs: document.querySelectorAll('.nav-tab'),
    tabContents: document.querySelectorAll('.tab-content'),
};

// Navigation Management
const navigationManager = {
    switchTab(tabId) {
        // Remove active class from all tabs and contents
        elements.navTabs.forEach(tab => tab.classList.remove('active'));
        elements.tabContents.forEach(content => content.classList.remove('active'));

        // Add active class to selected tab and content
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(`${tabId}-tab`).classList.add('active');

        // Update UI based on tab
        if (tabId === 'management') {
            uiManager.updateMonthlyView();
        } else if (tabId === 'budget') {
            uiManager.updateBudgetGoals();
            uiManager.updateRecurringList();
        }

        currentTab = tabId;
    }
};

// Utility Functions
const utils = {
    showToast(message, duration = 3000) {
        elements.toast.textContent = message;
        elements.toast.classList.add('show');
        setTimeout(() => elements.toast.classList.remove('show'), duration);
    },

    validateForm() {
        let isValid = true;
        
        document.querySelectorAll('.form-group').forEach(group => {
            group.classList.remove('error');
        });

        if (!elements.descriptionInput.value.trim()) {
            elements.descriptionInput.parentElement.classList.add('error');
            isValid = false;
        }

        const amount = parseFloat(elements.amountInput.value);
        if (isNaN(amount) || amount <= 0) {
            elements.amountInput.parentElement.classList.add('error');
            isValid = false;
        }

        if (!elements.dateInput.value) {
            elements.dateInput.parentElement.classList.add('error');
            isValid = false;
        }

        return isValid;
    },

    convertAmount(amount, fromCurrency, toCurrency) {
        if (fromCurrency === toCurrency) return amount;
        
        if (fromCurrency === 'USD' && toCurrency === 'JPY') {
            return amount * EXCHANGE_RATES.USD_TO_JPY;
        } else if (fromCurrency === 'JPY' && toCurrency === 'USD') {
            return amount * EXCHANGE_RATES.JPY_TO_USD;
        }
        
        return amount;
    },

    formatCurrency(amount) {
        const options = {
            style: 'currency',
            currency: currentCurrency,
            minimumFractionDigits: currentCurrency === 'JPY' ? 0 : 2,
            maximumFractionDigits: currentCurrency === 'JPY' ? 0 : 2
        };
        
        return new Intl.NumberFormat(currentCurrency === 'JPY' ? 'ja-JP' : 'en-US', options).format(amount);
    },

    updateLocalStorage() {
        try {
            localStorage.setItem('budgetTransactions', JSON.stringify(transactions));
        } catch (e) {
            console.error('Error saving transactions:', e);
            this.showToast('Error saving transaction. Please try again.');
        }
    }
};

// Transaction Management
const transactionManager = {
    addTransaction(formData) {
        const transaction = {
            id: Date.now(),
            description: formData.description.trim(),
            amount: parseFloat(formData.amount),
            type: formData.type,
            category: formData.category,
            date: formData.date,
            currency: currentCurrency
        };
        
        transactions.push(transaction);
        utils.updateLocalStorage();
        uiManager.updateUI();
        utils.showToast('Transaction added successfully');
    },

    deleteTransaction(id) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            transactions = transactions.filter(transaction => transaction.id !== id);
            utils.updateLocalStorage();
            uiManager.updateUI();
            utils.showToast('Transaction deleted');
        }
    },

    filterTransactions() {
        const searchTerm = elements.searchInput.value.toLowerCase();
        const typeFilter = elements.filterType.value;
        const categoryFilter = elements.filterCategory.value;
        const monthFilter = elements.filterMonth.value;

        const sortedTransactions = [...transactions].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );

        return sortedTransactions.filter(transaction => {
            const matchesSearch = transaction.description.toLowerCase().includes(searchTerm) ||
                transaction.category.toLowerCase().includes(searchTerm);
            const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
            const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter;
            const matchesMonth = !monthFilter || transaction.date.startsWith(monthFilter);

            return matchesSearch && matchesType && matchesCategory && matchesMonth;
        });
    }
};

// UI Management
const uiManager = {
    updateUI: (() => {
        let updateTimeout;
        
        return function() {
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(() => {
                const filteredTransactions = transactionManager.filterTransactions();
                this.updateFilterOptions();
                this.updateTransactionsTable(filteredTransactions);
                this.updateSummary(filteredTransactions);

                // Only update specific sections based on current tab
                if (currentTab === 'budget') {
                    this.updateBudgetGoals();
                    this.updateRecurringList();
                } else if (currentTab === 'management') {
                    this.updateMonthlyView();
                }
            }, 0);
        };
    })(),

    updateFilterOptions() {
        const categories = new Set();
        transactions.forEach(t => categories.add(t.category));
        
        elements.filterCategory.innerHTML = '<option value="all">All Categories</option>';
        [...categories].sort().forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category.replace(/-/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            elements.filterCategory.appendChild(option);
        });
    },

    updateTransactionsTable(filteredTransactions) {
        elements.transactionsBody.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        filteredTransactions.forEach(transaction => {
            const row = document.createElement('tr');
            const convertedAmount = utils.convertAmount(
                transaction.amount,
                transaction.currency || 'JPY',
                currentCurrency
            );
            
            const dateObj = new Date(transaction.date);
            const formattedDate = dateObj.toLocaleDateString(
                currentCurrency === 'JPY' ? 'ja-JP' : 'en-US',
                { year: 'numeric', month: 'short', day: 'numeric' }
            );
            
            const formattedCategory = transaction.category
                .replace(/-/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${transaction.description}</td>
                <td>${formattedCategory}</td>
                <td>${transaction.type === 'income' ? 'Income' : 'Expense'}</td>
                <td style="color: ${transaction.type === 'income' ? 'var(--success-color)' : 'var(--danger-color)'}">
                    ${utils.formatCurrency(convertedAmount)}
                </td>
                <td>
                    <button class="delete-btn" onclick="transactionManager.deleteTransaction(${transaction.id})">Delete</button>
                </td>
            `;
            
            fragment.appendChild(row);
        });
        
        elements.transactionsBody.appendChild(fragment);
    },

    updateSummary(filteredTransactions) {
        const summary = filteredTransactions.reduce((acc, transaction) => {
            const convertedAmount = utils.convertAmount(
                transaction.amount,
                transaction.currency || 'JPY',
                currentCurrency
            );
            
            if (transaction.type === 'income') {
                acc.income += convertedAmount;
            } else {
                acc.expenses += convertedAmount;
            }
            return acc;
        }, { income: 0, expenses: 0 });
        
        const balance = summary.income - summary.expenses;
        
        elements.totalIncomeEl.textContent = utils.formatCurrency(summary.income);
        elements.totalExpensesEl.textContent = utils.formatCurrency(summary.expenses);
        elements.balanceEl.textContent = utils.formatCurrency(balance);
        elements.balanceEl.style.color = `var(${balance >= 0 ? '--success-color' : '--danger-color'})`;
        elements.amountInput.placeholder = `Enter amount (${currentCurrency})`;
    },

    updateMonthlyView() {
        if (!elements.monthlyView) return;

        // Get last 12 months of data
        const today = new Date();
        const months = Array.from({length: 12}, (_, i) => {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            return d.toISOString().substring(0, 7);
        }).reverse();

        // Calculate monthly totals
        const monthlyData = months.map(month => {
            const monthTransactions = transactions.filter(t => t.date.startsWith(month));
            const income = monthTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + utils.convertAmount(t.amount, t.currency || 'USD', currentCurrency), 0);
            const expenses = monthTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + utils.convertAmount(t.amount, t.currency || 'USD', currentCurrency), 0);
            return { month, income, expenses };
        });

        // Create monthly income/expense chart
        const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
        if (window.monthlyChart) window.monthlyChart.destroy();
        window.monthlyChart = new Chart(monthlyCtx, {
            type: 'bar',
            data: {
                labels: monthlyData.map(d => {
                    const [year, month] = d.month.split('-');
                    return new Date(year, month - 1).toLocaleDateString(undefined, { month: 'short' });
                }),
                datasets: [
                    {
                        label: 'Income',
                        data: monthlyData.map(d => d.income),
                        backgroundColor: 'rgba(46, 204, 113, 0.5)',
                        borderColor: 'rgba(46, 204, 113, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Expenses',
                        data: monthlyData.map(d => d.expenses),
                        backgroundColor: 'rgba(231, 76, 60, 0.5)',
                        borderColor: 'rgba(231, 76, 60, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => utils.formatCurrency(value)
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Monthly Income vs Expenses'
                    },
                    tooltip: {
                        callbacks: {
                            label: context => {
                                const label = context.dataset.label;
                                const value = utils.formatCurrency(context.parsed.y);
                                return `${label}: ${value}`;
                            }
                        }
                    }
                }
            }
        });

        // Calculate category totals for current month
        const currentMonth = new Date().toISOString().substring(0, 7);
        const categoryTotals = transactions
            .filter(t => t.date.startsWith(currentMonth) && t.type === 'expense')
            .reduce((acc, t) => {
                const amount = utils.convertAmount(t.amount, t.currency || 'USD', currentCurrency);
                acc[t.category] = (acc[t.category] || 0) + amount;
                return acc;
            }, {});

        // Create category breakdown chart
        const categoryCtx = document.getElementById('categoryChart').getContext('2d');
        if (window.categoryChart) window.categoryChart.destroy();
        window.categoryChart = new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categoryTotals).map(cat => 
                    cat.replace(/-/g, ' ')
                       .split(' ')
                       .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                       .join(' ')
                ),
                datasets: [{
                    data: Object.values(categoryTotals),
                    backgroundColor: [
                        'rgba(52, 152, 219, 0.8)',
                        'rgba(46, 204, 113, 0.8)',
                        'rgba(155, 89, 182, 0.8)',
                        'rgba(52, 73, 94, 0.8)',
                        'rgba(241, 196, 15, 0.8)',
                        'rgba(230, 126, 34, 0.8)',
                        'rgba(231, 76, 60, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Current Month Expenses by Category'
                    },
                    tooltip: {
                        callbacks: {
                            label: context => {
                                const label = context.label;
                                const value = utils.formatCurrency(context.parsed);
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((context.parsed / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

        // Update monthly summary cards
        elements.monthlyView.innerHTML = monthlyData.slice(-3).reverse().map(data => `
            <div class="monthly-card">
                <h4>${new Date(data.month + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h4>
                <div>Income: ${utils.formatCurrency(data.income)}</div>
                <div>Expenses: ${utils.formatCurrency(data.expenses)}</div>
                <div>Balance: ${utils.formatCurrency(data.income - data.expenses)}</div>
            </div>
        `).join('');

        // Add spending trends analysis
        const trends = this.analyzeSpendingTrends(monthlyData);
        const trendsSummary = document.createElement('div');
        trendsSummary.className = 'trends-summary';
        trendsSummary.innerHTML = `
            <h3>Spending Insights</h3>
            <div class="trends-grid">
                <div class="trend-item ${trends.monthlyChange > 0 ? 'trend-up' : 'trend-down'}">
                    <h4>Monthly Change</h4>
                    <p>${Math.abs(trends.monthlyChange).toFixed(1)}% ${trends.monthlyChange > 0 ? '↑' : '↓'}</p>
                    <span>from last month</span>
                </div>
                <div class="trend-item">
                    <h4>Average Monthly Spending</h4>
                    <p>${utils.formatCurrency(trends.averageSpending)}</p>
                    <span>last 3 months</span>
                </div>
                <div class="trend-item ${trends.topCategory.change > 0 ? 'trend-up' : 'trend-down'}">
                    <h4>Top Spending Category</h4>
                    <p>${trends.topCategory.name}</p>
                    <span>${Math.abs(trends.topCategory.change).toFixed(1)}% ${trends.topCategory.change > 0 ? '↑' : '↓'}</span>
                </div>
            </div>
            <div class="savings-potential">
                <h4>Savings Opportunities</h4>
                <ul>
                    ${trends.savingsOpportunities.map(opp => `
                        <li>
                            <span class="opportunity-icon">💡</span>
                            ${opp}
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
        elements.monthlyView.insertBefore(trendsSummary, elements.monthlyView.firstChild);
    },

    analyzeSpendingTrends(monthlyData) {
        const last3Months = monthlyData.slice(-3);
        const currentMonth = last3Months[2];
        const lastMonth = last3Months[1];
        
        // Calculate monthly change
        const monthlyChange = lastMonth.expenses > 0 
            ? ((currentMonth.expenses - lastMonth.expenses) / lastMonth.expenses) * 100
            : 0;

        // Calculate average spending
        const averageSpending = last3Months.reduce((sum, month) => sum + month.expenses, 0) / 3;

        // Analyze category trends
        const currentMonthStr = new Date().toISOString().substring(0, 7);
        const lastMonthDate = new Date();
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
        const lastMonthStr = lastMonthDate.toISOString().substring(0, 7);

        const currentCategories = this.getCategoryTotals(currentMonthStr);
        const lastCategories = this.getCategoryTotals(lastMonthStr);

        let topCategory = { name: 'None', amount: 0, change: 0 };
        Object.entries(currentCategories).forEach(([category, amount]) => {
            const lastAmount = lastCategories[category] || 0;
            const change = lastAmount > 0 ? ((amount - lastAmount) / lastAmount) * 100 : 0;
            
            if (amount > topCategory.amount) {
                topCategory = {
                    name: category.replace(/-/g, ' ')
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' '),
                    amount: amount,
                    change: change
                };
            }
        });

        // Generate savings opportunities
        const savingsOpportunities = [];
        if (monthlyChange > 10) {
            savingsOpportunities.push('Your spending has increased significantly. Consider reviewing your recent expenses.');
        }
        if (topCategory.change > 15) {
            savingsOpportunities.push(`${topCategory.name} spending has increased by ${topCategory.change.toFixed(1)}%. Look for ways to reduce these expenses.`);
        }
        if (currentMonth.expenses > currentMonth.income) {
            savingsOpportunities.push('Your expenses exceed your income. Consider creating a stricter budget.');
        }
        if (savingsOpportunities.length === 0) {
            savingsOpportunities.push('Great job managing your expenses! Keep maintaining your current spending habits.');
        }

        return {
            monthlyChange,
            averageSpending,
            topCategory,
            savingsOpportunities
        };
    },

    getCategoryTotals(monthStr) {
        return transactions
            .filter(t => t.date.startsWith(monthStr) && t.type === 'expense')
            .reduce((acc, t) => {
                const amount = utils.convertAmount(t.amount, t.currency || 'USD', currentCurrency);
                acc[t.category] = (acc[t.category] || 0) + amount;
                return acc;
            }, {});
    },

    updateBudgetGoals() {
        if (!elements.goalsList) return;
        
        elements.goalsList.innerHTML = '';
        const currentMonth = new Date().toISOString().substring(0, 7);
        
        if (monthlyBudget) {
            const goalAmount = utils.convertAmount(monthlyBudget.amount, monthlyBudget.currency, currentCurrency);
            
            const spending = transactions
                .filter(t => t.date.startsWith(currentMonth) && t.type === 'expense')
                .reduce((sum, t) => sum + utils.convertAmount(t.amount, t.currency || 'USD', currentCurrency), 0);
            
            const percentage = (spending / goalAmount) * 100;

            const goalItem = document.createElement('div');
            goalItem.className = 'goal-item';
            goalItem.innerHTML = `
                <div>
                    <strong>Monthly Budget</strong><br>
                    ${utils.formatCurrency(spending)} / ${utils.formatCurrency(goalAmount)}
                </div>
                <div class="goal-progress">
                    <div class="goal-bar ${percentage >= 90 ? 'goal-warning' : ''}" 
                         style="width: ${Math.min(percentage, 100)}%"></div>
                </div>
                <button class="delete-btn" onclick="deleteBudgetGoal()">×</button>
            `;
            elements.goalsList.appendChild(goalItem);
        }
    },

    updateRecurringList() {
        const recurringList = document.getElementById('recurring-list');
        if (!recurringList) return;

        recurringList.innerHTML = '';
        
        if (recurringTransactions.length === 0) {
            recurringList.innerHTML = '<p class="empty-message">No recurring transactions added yet.</p>';
            return;
        }

        recurringTransactions.forEach(recurring => {
            const amount = utils.formatCurrency(recurring.amount, recurring.currency);
            const nextDate = this.calculateNextDate(recurring);
            
            const item = document.createElement('div');
            item.className = 'recurring-transaction';
            item.innerHTML = `
                <div class="recurring-info">
                    <h4>${recurring.description}</h4>
                    <div class="recurring-details">
                        <span class="recurring-amount ${recurring.type}">${amount}</span>
                        <span class="recurring-badge">${recurring.frequency}</span>
                        <span class="recurring-category">${recurring.category}</span>
                    </div>
                    <div class="recurring-dates">
                        <span>Started: ${recurring.startDate}</span>
                        <span>Next: ${nextDate}</span>
                    </div>
                </div>
                <div class="recurring-controls">
                    <button onclick="recurringManager.deleteRecurring(${recurring.id})" class="btn btn-danger">Delete</button>
                </div>
            `;
            recurringList.appendChild(item);
        });
    },

    calculateNextDate(recurring) {
        const today = new Date();
        let nextDate = new Date(recurring.startDate);
        
        while (nextDate <= today) {
            switch (recurring.frequency) {
                case 'weekly':
                    nextDate.setDate(nextDate.getDate() + 7);
                    break;
                case 'monthly':
                    nextDate.setMonth(nextDate.getMonth() + 1);
                    break;
                case 'yearly':
                    nextDate.setFullYear(nextDate.getFullYear() + 1);
                    break;
            }
        }
        
        return nextDate.toISOString().split('T')[0];
    }
};

// Recurring Transactions Management
const recurringManager = {
    addRecurring(formData) {
        const recurring = {
            id: Date.now(),
            description: formData.description.trim(),
            amount: parseFloat(formData.amount),
            type: formData.type,
            category: formData.category,
            frequency: formData.frequency,
            startDate: formData.startDate,
            currency: currentCurrency
        };
        
        recurringTransactions.push(recurring);
        this.saveRecurring();
        uiManager.updateRecurringList();
        utils.showToast('Recurring transaction added successfully');
    },

    deleteRecurring(id) {
        if (confirm('Are you sure you want to delete this recurring transaction?')) {
            recurringTransactions = recurringTransactions.filter(r => r.id !== id);
            this.saveRecurring();
            uiManager.updateRecurringList();
            utils.showToast('Recurring transaction deleted');
        }
    },

    saveRecurring() {
        try {
            localStorage.setItem('recurringTransactions', JSON.stringify(recurringTransactions));
        } catch (e) {
            console.error('Error saving recurring transactions:', e);
            utils.showToast('Error saving recurring transaction. Please try again.');
        }
    },

    processRecurringTransactions() {
        const today = new Date();
        const lastCheck = new Date(localStorage.getItem('lastRecurringCheck') || '2000-01-01');
        let transactionsAdded = false;
        
        recurringTransactions.forEach(recurring => {
            const startDate = new Date(recurring.startDate);
            if (startDate > today) return;

            let nextDate = new Date(recurring.startDate);
            while (nextDate <= today) {
                if (nextDate > lastCheck) {
                    // Add transaction
                    const transaction = {
                        id: Date.now() + Math.random(),
                        description: `[Recurring] ${recurring.description}`,
                        amount: recurring.amount,
                        type: recurring.type,
                        category: recurring.category,
                        date: nextDate.toISOString().split('T')[0],
                        currency: recurring.currency
                    };
                    transactions.push(transaction);
                    transactionsAdded = true;
                }

                // Calculate next date
                switch (recurring.frequency) {
                    case 'weekly':
                        nextDate.setDate(nextDate.getDate() + 7);
                        break;
                    case 'monthly':
                        nextDate.setMonth(nextDate.getMonth() + 1);
                        break;
                    case 'yearly':
                        nextDate.setFullYear(nextDate.getFullYear() + 1);
                        break;
                }
            }
        });

        if (transactionsAdded) {
            utils.updateLocalStorage();
            uiManager.updateUI();
            utils.showToast('Recurring transactions have been processed');
        }
    }
};

// Event Listeners
function initializeEventListeners() {
    // Set default date to today
    elements.dateInput.valueAsDate = new Date();

    // Initialize currency toggle based on stored preference
    if (elements.currencyToggle) {
        elements.currencyToggle.checked = currentCurrency === 'JPY';
        elements.currentCurrencyLabel.textContent = `Current: ${currentCurrency}`;
        elements.amountInput.placeholder = `Enter amount (${currentCurrency})`;
        elements.amountInput.step = currentCurrency === 'JPY' ? '1' : '0.01';
        const currencySymbol = currentCurrency === 'JPY' ? '¥' : '$';
        elements.amountInput.previousElementSibling.textContent = `Amount (${currencySymbol})`;
    }

    // Form submission
    elements.form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!utils.validateForm()) {
            utils.showToast('Please fill in all required fields correctly');
            return;
        }
        
        const formData = {
            description: elements.descriptionInput.value,
            amount: elements.amountInput.value,
            type: elements.typeSelect.value,
            category: elements.categorySelect.value,
            date: elements.dateInput.value
        };
        
        transactionManager.addTransaction(formData);
        elements.form.reset();
        elements.dateInput.valueAsDate = new Date();
    });

    // Currency toggle
    elements.currencyToggle.addEventListener('change', function() {
        currentCurrency = this.checked ? 'JPY' : 'USD';
        localStorage.setItem('currentCurrency', currentCurrency);
        elements.currentCurrencyLabel.textContent = `Current: ${currentCurrency}`;
        elements.amountInput.placeholder = `Enter amount (${currentCurrency})`;
        elements.amountInput.step = currentCurrency === 'JPY' ? '1' : '0.01';
        const currencySymbol = currentCurrency === 'JPY' ? '¥' : '$';
        elements.amountInput.previousElementSibling.textContent = `Amount (${currencySymbol})`;
        uiManager.updateUI();
    });

    // Search and filters
    elements.searchInput.addEventListener('input', () => uiManager.updateUI());
    elements.filterType.addEventListener('change', () => uiManager.updateUI());
    elements.filterCategory.addEventListener('change', () => uiManager.updateUI());
    elements.filterMonth.addEventListener('change', () => uiManager.updateUI());

    // Type select change
    elements.typeSelect.addEventListener('change', function() {
        const type = this.value;
        elements.categorySelect.innerHTML = '';
        
        const categories = type === 'income' 
            ? ['Salary', 'Freelance', 'Investments', 'Gifts', 'Other']
            : ['Food & Dining', 'Transportation', 'Utilities', 'Housing', 
               'Entertainment', 'Healthcare', 'Education', 'Shopping', 'Other'];

        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.toLowerCase().replace(' & ', '-').replace(' ', '-');
            option.textContent = cat;
            elements.categorySelect.appendChild(option);
        });
    });

    // Navigation tabs
    elements.navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            navigationManager.switchTab(tabId);
        });
    });

    // Export/Import buttons
    if (elements.exportBtn) {
        elements.exportBtn.addEventListener('click', () => {
            const dataStr = JSON.stringify(transactions);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const exportFileDefaultName = `budget_data_${new Date().toISOString().split('T')[0]}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
        });
    }

    if (elements.importBtn && elements.importFile) {
        elements.importBtn.addEventListener('click', () => {
            elements.importFile.click();
        });

        elements.importFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    transactions = importedData;
                    utils.updateLocalStorage();
                    uiManager.updateUI();
                    utils.showToast('Data imported successfully');
                } catch (error) {
                    utils.showToast('Error importing data. Please check the file format.');
                }
            };
            reader.readAsText(file);
        });
    }

    // Budget goal form submission
    if (elements.goalForm) {
        elements.goalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const amount = parseFloat(document.getElementById('goal-amount').value);
            
            if (isNaN(amount) || amount <= 0) {
                utils.showToast('Please enter a valid amount');
                return;
            }

            monthlyBudget = {
                amount: amount,
                currency: currentCurrency
            };

            localStorage.setItem('monthlyBudget', JSON.stringify(monthlyBudget));
            uiManager.updateBudgetGoals();
            utils.showToast('Monthly budget goal has been set');
            elements.goalForm.reset();
        });
    }

    // Recurring transaction form submission
    if (elements.recurringForm) {
        elements.recurringForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const formData = {
                description: document.getElementById('recurring-description').value,
                amount: document.getElementById('recurring-amount').value,
                type: document.getElementById('recurring-type').value,
                category: document.getElementById('recurring-category').value,
                frequency: document.getElementById('recurring-frequency').value,
                startDate: document.getElementById('recurring-start').value
            };
            
            if (!formData.description || !formData.amount || !formData.startDate) {
                utils.showToast('Please fill in all required fields');
                return;
            }

            recurringManager.addRecurring(formData);
            elements.recurringForm.reset();
            document.getElementById('recurring-start').valueAsDate = new Date();
        });
    }

    // Inner tabs in budget planning
    const budgetTabs = document.querySelectorAll('.tabs .tab');
    const budgetSections = {
        'budget-goals': document.getElementById('budget-goals-section'),
        'recurring': document.getElementById('recurring-section')
    };

    // Show budget goals section by default
    Object.values(budgetSections).forEach(section => {
        if (section) section.style.display = 'none';
    });
    if (budgetSections['budget-goals']) {
        budgetSections['budget-goals'].style.display = 'block';
    }

    budgetTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            budgetTabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Hide all sections
            Object.values(budgetSections).forEach(section => {
                if (section) section.style.display = 'none';
            });
            
            // Show selected section
            const targetId = tab.getAttribute('data-tab');
            if (budgetSections[targetId]) {
                budgetSections[targetId].style.display = 'block';
                
                // Update the relevant section
                if (targetId === 'budget-goals') {
                    uiManager.updateBudgetGoals();
                } else if (targetId === 'recurring') {
                    uiManager.updateRecurringList();
                }
            }
        });
    });
}

// Add delete budget goal function
function deleteBudgetGoal() {
    monthlyBudget = null;
    localStorage.removeItem('monthlyBudget');
    uiManager.updateBudgetGoals();
    utils.showToast('Monthly budget goal has been removed');
}

// Initialize the application
function initializeApp() {
    initializeEventListeners();
    elements.typeSelect.dispatchEvent(new Event('change'));
    uiManager.updateUI();

    // Process recurring transactions on page load
    const lastCheck = localStorage.getItem('lastRecurringCheck');
    const today = new Date().toISOString().split('T')[0];
    
    if (lastCheck !== today) {
        recurringManager.processRecurringTransactions();
        localStorage.setItem('lastRecurringCheck', today);
    }
}

// Start the application
document.addEventListener('DOMContentLoaded', initializeApp); 
