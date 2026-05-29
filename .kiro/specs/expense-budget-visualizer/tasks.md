# Implementation Plan: Expense & Budget Visualizer

## Overview

Build a single-page, client-side expense tracker using plain HTML, CSS, and Vanilla JavaScript. The implementation follows the flat, event-driven architecture defined in the design: `StateManager` → `Storage` → `Renderer` → `EventHandlers`, all living in one `js/script.js` file. No build step, no framework, no test runner.

## Tasks

- [x] 1. Scaffold project structure
  - [x] 1.1 Create the three project files: `index.html`, `css/style.css`, and `js/script.js`
    - Create `index.html` at the project root with a valid HTML5 boilerplate (`<!DOCTYPE html>`, `<html lang="id">`, `<head>`, `<body>`)
    - Add `<link rel="stylesheet" href="css/style.css">` in `<head>`
    - Add Chart.js 4.5.0 CDN script tag: `<script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.0/dist/chart.umd.min.js"></script>` with an `onerror` handler that shows the fallback message inside `#chart-container`
    - Add `<script src="js/script.js" defer></script>` after the CDN tag
    - Create `css/style.css` as an empty file
    - Create `js/script.js` as an empty file
    - _Requirements: 7.1, 7.4, 7.5_

- [x] 2. Build the HTML structure
  - [x] 2.1 Add all semantic sections and interactive elements to `index.html`
    - Add `<div id="balance-display">` containing `<span id="balance-amount">`
    - Add `<form id="expense-form">` with:
      - `<input type="text" id="item-name" maxlength="100" required>`
      - `<input type="number" id="item-amount" min="0.01" max="999999.99" step="0.01" required>`
      - `<select id="item-category" required>` with a placeholder `<option value="">` and options for Food, Transport, Fun
      - `<button type="submit" id="add-btn">`
      - One `<span class="field-error" aria-live="polite">` immediately after each of the three input/select elements
    - Add `<div id="transaction-list-container">` containing a `<ul id="transaction-list">` and a `<p id="empty-state">No expenses recorded yet.</p>`
    - Add `<div id="chart-container">` containing `<canvas id="spending-chart">` and `<p id="chart-empty-msg">`
    - _Requirements: 1.1, 2.4, 3.1, 4.1, 5.3_

- [x] 3. Write CSS styling in `css/style.css`
  - [x] 3.1 Implement base styles, layout, and responsive rules
    - Set `box-sizing: border-box` globally; set `body` base font size to at least 14px, a neutral background, and a centered max-width container
    - Style `#balance-display` to be visually prominent (larger font, clear label)
    - Style `#expense-form` as a vertical stack of labeled fields; style `.field-error` in red with `font-size` ≥ 12px; hide error spans by default (`display: none` or `visibility: hidden`) and show them when they have content
    - Style `#transaction-list` with `max-height` and `overflow-y: auto` to enable scrolling; style each `<li>` as a row with name, category, amount, and delete button laid out horizontally
    - Style `.delete-btn` with sufficient tap target (min 44×44 px), visible focus ring, and hover state
    - Style `#chart-container` to center the canvas and the empty message
    - Add a `@media` breakpoint so the layout stacks vertically on viewports ≤ 600px and remains side-by-side on wider screens; ensure no horizontal scrolling at 320px
    - Verify all text/background color pairs meet WCAG AA 4.5:1 contrast ratio
    - _Requirements: 2.3, 8.3, 8.4_

- [x] 4. Implement `StateManager` in `js/script.js`
  - [x] 4.1 Write the `StateManager` object with all five methods
    - Declare `const StateManager = { _transactions: [], ... }` at the top of `script.js`
    - Implement `init(transactions)`: assigns the provided array to `_transactions`
    - Implement `addTransaction(tx)`: pushes `tx` onto `_transactions`
    - Implement `removeTransaction(id)`: filters out the entry whose `id` matches
    - Implement `getTransactions()`: returns a shallow copy of `_transactions`
    - Implement `getTotalBalance()`: returns the sum of all `amount` values (0 when empty)
    - Implement `getCategoryTotals()`: returns `{ Food: number, Transport: number, Fun: number }` — categories with no transactions return 0
    - _Requirements: 1.2, 3.2, 4.1, 4.2, 5.1_

- [x] 5. Implement Storage helpers in `js/script.js`
  - [x] 5.1 Write `loadTransactions()` and `saveTransactions()` functions
    - Implement `loadTransactions()`: calls `localStorage.getItem('ebv_transactions')`, wraps `JSON.parse` in `try/catch`, returns `[]` on empty key or parse error, and calls `localStorage.removeItem('ebv_transactions')` before returning `[]` on error
    - Implement `saveTransactions(transactions)`: calls `localStorage.setItem('ebv_transactions', JSON.stringify(transactions))`
    - _Requirements: 6.1, 6.2, 6.4_

- [x] 6. Implement the `Renderer` in `js/script.js`
  - [x] 6.1 Write `Renderer.renderTransactionList(transactions)`
    - Query `#transaction-list` (the `<ul>`) and `#empty-state`
    - When `transactions` is empty: hide the `<ul>`, show `#empty-state`
    - When `transactions` is non-empty: show the `<ul>`, hide `#empty-state`, clear the `<ul>`, then for each transaction append an `<li data-id="{id}">` containing `<span class="tx-name">`, `<span class="tx-category">`, `<span class="tx-amount">` (IDR-formatted), and `<button class="delete-btn" aria-label="Delete {name}">×</button>`
    - Use `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 })` for all monetary values
    - _Requirements: 2.1, 2.4, 2.5, 3.1_

  - [x] 6.2 Write `Renderer.updateBalance(total)`
    - Query `#balance-amount` and set its `textContent` to the IDR-formatted `total`
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 6.3 Write `Renderer.updateChart(categoryTotals)` with Chart.js lifecycle management
    - Declare `Renderer._chartInstance = null` on the `Renderer` object
    - On first call (when `_chartInstance` is `null`): create a new `Chart` on `#spending-chart` with `type: 'pie'`, datasets using `CATEGORY_COLORS`, and `plugins.legend` at `position: 'bottom'` with labels showing `{Category} — {X}%`
    - On subsequent calls: mutate `_chartInstance.data.labels`, `_chartInstance.data.datasets[0].data`, and `_chartInstance.data.datasets[0].backgroundColor`, then call `_chartInstance.update()`
    - When all category totals are 0: hide `#spending-chart`, show `#chart-empty-msg`; otherwise show the canvas and hide the message
    - Define `const CATEGORY_COLORS = { Food: '#FF6384', Transport: '#36A2EB', Fun: '#FFCE56' }` at the top of `script.js`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 6.4 Write `Renderer.render()` — the single atomic render entry point
    - Call `Renderer.renderTransactionList(StateManager.getTransactions())`
    - Call `Renderer.updateBalance(StateManager.getTotalBalance())`
    - Call `Renderer.updateChart(StateManager.getCategoryTotals())`
    - _Requirements: 1.2, 3.3, 4.2, 5.2_

- [x] 7. Implement `EventHandlers` in `js/script.js`
  - [x] 7.1 Write `EventHandlers.handleFormSubmit(event)`
    - Call `event.preventDefault()`
    - Read values from `#item-name`, `#item-amount`, `#item-category`
    - Clear all `.field-error` spans before re-validating
    - Validate: name must be 1–100 non-whitespace-only characters; amount must be numeric and between 0.01 and 999,999.99; category must not be `""`
    - On any failure: populate the relevant `.field-error` span(s) and return early without adding a transaction
    - On success: build a transaction object `{ id: crypto.randomUUID() (or Date.now().toString() fallback), name, amount: parseFloat(amount), category, addedAt: Date.now() }`, call `StateManager.addTransaction(tx)`, call `saveTransactions(StateManager.getTransactions())`, call `Renderer.render()`, then reset the form fields (name → `""`, amount → `""`, category → placeholder `""`)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 7.2 Write `EventHandlers.handleDeleteClick(event)` using event delegation
    - Attach a single `'click'` listener to `#transaction-list` (the `<ul>`)
    - Check `event.target.classList.contains('delete-btn')`; if not, return
    - Read `id` from `event.target.closest('li').dataset.id`
    - Call `StateManager.removeTransaction(id)`, call `saveTransactions(StateManager.getTransactions())`, call `Renderer.render()`
    - _Requirements: 3.2, 3.3, 3.5_

  - [x] 7.3 Write the `DOMContentLoaded` initializer
    - Inside the listener: call `loadTransactions()`, pass the result to `StateManager.init()`, call `Renderer.render()`
    - Attach `EventHandlers.handleFormSubmit` to `document.querySelector('#expense-form')` via `'submit'` event
    - Attach `EventHandlers.handleDeleteClick` to `document.querySelector('#transaction-list')` via `'click'` event
    - _Requirements: 2.2, 4.4, 6.3_

- [ ] 8. Final checkpoint — verify end-to-end behavior
  - Open `index.html` directly in a browser (no server needed)
  - Confirm: adding a transaction updates the list, balance, and chart; deleting a transaction removes it and updates all three; reloading the page restores all data; submitting an empty or invalid form shows inline errors without adding a transaction; corrupt `localStorage` data results in a clean empty state
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- No test framework, Jest, Playwright, or property-based tests are included — this is a pure vanilla JS MVP.
- All monetary formatting uses `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 })`.
- The Chart.js instance is never destroyed and recreated — always mutate `_chartInstance.data` and call `.update()` to avoid flicker.
- Tasks build incrementally: scaffold → HTML → CSS → StateManager → Storage → Renderer → EventHandlers → wire-up.
- Each task references specific requirements for traceability.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["3.1", "4.1"] },
    { "id": 3, "tasks": ["5.1", "6.1"] },
    { "id": 4, "tasks": ["6.2", "6.3"] },
    { "id": 5, "tasks": ["6.4"] },
    { "id": 6, "tasks": ["7.1", "7.2"] },
    { "id": 7, "tasks": ["7.3"] }
  ]
}
```
