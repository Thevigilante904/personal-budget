// Constants
const EXCHANGE_RATES = {
    USD_TO_JPY: 151.67,
    JPY_TO_USD: 1 / 151.67
};

// State Management
let currentCurrency = 'USD';
let currentTab = 'main';
let transactions = (() => {
    try {
        const stored = localStorage.getItem('budgetTransactions');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Error loading transactions:', e);
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
                transaction.currency || 'USD',
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
                transaction.currency || 'USD',
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
    },

    updateBudgetGoals() {
        if (!elements.goalsList) return;
        
        elements.goalsList.innerHTML = '';
        const currentMonth = new Date().toISOString().substring(0, 7);
        
        Object.entries(budgetGoals).forEach(([category, goal]) => {
            const goalAmount = utils.convertAmount(goal.amount, goal.currency, currentCurrency);
            
            const spending = transactions
                .filter(t => t.category === category && t.date.startsWith(currentMonth) && t.type === 'expense')
                .reduce((sum, t) => sum + utils.convertAmount(t.amount, t.currency || 'USD', currentCurrency), 0);
            
            const percentage = (spending / goalAmount) * 100;
            const formattedCategory = category
                .replace(/-/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            const goalItem = document.createElement('div');
            goalItem.className = 'goal-item';
            goalItem.innerHTML = `
                <div>
                    <strong>${formattedCategory}</strong><br>
                    ${utils.formatCurrency(spending)} / ${utils.formatCurrency(goalAmount)}
                </div>
                <div class="goal-progress">
                    <div class="goal-bar ${percentage >= 90 ? 'goal-warning' : ''}" 
                         style="width: ${Math.min(percentage, 100)}%"></div>
                </div>
                <button class="delete-btn" onclick="budgetManager.deleteBudgetGoal('${category}')">×</button>
            `;
            elements.goalsList.appendChild(goalItem);
        });
    },

    updateRecurringList() {
        if (!elements.recurringList) return;
        
        elements.recurringList.innerHTML = '';
        
        recurringTransactions.forEach(recurring => {
            const item = document.createElement('div');
            item.className = 'recurring-transaction';
            
            const formattedCategory = recurring.category
                .replace(/-/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            item.innerHTML = `
                <div>
                    <strong>${recurring.description}</strong>
                    <span class="recurring-badge">${recurring.frequency}</span>
                </div>
                <div>${formattedCategory} - ${utils.formatCurrency(utils.convertAmount(recurring.amount, recurring.currency, currentCurrency))}</div>
                <div class="recurring-controls">
                    <button class="delete-btn" onclick="recurringManager.deleteRecurring(${recurring.id})">Delete</button>
                </div>
            `;
            elements.recurringList.appendChild(item);
        });
    }
};

// Event Listeners
function initializeEventListeners() {
    // Set default date to today
    elements.dateInput.valueAsDate = new Date();

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
        elements.currentCurrencyLabel.textContent = `Current: ${currentCurrency}`;
        elements.amountInput.placeholder = `Enter amount (${currentCurrency})`;
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
