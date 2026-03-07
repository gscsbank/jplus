# Project: J Plus Booksmart - Smart POS & Inventory System

## 1. Project Overview
A lightweight, high-performance, and offline-first Point of Sale (POS) system designed for **J Plus Booksmart**. The system handles retail sales, printing service billing, utility bill record-keeping, and customer credit management.

## 2. Technical Stack
* **Frontend:** HTML5, Tailwind CSS (for modern UI)
* **Icons:** Lucide-icons or FontAwesome
* **Database:** Dexie.js (IndexedDB wrapper for robust local browser storage)
* **Printing:** CSS Media Queries (optimized for 58mm Thermal Printers)
* **Logic:** Vanilla JavaScript (ES6+)

## 3. System Requirements & Features

### A. Core POS Module
* **Barcode Integration:** Auto-focus search bar to scan items.
* **Item Selection:** Manual search by name/code.
* **Keyboard Navigation:**
    * `F2`: Switch to Search/Barcode.
    * `Arrow Up/Down`: Navigate item list.
    * `Enter`: Add item to cart / Confirm payment.
    * `F9`: Print Bill.
    * `Esc`: Clear current sale.
* **Multi-Category Billing:** Separate tabs for "Bookshop Items" and "Printing Services."

### B. Printing & Services Module
* Custom billing for photocopies, printouts, and graphic design work.
* Option to enter "Job Description" and "Quantity" manually.

### C. Utility Bill Payment (Manual Entry)
* A dedicated interface to record Electricity, Water, and Internet bill payments.
* Allows the operator to type the Account Number, Customer Name, and Amount to generate a professional receipt for the customer.

### D. Credit (Debt) Management System
* **Partial Payments:** Ability to record a sale where the customer pays only a portion of the total.
* **Customer Profiles:** Save customer name/mobile to track outstanding balances.
* **Payment History:** Log every time a customer returns to pay a portion of their debt.

### E. Inventory Management
* Stock levels tracking.
* Low stock alerts (visual indicators).
* Add/Update/Delete products with Barcode IDs.

## 4. Database Schema (Dexie.js)
```javascript
const db = new Dexie('JPlusBooksmartDB');
db.version(1).stores({
  products: '++id, barcode, name, price, stock, category',
  sales: '++id, date, total, discount, paymentStatus, customerId',
  credits: '++id, customerName, customerMobile, totalAmount, paidAmount, balance',
  billPayments: '++id, billType, accountNo, amount, date',
  customers: '++id, name, mobile'
});