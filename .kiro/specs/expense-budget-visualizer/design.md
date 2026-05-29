# Design Document — Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a single-page, client-side web application built with pure HTML, CSS, and Vanilla JavaScript. It lets users record personal expenses, review them in a scrollable list, monitor a running total, and understand spending distribution through a live pie chart. All data is persisted in the browser's `localStorage` so sessions survive page reloads with no backend required.

### Key Design Goals

- **Zero dependencies at runtime** except Chart.js loaded via CDN.
- **Single-file JS / CSS** — one `js/script.js` and one `css/style.css`.
- **Immediate feedback** — every user action (add, delete) completes its DOM update within 100 ms.
- **Resilient load** — corrupt or missing `localStorage` data never crashes the app; the app falls back to empty state gracefully.
- **Accessible and responsive** — WCAG AA contrast, keyboard-navigable, works from 320 px to 1920 px.

---

## Architecture

The app is a single HTML page with a flat, event-driven architecture. There is no framework, no module bundler, and no build step.

```
index.html
├── <link> css/style.css
├── <script src CDN> Chart.js 4.5.0
└── <script src> js/script.js
```

### Module Boundaries (within `script.js`)

`script.js` is organized into four logical sections separated by comments. Each section owns a single responsibility:

```
script.js
├── StateManager     — in-memory transaction array, derived totals
├── Storage          — direct localStorage read/write calls
├── Renderer         — DOM mutations, Chart.js instance lifecycle
└── EventHandlers    — form submit, delete button clicks, DOMContentLoaded
```

These are plain objects / functions, not ES6 classes, to keep the file compatible with all target browsers without a transpiler.

### Data Flow

```
User Action
    │
    ▼
EventHandlers
    │  validate (form submit) or identify target (delete)
    ▼
StateManager.addTransaction / removeTransaction
    │  mutates in-memory array
    ▼
Storage.save             ← direct localStorage.setItem call
    │
    ▼
Renderer.render          ← updates list, balance, chart atomically
```

On page load:

```
DOMContentLoaded
    │
    ▼
Storage.load             ← try/catch JSON.parse; corrupt → empty state
    │
    ▼
StateManager.init(transactions)
    │
    ▼
Renderer.render
```

---

## Components and Interfaces

### 1. Input Form (`#expense-form`)

| Element | Tag / Type | Attributes |
|---|---|---|
| Item name | `<input type="text">` | `id="item-name"` `maxlength="100"` `required` |
| Amount | `<input type="number">` | `id="item-amount"` `min="0.01"` `max="999999.99"` `step="0.01"` `required` |
| Category | `<select>` | `id="item-category"` `required` |
| Submit | `<button type="submit">` | `id="add-btn"` |
| Error spans | `<span class="field-error">` | one per field, `aria-live="polite"` |

**Validation rules** (enforced in `EventHandlers.handleFormSubmit`):

| Field | Rule |
|---|---|
| Item name | 1–100 non-whitespace-only characters |
| Amount | Numeric, 0.01 ≤ value ≤ 999,999.99 |
| Category | Must not be the placeholder option (`value=""`) |

On validation failure: error spans are populated, valid fields retain their values, form is not submitted.  
On success: `StateManager.addTransaction` is called, then the form resets (name → `""`, amount → `""`, category → placeholder).

### 2. Transaction List (`#transaction-list`)

Rendered as a `<ul>` element. Each transaction maps to an `<li>` with:

```html
<li data-id="{uuid}">
  <span class="tx-name">{name}</span>
  <span class="tx-category">{category}</span>
  <span class="tx-amount">{formatted amount}</span>
  <button class="delete-btn" aria-label="Delete {name}">×</button>
</li>
```

- Items are appended in insertion order (oldest at top, newest at bottom).
- When empty, a `<p id="empty-state">No expenses recorded yet.</p>` is shown inside the list container and the `<ul>` is hidden.
- The `<ul>` has `overflow-y: auto` with a fixed `max-height` to enable scrolling.

### 3. Balance Display (`#balance-display`)

A single `<span id="balance-amount">` inside a `<div id="balance-display">`. Updated by `Renderer.updateBalance`. Format: `Intl.NumberFormat` with `style: 'currency'`, `currency: 'IDR'` (see Data Models for currency formatting details).

### 4. Pie Chart (`#chart-container`)

- A `<canvas id="spending-chart">` is the Chart.js mount point.
- A `<p id="chart-empty-msg">` is shown (canvas hidden) when there are no transactions.
- Chart.js instance is stored in `Renderer._chartInstance`. On each render, `_chartInstance.data` is mutated and `_chartInstance.update()` is called — the instance is never destroyed and recreated, avoiding flicker.
- Legend is rendered by Chart.js's built-in `legend` plugin (`position: 'bottom'`). Each legend item shows `{Category} — {X}%`.

### 5. Storage (direct localStorage calls)

Storage is handled inline using direct `localStorage` calls — there is no separate named service object. The logic lives in two small helper functions in `script.js`:

```js
function loadTransactions() {
  try {
    const raw = localStorage.getItem('ebv_transactions');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    localStorage.removeItem('ebv_transactions');
    return [];
  }
}

function saveTransactions(transactions) {
  localStorage.setItem('ebv_transactions', JSON.stringify(transactions));
}
```

- `loadTransactions`: wraps `JSON.parse` in `try/catch`. Returns `[]` on empty key or corrupt data (and removes the corrupt key).
- `saveTransactions`: writes directly; no error handling needed for the assignment scope.

### 6. StateManager

```js
StateManager = {
  _transactions: [],          // source of truth

  init(transactions),
  addTransaction(tx),
  removeTransaction(id),
  getTransactions()   → Transaction[],
  getTotalBalance()   → number,
  getCategoryTotals() → { Food: number, Transport: number, Fun: number }
}
```

`_transactions` is the single in-memory array. All reads go through `getTransactions()`, `getTotalBalance()`, and `getCategoryTotals()`. Mutations happen only via `addTransaction` and `removeTransaction`.

---

## Data Models

### Transaction

```js
{
  id:       string,   // crypto.randomUUID() or Date.now().toString() fallback
  name:     string,   // 1–100 chars
  amount:   number,   // positive integer or float, 0.01–999999.99
  category: string,   // "Food" | "Transport" | "Fun"
  addedAt:  number    // Date.now() — used for stable sort on load
}
```

### localStorage Schema

```
Key:   "ebv_transactions"
Value: JSON.stringify(Transaction[])
```

Example:
```json
[
  { "id": "abc123", "name": "Makan Siang", "amount": 25000, "category": "Food", "addedAt": 1716000000000 },
  { "id": "def456", "name": "Busway", "amount": 3500, "category": "Transport", "addedAt": 1716001000000 }
]
```

### Currency Formatting (IDR)

All monetary values are formatted using:
```js
new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
})
```

This produces Indonesian Rupiah formatting with thousands separators and no decimal places (e.g., `Rp 25.000`), which is standard for IDR amounts.

### Category Color Map

```js
const CATEGORY_COLORS = {
  Food:      '#FF6384',
  Transport: '#36A2EB',
  Fun:       '#FFCE56'
};
```

These three colors are visually distinct and pass 3:1 contrast against the white chart background (sufficient for non-text graphical elements per WCAG 1.4.11).

---

## Error Handling

| Scenario | Detection | Response |
|---|---|---|
| Corrupt data in `localStorage` on load | `try/catch` around `JSON.parse` in `loadTransactions()` | Remove the corrupt key with `localStorage.removeItem`; initialize app to empty state |
| Chart.js CDN fails to load | `<script onerror>` handler on the CDN `<script>` tag | Show a fallback message inside `#chart-container`: "Chart unavailable — please check your connection." |

---

## Optional Features

The following enhancements are **not in MVP scope** but are noted here as potential future additions:

- **Custom Categories** — allow users to define their own spending categories beyond the default Food, Transport, and Fun.
- **Sorting** — allow the transaction list to be sorted by date, amount, or category.
- **Dark/Light Mode toggle** — allow users to switch between a dark and light color theme.
