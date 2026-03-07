// Database Schema Initialization using Dexie.js
const db = new Dexie('JPlusBooksmartDB');

db.version(7).stores({
    products: '++id, barcode, name, price, stock, category, lastUpdated',
    sales: '++id, date, total, discount, paymentStatus, paymentType, customerId, isEdited, lastUpdated',
    credits: '++id, customerName, customerMobile, totalAmount, paidAmount, balance, lastPaymentDate, lastUpdated',
    billPayments: '++id, billType, accountNo, customerName, customerMobile, amount, charges, date, lastUpdated',
    customers: '++id, name, mobile, lastUpdated',
    cashLogs: '++id, type, amount, reason, date, refId, refTable, isEdited, performedBy, lastUpdated',
    expenses: '++id, category, description, amount, date, isEdited, lastUpdated',
    printJobs: '++id, customerName, customerMobile, description, status, dateAdded, dateCompleted, lastUpdated',
    suppliers: '++id, name, contact, totalDue, lastUpdated',
    supplierTransactions: '++id, supplierId, date, type, amount, description, lastUpdated',
    heldBills: '++id, date, name, itemsData, total, lastUpdated',
    auditLogs: '++id, date, action, details, user, lastUpdated'
});

// Seed Initial Data if empty
db.on('populate', async () => {
    await db.products.bulkAdd([
        { barcode: '1001', name: 'CR Book 120 Pages', price: 250, stock: 50, category: 'Stationery' },
        { barcode: '1002', name: 'CR Book 160 Pages', price: 320, stock: 45, category: 'Stationery' },
        { barcode: '1003', name: 'Atlas Blue Pen', price: 20, stock: 200, category: 'Stationery' },
        { barcode: '1004', name: 'A4 Paper Ream', price: 2200, stock: 10, category: 'Stationery' },
        { barcode: '1005', name: 'Geometry Box', price: 450, stock: 15, category: 'Accessories' }
    ]);
});

// Hooks for automatic timestamping and sync tracking
const tableNames = [
    'products', 'sales', 'credits', 'billPayments', 'customers',
    'cashLogs', 'expenses', 'printJobs', 'suppliers',
    'supplierTransactions', 'heldBills', 'auditLogs'
];

tableNames.forEach(tableName => {
    db[tableName].hook('creating', (primKey, obj) => {
        if (!obj.lastUpdated) obj.lastUpdated = Date.now();
    });
    db[tableName].hook('updating', (mods, primKey, obj) => {
        if (!mods.lastUpdated) {
            return { lastUpdated: Date.now() };
        }
    });
});

db.open().then(() => {
    console.log("Dexie Database 'JPlusBooksmartDB' opened successfully.");
    // Trigger initial sync check if needed
}).catch(err => {
    console.error(`Failed to open DB: ${err.stack || err}`);
});
