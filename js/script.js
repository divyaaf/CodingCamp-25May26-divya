// ─── Theme Toggle ─────────────────────────────────────────────────────────────
// Reads/writes the user's preferred theme to localStorage under 'ebv_theme'.
// Applies the theme by setting data-theme="dark" on <html> (or removing it).
const ThemeManager = {
  STORAGE_KEY: 'ebv_theme',
  DARK: 'dark',
  LIGHT: 'light',

  /**
   * Returns the saved theme from localStorage, or 'light' as the default.
   * @returns {'dark'|'light'}
   */
  getSavedTheme() {
    return localStorage.getItem(this.STORAGE_KEY) === this.DARK
      ? this.DARK
      : this.LIGHT;
  },

  /**
   * Applies the given theme to the document and updates the toggle button.
   * @param {'dark'|'light'} theme
   */
  applyTheme(theme) {
    const html = document.documentElement;
    const btn  = document.querySelector('#theme-toggle');
    const icon = document.querySelector('#theme-icon');

    if (theme === this.DARK) {
      html.setAttribute('data-theme', 'dark');
      if (btn)  btn.setAttribute('aria-label', 'Switch to light mode');
      if (icon) icon.textContent = '☀️';
    } else {
      html.removeAttribute('data-theme');
      if (btn)  btn.setAttribute('aria-label', 'Switch to dark mode');
      if (icon) icon.textContent = '🌙';
    }
  },

  /**
   * Toggles between dark and light, persists the choice, and re-applies.
   */
  toggle() {
    const current = document.documentElement.getAttribute('data-theme') === 'dark'
      ? this.DARK
      : this.LIGHT;
    const next = current === this.DARK ? this.LIGHT : this.DARK;
    localStorage.setItem(this.STORAGE_KEY, next);
    this.applyTheme(next);
  },

  /**
   * Initialises the theme on page load from the saved preference.
   */
  init() {
    this.applyTheme(this.getSavedTheme());
    const btn = document.querySelector('#theme-toggle');
    if (btn) {
      btn.addEventListener('click', () => ThemeManager.toggle());
    }
  }
};

// ─── SortManager ─────────────────────────────────────────────────────────────
// Tracks the active sort option and applies it to a copy of the transactions.
// Never mutates the original array stored in StateManager.
const SortManager = {
  /** @type {'default'|'amount-desc'|'amount-asc'|'category'} */
  _current: 'default',

  /** @returns {'default'|'amount-desc'|'amount-asc'|'category'} */
  getCurrent() {
    return this._current;
  },

  /** @param {'default'|'amount-desc'|'amount-asc'|'category'} value */
  setCurrent(value) {
    this._current = value;
  },

  /**
   * Returns a sorted shallow copy of the provided transactions array.
   * The original array is never mutated.
   * @param {Array} transactions
   * @returns {Array}
   */
  apply(transactions) {
    const copy = [...transactions];
    switch (this._current) {
      case 'amount-desc':
        return copy.sort((a, b) => b.amount - a.amount);
      case 'amount-asc':
        return copy.sort((a, b) => a.amount - b.amount);
      case 'category':
        return copy.sort((a, b) => a.category.localeCompare(b.category));
      default:
        // 'default' — preserve insertion order (addedAt ascending)
        return copy.sort((a, b) => a.addedAt - b.addedAt);
    }
  }
};

// ─── BudgetManager ───────────────────────────────────────────────────────────
// Persists the monthly budget limit in localStorage under 'ebv_budget_limit'.
// Compares the current total against the limit and drives the warning UI.
const BudgetManager = {
  STORAGE_KEY: 'ebv_budget_limit',

  /**
   * Returns the saved limit as a positive number, or null if unset/invalid.
   * @returns {number|null}
   */
  getLimit() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (raw === null) return null;
    const n = parseFloat(raw);
    return (!isNaN(n) && n > 0) ? n : null;
  },

  /**
   * Saves a new limit. Passing null or 0 clears the stored value.
   * @param {number|null} value
   */
  setLimit(value) {
    if (value === null || value <= 0 || isNaN(value)) {
      localStorage.removeItem(this.STORAGE_KEY);
    } else {
      localStorage.setItem(this.STORAGE_KEY, String(value));
    }
  },

  /**
   * Compares total against the saved limit and updates the warning UI.
   * Adds/removes the CSS class 'balance--over-budget' on #balance-amount
   * and shows/hides the #budget-warning message.
   * @param {number} total - Current total expenses.
   */
  applyWarning(total) {
    const amountEl  = document.querySelector('#balance-amount');
    const warningEl = document.querySelector('#budget-warning');
    if (!amountEl || !warningEl) return;

    const limit = this.getLimit();
    const isOver = limit !== null && total > limit;

    amountEl.classList.toggle('balance--over-budget', isOver);

    if (isOver) {
      const formatter = new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR',
        minimumFractionDigits: 0, maximumFractionDigits: 0
      });
      warningEl.textContent =
        `⚠️ Over budget by ${formatter.format(total - limit)}`;
    } else {
      warningEl.textContent = '';
    }
  }
};

// ─── CategoryManager ─────────────────────────────────────────────────────────
// Single source of truth for the category list and their chart colors.
// Persists to localStorage under 'ebv_categories'.
// Color lookup is always safe — unknown categories get an auto-generated color.
const CategoryManager = {
  STORAGE_KEY: 'ebv_categories',
  DEFAULTS: ['Food', 'Transport', 'Fun'],

  // Ordered palette for the first N categories (covers the 3 defaults + extras)
  _palette: [
    '#FF6384', // Food      — pink-red
    '#36A2EB', // Transport — blue
    '#FFCE56', // Fun       — yellow
    '#4BC0C0', // teal
    '#9966FF', // purple
    '#FF9F40', // orange
    '#C9CBCF', // grey
    '#E7E9ED', // light grey
    '#71B37C', // green
    '#F7464A', // red
  ],

  /** @type {string[]} in-memory list, kept in sync with localStorage */
  _categories: [],

  /**
   * Loads categories from localStorage, falling back to the three defaults.
   * Also seeds any missing colors into the color map.
   */
  init() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      this._categories = raw ? JSON.parse(raw) : ['Food', 'Transport', 'Fun'];
    } catch {
      this._categories = ['Food', 'Transport', 'Fun'];
    }
    // Ensure localStorage always has a value after init
    this._persist();
  },

  /** @returns {string[]} shallow copy of the category list */
  getAll() {
    return [...this._categories];
  },

  /**
   * Adds a new category after validation.
   * Returns null on success, or an error string on failure.
   * @param {string} name
   * @returns {string|null}
   */
  add(name) {
    const trimmed = name.trim();
    if (trimmed.length === 0) return 'Category name cannot be empty.';
    if (trimmed.length > 30)  return 'Category name must be 30 characters or fewer.';
    if (this._categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      return `"${trimmed}" already exists.`;
    }
    this._categories.push(trimmed);
    this._persist();
    return null; // success
  },

  /**
   * Removes a custom category by name.
   * Returns null on success, or an error string on failure:
   *   - Empty / not selected
   *   - Is a default category
   *   - Is used by at least one existing transaction
   * @param {string} name
   * @param {Array} transactions - current transaction list for usage check
   * @returns {string|null}
   */
  remove(name, transactions) {
    if (!name) return 'Please select a category to delete.';

    if (this.DEFAULTS.includes(name)) {
      return `"${name}" is a default category and cannot be deleted.`;
    }

    const inUse = transactions.some(tx => tx.category === name);
    if (inUse) {
      return 'Cannot delete this category because it is currently used in your expenses.';
    }

    this._categories = this._categories.filter(c => c !== name);
    this._persist();
    return null; // success
  },

  /**
   * Returns the chart color for a given category name.
   * Uses the palette slot matching the category's index; wraps around for
   * categories beyond the palette length, and generates an HSL fallback
   * for any category not found in the list at all.
   * @param {string} category
   * @returns {string} CSS color string
   */
  colorFor(category) {
    const idx = this._categories.indexOf(category);
    if (idx === -1) {
      // Unknown category — derive a stable color from the name's char codes
      let hash = 0;
      for (let i = 0; i < category.length; i++) {
        hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
      }
      return `hsl(${hash % 360}, 65%, 55%)`;
    }
    return this._palette[idx % this._palette.length];
  },

  /** Writes the current list to localStorage. */
  _persist() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._categories));
  },

  /**
   * Rebuilds the <select id="item-category"> options from the current list.
   * Preserves the currently selected value if it still exists.
   */
  renderDropdown() {
    const select = document.querySelector('#item-category');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">-- Select Category --</option>';
    for (const cat of this._categories) {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    }
    // Restore selection if still valid
    if (current && this._categories.includes(current)) {
      select.value = current;
    }
  }
};

// ─── StateManager ────────────────────────────────────────────────────────────
// Single source of truth for the in-memory transaction list.
// All reads go through the getter methods; mutations only via add/remove.
const StateManager = {
  _transactions: [],

  /**
   * Replaces the internal array with the provided transactions.
   * Called once on page load after reading from localStorage.
   * @param {Array} transactions
   */
  init(transactions) {
    this._transactions = transactions;
  },

  /**
   * Appends a transaction object to the internal array.
   * @param {{ id: string, name: string, amount: number, category: string, addedAt: number }} tx
   */
  addTransaction(tx) {
    this._transactions.push(tx);
  },

  /**
   * Removes the transaction whose id matches the given id.
   * @param {string} id
   */
  removeTransaction(id) {
    this._transactions = this._transactions.filter(tx => tx.id !== id);
  },

  /**
   * Returns a shallow copy of the transactions array so callers cannot
   * mutate the internal state directly.
   * @returns {Array}
   */
  getTransactions() {
    return [...this._transactions];
  },

  /**
   * Returns the sum of all transaction amounts.
   * Returns 0 when there are no transactions.
   * @returns {number}
   */
  getTotalBalance() {
    return this._transactions.reduce((sum, tx) => sum + tx.amount, 0);
  },

  /**
   * Returns an object with the total amount spent per category.
   * Dynamically built from CategoryManager so custom categories are included.
   * @returns {Object.<string, number>}
   */
  getCategoryTotals() {
    const totals = {};
    for (const cat of CategoryManager.getAll()) {
      totals[cat] = 0;
    }
    for (const tx of this._transactions) {
      if (tx.category in totals) {
        totals[tx.category] += tx.amount;
      } else {
        // Transaction belongs to a category not in the current list
        // (e.g. loaded from storage before a category was removed — keep it)
        totals[tx.category] = (totals[tx.category] || 0) + tx.amount;
      }
    }
    return totals;
  }
};

// ─── Storage ─────────────────────────────────────────────────────────────────
// Direct localStorage helpers. No separate service object — just two functions.

/**
 * Reads the transaction list from localStorage.
 * Wraps JSON.parse in try/catch so corrupt data never crashes the app.
 * Returns [] on an empty key or a parse error, and removes the corrupt key
 * before returning so the app starts from a clean empty state.
 * Satisfies Requirements 6.1, 6.2, 6.4.
 * @returns {Array}
 */
function loadTransactions() {
  try {
    const raw = localStorage.getItem('ebv_transactions');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    localStorage.removeItem('ebv_transactions');
    return [];
  }
}

/**
 * Persists the current transaction list to localStorage.
 * Satisfies Requirements 6.1, 6.2.
 * @param {Array} transactions
 */
function saveTransactions(transactions) {
  localStorage.setItem('ebv_transactions', JSON.stringify(transactions));
}

// ─── Renderer ─────────────────────────────────────────────────────────────────
// Owns all DOM mutations. Reads from StateManager; never writes to it.
const Renderer = {
  /**
   * Renders the transaction list into the DOM.
   *
   * - When `transactions` is empty: hides the <ul> and shows #empty-state.
   * - When `transactions` is non-empty: shows the <ul>, hides #empty-state,
   *   clears the list, then appends one <li> per transaction containing the
   *   item name, category, IDR-formatted amount, and a delete button.
   *
   * Satisfies Requirements 2.1, 2.4, 2.5, 3.1.
   *
   * @param {Array<{ id: string, name: string, amount: number, category: string, addedAt: number }>} transactions
   */
  renderTransactionList(transactions) {
    const list = document.querySelector('#transaction-list');
    const emptyState = document.querySelector('#empty-state');

    if (transactions.length === 0) {
      list.style.display = 'none';
      emptyState.style.display = '';
      return;
    }

    // Non-empty: show list, hide empty state
    list.style.display = '';
    emptyState.style.display = 'none';

    // Clear existing items
    list.innerHTML = '';

    const formatter = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    for (const tx of transactions) {
      const li = document.createElement('li');
      li.dataset.id = tx.id;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'tx-name';
      nameSpan.textContent = tx.name;

      const categorySpan = document.createElement('span');
      categorySpan.className = 'tx-category';
      categorySpan.textContent = tx.category;

      const amountSpan = document.createElement('span');
      amountSpan.className = 'tx-amount';
      amountSpan.textContent = formatter.format(tx.amount);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.setAttribute('aria-label', `Delete ${tx.name}`);
      deleteBtn.textContent = '×';

      li.appendChild(nameSpan);
      li.appendChild(categorySpan);
      li.appendChild(amountSpan);
      li.appendChild(deleteBtn);

      list.appendChild(li);
    }
  },

  /**
   * Updates the balance display with the IDR-formatted total and applies
   * the over-budget warning if a limit is set.
   *
   * Satisfies Requirements 4.1, 4.2, 4.3.
   *
   * @param {number} total - The sum of all transaction amounts.
   */
  updateBalance(total) {
    const balanceEl = document.querySelector('#balance-amount');
    const formatter = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    balanceEl.textContent = formatter.format(total);
    BudgetManager.applyWarning(total);
  },

  /**
   * Holds the Chart.js instance so it can be mutated on subsequent renders
   * rather than destroyed and recreated (avoids flicker).
   * @type {Chart|null}
   */
  _chartInstance: null,

  /**
   * Renders or updates the spending pie chart.
   *
   * - When all category totals are 0: hides the canvas and shows
   *   #chart-empty-msg, then returns early.
   * - On the first call with data: creates a new Chart.js pie chart on
   *   #spending-chart with a custom legend showing each category's percentage.
   * - On subsequent calls: mutates the existing chart's data in-place and
   *   calls update() to avoid destroying and recreating the instance.
   *
   * Satisfies Requirements 5.1, 5.2, 5.3, 5.4.
   *
   * @param {{ Food: number, Transport: number, Fun: number }} categoryTotals
   */
  updateChart(categoryTotals) {
    const canvas = document.querySelector('#spending-chart');
    const msg = document.querySelector('#chart-empty-msg');

    // If all totals are zero, show the empty message and hide the chart
    if (Object.values(categoryTotals).every(v => v === 0)) {
      canvas.style.display = 'none';
      msg.style.display = '';
      return;
    }

    // At least one category has spending — show the chart, hide the message
    canvas.style.display = '';
    msg.style.display = 'none';

    // Build arrays only for categories that have spending
    const labels = Object.keys(categoryTotals).filter(k => categoryTotals[k] > 0);
    const data = labels.map(k => categoryTotals[k]);
    const backgroundColors = labels.map(k => CategoryManager.colorFor(k));

    if (this._chartInstance === null) {
      // First render — create the Chart.js instance
      this._chartInstance = new Chart(canvas, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: backgroundColors
          }]
        },
        options: {
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                generateLabels(chart) {
                  const dataset = chart.data.datasets[0];
                  const total = dataset.data.reduce((a, b) => a + b, 0);
                  return chart.data.labels.map((label, i) => {
                    const value = dataset.data[i];
                    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                    return {
                      text: `${label} — ${pct}%`,
                      fillStyle: dataset.backgroundColor[i],
                      hidden: false,
                      index: i
                    };
                  });
                }
              }
            }
          }
        }
      });
    } else {
      // Subsequent renders — mutate existing instance to avoid flicker
      this._chartInstance.data.labels = labels;
      this._chartInstance.data.datasets[0].data = data;
      this._chartInstance.data.datasets[0].backgroundColor = backgroundColors;
      this._chartInstance.update();
    }
  },

  /**
   * Full re-render of all UI components from the current StateManager state.
   *
   * The transaction list is rendered in the currently selected sort order.
   * Balance and chart always use the full unsorted data so totals are unaffected.
   *
   * Satisfies Requirements 1.2, 3.3, 4.2, 5.2.
   */
  render() {
    const sorted = SortManager.apply(StateManager.getTransactions());
    this.renderTransactionList(sorted);
    this.updateBalance(StateManager.getTotalBalance());
    this.updateChart(StateManager.getCategoryTotals());
  }
};

// ─── EventHandlers ────────────────────────────────────────────────────────────
// Owns all user-interaction wiring. Reads from the DOM; delegates state
// mutations to StateManager and persistence to saveTransactions.
const EventHandlers = {
  /**
   * Handles the expense form's submit event.
   *
   * Steps:
   *  1. Prevent the default browser form submission.
   *  2. Read raw values from #item-name, #item-amount, #item-category.
   *  3. Clear all .field-error spans so stale messages don't linger.
   *  4. Validate each field; on any failure populate the relevant error span
   *     and return early without touching state.
   *  5. On full success: build a transaction object, persist it, re-render,
   *     and reset the form fields.
   *
   * Satisfies Requirements 1.1, 1.2, 1.3, 1.4, 1.5.
   *
   * @param {Event} event - The submit event fired by #expense-form.
   */
  handleFormSubmit(event) {
    event.preventDefault();

    // ── 1. Read raw values ──────────────────────────────────────────────────
    const nameInput     = document.querySelector('#item-name');
    const amountInput   = document.querySelector('#item-amount');
    const categoryInput = document.querySelector('#item-category');

    const nameValue     = nameInput.value;
    const amountValue   = amountInput.value;
    const categoryValue = categoryInput.value;

    // ── 2. Clear all existing field errors ──────────────────────────────────
    document.querySelectorAll('.field-error').forEach(span => {
      span.textContent = '';
    });

    // ── 3. Validate ─────────────────────────────────────────────────────────
    let hasError = false;

    // Name: 1–100 non-whitespace-only characters
    const nameTrimmed = nameValue.trim();
    if (nameTrimmed.length === 0 || nameTrimmed.length > 100) {
      const nameError = nameInput.closest('.form-field')
        ? nameInput.closest('.form-field').querySelector('.field-error')
        : nameInput.parentElement.querySelector('.field-error');
      if (nameError) {
        nameError.textContent = 'Item name must be between 1 and 100 characters.';
      }
      hasError = true;
    }

    // Amount: numeric and between 0.01 and 999,999.99
    const amountFloat = parseFloat(amountValue);
    const amountValid =
      amountValue.trim() !== '' &&
      !isNaN(amountFloat) &&
      amountFloat >= 0.01 &&
      amountFloat <= 999999.99;

    if (!amountValid) {
      const amountError = amountInput.closest('.form-field')
        ? amountInput.closest('.form-field').querySelector('.field-error')
        : amountInput.parentElement.querySelector('.field-error');
      if (amountError) {
        amountError.textContent = 'Amount must be a number between 0.01 and 999,999.99.';
      }
      hasError = true;
    }

    // Category: must not be the placeholder (value "")
    if (categoryValue === '') {
      const categoryError = categoryInput.closest('.form-field')
        ? categoryInput.closest('.form-field').querySelector('.field-error')
        : categoryInput.parentElement.querySelector('.field-error');
      if (categoryError) {
        categoryError.textContent = 'Please select a category.';
      }
      hasError = true;
    }

    // Return early if any field failed validation
    if (hasError) {
      return;
    }

    // ── 4. Build transaction object ─────────────────────────────────────────
    const id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : Date.now().toString();

    const tx = {
      id,
      name:     nameTrimmed,
      amount:   amountFloat,
      category: categoryValue,
      addedAt:  Date.now()
    };

    // ── 5. Persist, render, reset ───────────────────────────────────────────
    StateManager.addTransaction(tx);
    saveTransactions(StateManager.getTransactions());
    Renderer.render();

    // Reset form fields
    nameInput.value     = '';
    amountInput.value   = '';
    categoryInput.value = '';
  },

  /**
   * Handles click events on the transaction list via event delegation.
   * Targets elements with class .delete-btn inside a [data-id] list item.
   *
   * Satisfies Requirements 3.1, 3.2, 3.3, 3.5.
   *
   * @param {MouseEvent} event - The click event fired on #transaction-list.
   */
  handleDeleteClick(event) {
    const btn = event.target.closest('.delete-btn');
    if (!btn) return;

    const li = btn.closest('[data-id]');
    if (!li) return;

    const id = li.dataset.id;
    StateManager.removeTransaction(id);
    saveTransactions(StateManager.getTransactions());
    Renderer.render();
  },

  /**
   * Bootstraps the application on DOMContentLoaded.
   * Loads persisted transactions, initialises StateManager, and renders.
   *
   * Satisfies Requirements 6.3, 6.4.
   */
  init() {
    ThemeManager.init();
    CategoryManager.init();
    CategoryManager.renderDropdown();

    const transactions = loadTransactions();
    StateManager.init(transactions);
    Renderer.render();

    const form = document.querySelector('#expense-form');
    if (form) {
      form.addEventListener('submit', (e) => EventHandlers.handleFormSubmit(e));
    }

    const list = document.querySelector('#transaction-list');
    if (list) {
      list.addEventListener('click', (e) => EventHandlers.handleDeleteClick(e));
    }

    const sortSelect = document.querySelector('#sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        SortManager.setCurrent(sortSelect.value);
        Renderer.render();
      });
    }

    // Budget limit input — restore saved value and listen for changes
    const budgetInput = document.querySelector('#budget-limit');
    if (budgetInput) {
      const saved = BudgetManager.getLimit();
      if (saved !== null) budgetInput.value = saved;

      budgetInput.addEventListener('input', () => {
        const val = parseFloat(budgetInput.value);
        BudgetManager.setLimit(isNaN(val) ? null : val);
        // Re-evaluate warning against current total without a full re-render
        BudgetManager.applyWarning(StateManager.getTotalBalance());
      });
    }

    // Delete-category button
    const deleteCategoryBtn = document.querySelector('#delete-category-btn');
    if (deleteCategoryBtn) {
      deleteCategoryBtn.addEventListener('click', () => {
        const select = document.querySelector('#item-category');
        const categoryError = document.querySelector('#category-error');
        if (categoryError) categoryError.textContent = '';

        const selected = select ? select.value : '';
        const err = CategoryManager.remove(selected, StateManager.getTransactions());

        if (err) {
          if (categoryError) categoryError.textContent = err;
          return;
        }

        // Success — rebuild dropdown (resets to placeholder) and re-render chart
        CategoryManager.renderDropdown();
        Renderer.render();
      });
    }

    // Add-category button
    const addCategoryBtn   = document.querySelector('#add-category-btn');    const newCategoryInput = document.querySelector('#new-category-input');
    const categoryError    = document.querySelector('#category-error');

    if (addCategoryBtn && newCategoryInput) {
      const handleAddCategory = () => {
        if (categoryError) categoryError.textContent = '';
        const err = CategoryManager.add(newCategoryInput.value);
        if (err) {
          if (categoryError) categoryError.textContent = err;
          newCategoryInput.focus();
          return;
        }
        CategoryManager.renderDropdown();
        // Select the newly added category automatically
        const select = document.querySelector('#item-category');
        if (select) select.value = newCategoryInput.value.trim();
        newCategoryInput.value = '';
        newCategoryInput.focus();
      };

      addCategoryBtn.addEventListener('click', handleAddCategory);

      // Also allow pressing Enter inside the text input
      newCategoryInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAddCategory();
        }
      });
    }
  }
};

// ─── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => EventHandlers.init());
