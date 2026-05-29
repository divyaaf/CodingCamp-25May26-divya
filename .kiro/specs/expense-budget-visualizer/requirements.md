# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses, categorize spending, and visualize their budget through an interactive pie chart. The app runs entirely in the browser with no backend, using Local Storage for persistence. It is designed to be simple, fast, and usable as a standalone web page or browser extension.

## Glossary

- **App**: The Expense & Budget Visualizer web application
- **Transaction**: A single expense entry consisting of an item name, amount, and category
- **Category**: One of three predefined spending types — Food, Transport, or Fun
- **Transaction_List**: The scrollable UI component that displays all recorded transactions
- **Input_Form**: The UI form component used to add new transactions
- **Balance_Display**: The UI component that shows the current total of all transaction amounts
- **Chart**: The pie chart UI component that visualizes spending distribution by category
- **Local_Storage**: The browser's built-in client-side key-value storage API
- **Validator**: The input validation logic within the Input_Form

## Requirements

### Requirement 1: Add a Transaction

**User Story:** As a user, I want to enter an expense with a name, amount, and category, so that I can record my spending.

#### Acceptance Criteria

1. THE Input_Form SHALL provide a text field for item name (maximum 100 characters), a numeric field for amount, and a dropdown selector for category (Food, Transport, Fun) with a default unselected placeholder option.
2. WHEN the user submits the Input_Form with all fields filled and a valid positive amount, THE App SHALL add the transaction to the Transaction_List and persist it to Local_Storage.
3. WHEN the user submits the Input_Form, THE Validator SHALL verify that the item name is between 1 and 100 characters, the amount is a number between 0.01 and 999,999.99 with at most 2 decimal places, and a non-placeholder category is selected.
4. IF the user submits the Input_Form with any field empty or the amount is not a valid positive number, THEN THE Validator SHALL display an inline error message adjacent to each invalid field, SHALL preserve the values of valid fields, and SHALL NOT add the transaction.
5. WHEN a transaction is successfully added, THE Input_Form SHALL reset the item name field to empty, the amount field to empty, and the category dropdown to its default unselected placeholder.

### Requirement 2: View Transaction List

**User Story:** As a user, I want to see all my recorded expenses in a list, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display all persisted transactions, each showing the item name, amount formatted with the local currency symbol, thousands separator, and exactly 2 decimal places, and category.
2. WHEN the App loads and transactions exist in Local_Storage, THE App SHALL render all persisted transactions in the Transaction_List.
3. THE Transaction_List SHALL be scrollable when the number of transactions exceeds the visible area.
4. WHEN no transactions exist, THE Transaction_List SHALL display a visible, non-empty placeholder text indicating no expenses have been recorded.
5. THE Transaction_List SHALL display transactions in the order they were added, with the most recently added transaction appearing at the bottom.

### Requirement 3: Delete a Transaction

**User Story:** As a user, I want to remove an expense from the list, so that I can correct mistakes or remove outdated entries.

#### Acceptance Criteria

1. THE Transaction_List SHALL display a delete control for each transaction entry.
2. WHEN the user activates the delete control for a transaction, THE App SHALL immediately remove that transaction from the Transaction_List without requiring a confirmation dialog.
3. WHEN a transaction is removed from the Transaction_List, THE App SHALL delete it from Local_Storage and update the Balance_Display and Chart to reflect the removal within 100 milliseconds.
4. IF the Local_Storage write fails during deletion, THE App SHALL restore the removed transaction to the Transaction_List and revert the Balance_Display and Chart to their pre-deletion state.
5. WHEN a transaction is deleted, only that specific transaction SHALL be removed; all other transactions SHALL remain unchanged in the Transaction_List and Local_Storage.

### Requirement 4: Display Total Balance

**User Story:** As a user, I want to see my total spending at a glance, so that I know how much I have spent overall.

#### Acceptance Criteria

1. WHILE the App is loaded, THE Balance_Display SHALL show the sum of all transaction amounts formatted with the local currency symbol, thousands separator, and exactly 2 decimal places.
2. WHEN a transaction is added or deleted, THE Balance_Display SHALL update automatically to reflect the new total without requiring a page reload.
3. WHILE no transactions exist, THE Balance_Display SHALL show a total of zero formatted with the local currency symbol, thousands separator, and exactly 2 decimal places (e.g., $0.00).
4. WHEN the App loads and transactions exist in Local_Storage, THE Balance_Display SHALL initialize to the sum of all persisted transaction amounts.

### Requirement 5: Visualize Spending by Category

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Chart SHALL render a pie chart displaying the proportion of total spending for each category (Food, Transport, Fun) that has at least one transaction.
2. WHEN a transaction is added or deleted, THE Chart SHALL update automatically to reflect the current category totals without requiring a page reload.
3. WHILE no transactions exist, THE Chart SHALL display a text message within the Chart area indicating no spending data is available.
4. THE Chart SHALL assign a unique color to each category such that no two categories share the same color, and SHALL include a legend displaying each category's name and its percentage of total spending.

### Requirement 6: Persist Data Across Sessions

**User Story:** As a user, I want my expenses to be saved between browser sessions, so that I do not lose my data when I close and reopen the app.

#### Acceptance Criteria

1. WHEN a transaction is added, THE App SHALL write the updated transaction list to Local_Storage within 100 milliseconds.
2. WHEN a transaction is deleted, THE App SHALL write the updated transaction list to Local_Storage within 100 milliseconds.
3. WHEN the App completes its initial page load, THE App SHALL read all transactions from Local_Storage and, if valid data exists, restore the Transaction_List, Balance_Display, and Chart to reflect the persisted data; if Local_Storage is empty, THE App SHALL render the empty state.
4. IF the data in Local_Storage is corrupt or cannot be parsed, THE App SHALL discard the corrupt data, initialize to an empty state, and clear the corrupt entry from Local_Storage.

### Requirement 7: Technology and Compatibility

**User Story:** As a developer, I want the app to use only HTML, CSS, and Vanilla JavaScript with no backend, so that it can be deployed as a simple static file or browser extension.

#### Acceptance Criteria

1. THE App SHALL be implemented using only HTML, CSS, and Vanilla JavaScript with no server-side components or JavaScript frameworks.
2. THE App SHALL use the browser Local_Storage API as the sole data persistence mechanism.
3. THE App SHALL be functional on current stable versions of Chrome, Firefox, Edge, and Safari.
4. THE App SHALL consist of a single CSS file located in a `css/` directory and a single JavaScript file located in a `js/` directory.
5. WHERE a charting library is used, THE App SHALL load it via a CDN script tag with no build step required.

### Requirement 8: Performance and Visual Design

**User Story:** As a user, I want the app to load quickly and look clean, so that it is pleasant and efficient to use.

#### Acceptance Criteria

1. THE App SHALL render the initial UI and restore persisted data within 2 seconds of the page load event completing, measured on a device with no active network requests required for core functionality.
2. WHEN the user interacts with the Input_Form, Transaction_List, or Chart, THE App SHALL complete the corresponding DOM update and visual re-render within 100 milliseconds.
3. THE App SHALL apply a minimum 4.5:1 contrast ratio between text and background colors (WCAG AA), with no overlapping interactive elements, and a base font size of at least 14px.
4. THE App SHALL be usable on viewport widths from 320px to 1920px such that all interactive controls are fully visible, reachable, and operable without horizontal scrolling or overlapping elements.
