// ============================================================
// AUTH SYSTEM
// ============================================================

const USERS = {
    owner: { username: 'Janith', password: 'janith123', role: 'owner', displayName: 'Janith', roleLabel: 'Owner' },
    staff: { username: 'staff', password: 'staff123', role: 'staff', displayName: 'Staff', roleLabel: 'Staff' }
};

// Current session user
let currentUser = null;

// Tabs that Staff are NOT allowed to see (only financial management tabs are restricted)
const STAFF_BLOCKED_TABS = ['expenses', 'suppliers'];

function setupLoginScreen() {
    // Load any saved passwords/users from localStorage first
    const stored = localStorage.getItem('jp_users');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (parsed.owner) USERS.owner = parsed.owner;
            if (parsed.staff) USERS.staff = parsed.staff;
            USERS.extraStaff = parsed.extraStaff || [];
        } catch (e) { }
    } else {
        USERS.extraStaff = [];
    }

    // ---- SESSION RESTORE ----
    // If a session already exists (e.g. after page refresh), skip the login screen
    const savedSession = sessionStorage.getItem('jpUser');
    if (savedSession) {
        try {
            currentUser = JSON.parse(savedSession);
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
            lucide.createIcons();
            window.initApp(); // applyAccessControl() is called inside initApp at the end
            updateProfileDisplay();
            return; // Skip the rest of the login screen setup
        } catch (e) {
            sessionStorage.removeItem('jpUser'); // Clear corrupted session
        }
    }

    const loginScreen = document.getElementById('login-screen');
    const mainApp = document.getElementById('main-app');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const roleOwnerBtn = document.getElementById('role-owner-btn');
    const roleStaffBtn = document.getElementById('role-staff-btn');

    let selectedRole = 'owner';

    // Role selector toggle
    const ownerActiveStyle = 'flex:1;padding:10px;border-radius:11px;font-size:13px;font-weight:800;background:linear-gradient(135deg,#6366f1,#7c3aed);color:#fff;border:none;cursor:pointer;box-shadow:0 4px 15px rgba(99,102,241,0.4);transition:all .2s;';
    const staffInactiveStyle = 'flex:1;padding:10px;border-radius:11px;font-size:13px;font-weight:800;background:transparent;color:#94a3b8;border:none;cursor:pointer;transition:all .2s;';

    roleOwnerBtn.addEventListener('click', () => {
        selectedRole = 'owner';
        roleOwnerBtn.style.cssText = ownerActiveStyle;
        roleStaffBtn.style.cssText = staffInactiveStyle;
        usernameInput.value = '';
        passwordInput.value = '';
        usernameInput.focus();
    });
    roleStaffBtn.addEventListener('click', () => {
        selectedRole = 'staff';
        roleStaffBtn.style.cssText = ownerActiveStyle;
        roleOwnerBtn.style.cssText = staffInactiveStyle;
        usernameInput.value = '';
        passwordInput.value = '';
        usernameInput.focus();
    });

    // Login form submit
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const enteredUser = usernameInput.value.trim();
        const enteredPass = passwordInput.value;

        // Find matching user
        let matchedUser = null;

        if (selectedRole === 'owner') {
            const u = USERS.owner;
            if (enteredUser.toLowerCase() === u.username.toLowerCase() && enteredPass === u.password) {
                matchedUser = u;
            }
        } else {
            // Check default staff first (only if not deleted)
            const u = USERS.staff;
            if (!u._deleted && enteredUser.toLowerCase() === u.username.toLowerCase() && enteredPass === u.password) {
                matchedUser = u;
            }
            // Check extra staff accounts
            if (!matchedUser && USERS.extraStaff) {
                matchedUser = USERS.extraStaff.find(s =>
                    s.username.toLowerCase() === enteredUser.toLowerCase() && s.password === enteredPass
                ) || null;
            }
        }

        if (matchedUser) {
            // SUCCESS
            currentUser = matchedUser;
            sessionStorage.setItem('jpUser', JSON.stringify(matchedUser));

            loginScreen.classList.add('hidden');
            mainApp.classList.remove('hidden');

            // Boot the main application (applyAccessControl is called inside initApp)
            lucide.createIcons();
            window.initApp();

            // Update profile in dashboard header
            updateProfileDisplay();

        } else {
            loginError.classList.remove('hidden');
            passwordInput.value = '';
            passwordInput.focus();
            // Shake animation
            loginError.style.animation = 'none';
            setTimeout(() => { loginError.style.animation = ''; }, 10);
        }
    });

    // Hide error when user types
    usernameInput.addEventListener('input', () => loginError.classList.add('hidden'));
    passwordInput.addEventListener('input', () => loginError.classList.add('hidden'));
}

function applyAccessControl() {
    if (!currentUser) return;

    const navBtns = document.querySelectorAll('.nav-btn');
    const opsLabel = document.getElementById('nav-label-operations');

    if (currentUser.role !== 'owner') {
        // Hide restricted sidebar items for non-owners (staff, etc.)
        navBtns.forEach(btn => {
            const tab = btn.getAttribute('data-tab');
            if (STAFF_BLOCKED_TABS.includes(tab)) {
                btn.classList.add('staff-hidden');
            }
        });

        // Only hide the "Operations" section label if ALL tabs under it are blocked
        // Currently Utility Bills, Print Jobs, Barcode are allowed for staff, so label stays visible

        // Hide inventory action buttons for Staff (view-only)
        const addProductBtn = document.getElementById('btn-add-product');
        if (addProductBtn) addProductBtn.style.display = 'none';

        // Hide Audit button for Staff
        const auditBtn = document.getElementById('btn-audit-report');
        if (auditBtn) auditBtn.classList.add('hidden');

    } else {
        // Owner: show everything
        navBtns.forEach(btn => btn.classList.remove('staff-hidden'));
        if (opsLabel) opsLabel.classList.remove('staff-hidden');

        const addProductBtn = document.getElementById('btn-add-product');
        if (addProductBtn) addProductBtn.style.display = 'flex';

        const auditBtn = document.getElementById('btn-audit-report');
        if (auditBtn) auditBtn.classList.remove('hidden');
    }
}

function updateProfileDisplay() {
    if (!currentUser) return;

    // Update the "Hi, Shakir" text in dashboard
    const nameEl = document.querySelector('#admin-profile-btn p:first-child');
    const roleEl = document.querySelector('#admin-profile-btn p:last-child');
    if (nameEl) nameEl.textContent = `Hi, ${currentUser.displayName}`;
    if (roleEl) roleEl.textContent = currentUser.roleLabel;

    // Update dropdown header
    const dropdownName = document.querySelector('#admin-dropdown-menu .p-4 p:first-child');
    const dropdownRole = document.querySelector('#admin-dropdown-menu .p-4 p:last-child');
    if (dropdownName) dropdownName.textContent = currentUser.displayName;
    if (dropdownRole) dropdownRole.textContent = currentUser.role === 'owner' ? 'Store Owner' : 'Staff Member';
}

function logout() {
    sessionStorage.removeItem('jpUser');
    currentUser = null;
    window.location.reload();
}

// ---- USER STORAGE (localStorage) ----
// Users are stored as: { id, username, password, role, displayName, roleLabel }
function loadStoredUsers() {
    const stored = localStorage.getItem('jp_users');
    if (stored) {
        const parsed = JSON.parse(stored);
        // Merge hardcoded owner with stored users
        USERS.owner = parsed.owner || USERS.owner;
        USERS.staff = parsed.staff || USERS.staff;
        // Load extra staff accounts
        USERS.extraStaff = parsed.extraStaff || [];
    } else {
        USERS.extraStaff = [];
    }
}

function saveUsers() {
    localStorage.setItem('jp_users', JSON.stringify({
        owner: USERS.owner,
        staff: USERS.staff,
        extraStaff: USERS.extraStaff || []
    }));
}

// ---- MANAGE USERS MODAL ----
function openManageUsers() {
    if (!currentUser || currentUser.role !== 'owner') {
        alert('Only the Owner can manage users.');
        return;
    }
    loadStoredUsers();
    renderUsersList();
    document.getElementById('manage-users-modal').classList.remove('hidden');
    lucide.createIcons();

    // Add User form handler
    const addForm = document.getElementById('add-user-form');
    addForm.onsubmit = (e) => {
        e.preventDefault();
        const username = document.getElementById('new-user-username').value.trim();
        const password = document.getElementById('new-user-password').value;
        if (!username || !password) return alert('Please enter both username and password.');
        if (password.length < 4) return alert('Password must be at least 4 characters.');

        // Check for duplicate username
        const allUsers = getAllUsers();
        if (allUsers.find(u => u.username.toLowerCase() === username.toLowerCase())) {
            alert('A user with that username already exists.');
            return;
        }

        // Add to extraStaff
        if (!USERS.extraStaff) USERS.extraStaff = [];
        USERS.extraStaff.push({
            id: 'staff_' + Date.now(),
            username: username,
            password: password,
            role: 'staff',
            displayName: username,
            roleLabel: 'Staff'
        });
        saveUsers();
        renderUsersList();

        document.getElementById('new-user-username').value = '';
        document.getElementById('new-user-password').value = '';
    };
}

function getAllUsers() {
    const all = [
        { ...USERS.owner, id: 'owner', protected: true },
        ...(USERS.staff && !USERS.staff._deleted ? [{ ...USERS.staff, id: 'staff_default', protected: false }] : [])
    ];
    if (USERS.extraStaff) all.push(...USERS.extraStaff.map(u => ({ ...u, protected: false })));
    return all;
}

function renderUsersList() {
    const container = document.getElementById('users-list-container');
    const users = getAllUsers();

    if (users.length === 0) {
        container.innerHTML = '<p class="text-slate-400 text-sm text-center py-4">No users found.</p>';
        return;
    }

    container.innerHTML = users.map(u => `
        <div class="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center font-black text-base
                    ${u.role === 'owner' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}">
                    ${u.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                    <p class="font-black text-slate-800 text-sm">${u.displayName}</p>
                    <p class="text-[10px] font-bold uppercase tracking-widest
                        ${u.role === 'owner' ? 'text-indigo-500' : 'text-slate-400'}">
                        ${u.role === 'owner' ? '👑 Owner' : '👤 Staff'}
                    </p>
                </div>
            </div>
            ${u.role !== 'owner' && currentUser.role === 'owner' ? `
            <button onclick="deleteUser('${u.id}')"
                class="w-8 h-8 rounded-xl bg-rose-50 text-rose-400 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>` : `
            <span class="text-[10px] font-black ${u.role === 'owner' ? 'text-indigo-300' : 'text-slate-300'} uppercase tracking-widest px-2">Protected</span>
            `}
        </div>
    `).join('');
}

window.deleteUser = async function (userId) {
    const isConfirmed = await showConfirm("Remove User?", "Are you sure you want to remove this user?");
    if (!isConfirmed) return;
    if (userId === 'staff_default') {
        // Mark default staff as deleted
        USERS.staff._deleted = true;
    } else {
        USERS.extraStaff = (USERS.extraStaff || []).filter(u => u.id !== userId);
    }
    saveUsers();
    renderUsersList();

};

// ---- CHANGE PASSWORD MODAL ----
function openChangePassword() {
    if (!currentUser) return;
    const modal = document.getElementById('change-password-modal');
    modal.classList.remove('hidden');
    document.getElementById('cp-current').value = '';
    document.getElementById('cp-new').value = '';
    document.getElementById('cp-confirm').value = '';
    const msg = document.getElementById('cp-message');
    msg.classList.add('hidden');
    lucide.createIcons();

    const form = document.getElementById('change-password-form');
    form.onsubmit = (e) => {
        e.preventDefault();
        const current = document.getElementById('cp-current').value;
        const newPass = document.getElementById('cp-new').value;
        const confirm = document.getElementById('cp-confirm').value;

        // Load latest passwords
        loadStoredUsers();
        const userKey = currentUser.role === 'owner' ? 'owner' : 'staff';
        const storedPass = USERS[userKey].password;

        if (current !== storedPass) {
            showCpMessage('❌ Current password is incorrect.', 'error');
            return;
        }
        if (newPass.length < 4) {
            showCpMessage('⚠️ New password must be at least 4 characters.', 'error');
            return;
        }
        if (newPass !== confirm) {
            showCpMessage('❌ Passwords do not match.', 'error');
            return;
        }

        // Update password
        USERS[userKey].password = newPass;
        currentUser.password = newPass;
        saveUsers();
        showCpMessage('✅ Password updated successfully!', 'success');
        setTimeout(() => {
            document.getElementById('change-password-modal').classList.add('hidden');
        }, 1500);
    };
}

function showCpMessage(text, type) {
    const msg = document.getElementById('cp-message');
    msg.textContent = text;
    msg.className = `text-sm font-bold text-center py-3 rounded-xl ${type === 'success'
        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
        : 'bg-rose-50 text-rose-600 border border-rose-100'}`;
    msg.classList.remove('hidden');
}

// ============================================================


// Global State
let productsList = [];
let currentCategory = 'Bookshop';
let cart = [];
let pendingCreditCheckout = null;
// Global state for Editing Bill (Dashboard)
let currentEditSaleId = null;
let currentEditLogId = null;
let editSaleItems = [];

// App state locks
let isProcessingCheckout = false;
let isAppInitialized = false;

// DOM Elements
const elements = {
    // Navigation
    navBtns: document.querySelectorAll('.nav-btn'),
    tabPanes: document.querySelectorAll('.tab-pane'),

    // POS Terminal
    posSearch: document.getElementById('pos-search'),
    posProductsGrid: document.getElementById('pos-products-grid'),
    btnBookshop: document.getElementById('btn-bookshop'),
    btnServices: document.getElementById('btn-services'),
    posServicesForm: document.getElementById('pos-services-form'),
    cartItems: document.getElementById('cart-items'),
    cartSubtotal: document.getElementById('cart-subtotal'),
    cartDiscount: document.getElementById('cart-discount'),
    cartTotal: document.getElementById('cart-total'),
    btnClearCart: document.getElementById('btn-clear-cart'),
    btnPayCash: document.getElementById('btn-pay-cash'),
    btnPayCredit: document.getElementById('btn-pay-credit'),

    // Services Form
    serviceDesc: document.getElementById('service-desc'),
    serviceQty: document.getElementById('service-qty'),
    servicePrice: document.getElementById('service-price'),
    btnAddService: document.getElementById('btn-add-service'),

    // Inventory
    inventoryTableBody: document.getElementById('inventory-table-body'),
    inventorySearch: document.getElementById('inventory-search'),
    btnRefreshInventory: document.getElementById('btn-refresh-inventory'),
    btnAddProduct: document.getElementById('btn-add-product'),

    // Common Modal
    productModal: document.getElementById('product-modal'),
    productForm: document.getElementById('product-form'),
    modalCloseBtns: document.querySelectorAll('.modal-close-btn'),

    // Print Area
    printArea: document.getElementById('print-area'),

    // Utility
    utilityForm: document.getElementById('utility-form'),
    utilityCharges: document.getElementById('utility-charges'),

    // Credit Modal
    creditModal: document.getElementById('credit-modal'),
    creditCheckoutForm: document.getElementById('credit-checkout-form'),
    creditCheckoutTotal: document.getElementById('credit-checkout-total'),
    creditModalClose: document.getElementById('credit-modal-close'),
    creditModalCancel: document.getElementById('credit-modal-cancel'),

    // Credit Payment
    creditsList: document.getElementById('credits-list'),
    creditPaymentForm: document.getElementById('credit-payment-form'),
    creditPaymentId: document.getElementById('credit-payment-id'),
    creditPaymentName: document.getElementById('credit-payment-name'),
    creditCurrentBalance: document.getElementById('credit-current-balance'),
    creditPaymentAmount: document.getElementById('credit-payment-amount'),
    creditHistoryPanel: document.getElementById('credit-history-panel'),
    creditHistoryList: document.getElementById('credit-history-list'),

    // Dashboard Components
    dashStatsGrid: document.querySelector('.grid.grid-cols-4'),
    dashTodaySales: document.getElementById('dash-today-sales'),
    dashCashIn: document.getElementById('dash-cash-in'),
    dashCashOut: document.getElementById('dash-cash-out'),
    dashDrawerCash: document.getElementById('dash-drawer-cash'),
    recentActivityList: document.getElementById('recent-activity-list'),
    btnModalCashIn: document.getElementById('btn-modal-cash-in'),
    btnModalCashOut: document.getElementById('btn-modal-cash-out'),

    // Cash Log Modal
    cashLogModal: document.getElementById('cash-log-modal'),
    cashModalTitle: document.getElementById('cash-modal-title'),
    cashModalClose: document.getElementById('cash-modal-close'),
    cashLogForm: document.getElementById('cash-log-form'),
    cashLogType: document.getElementById('cash-log-type'),
    cashLogAmount: document.getElementById('cash-log-amount'),
    cashLogReason: document.getElementById('cash-log-reason'),

    // Cash Checkout Modal
    cashCheckoutModal: document.getElementById('cash-checkout-modal'),
    cashCheckoutClose: document.getElementById('cash-checkout-close'),
    cashCheckoutForm: document.getElementById('cash-checkout-form'),
    cashCheckoutTotal: document.getElementById('cash-checkout-total'),
    cashCheckoutGiven: document.getElementById('cash-checkout-given'),
    cashCheckoutChange: document.getElementById('cash-checkout-change'),
    cashCheckoutCancel: document.getElementById('cash-checkout-cancel'),
    cashCheckoutMobile: document.getElementById('cash-checkout-mobile'),
    cashWhatsappCheckbox: document.getElementById('cash-whatsapp-checkbox'),
    btnSendWhatsapp: document.getElementById('btn-send-whatsapp'),

    // WhatsApp Credit elements
    creditCheckoutMobile: document.getElementById('credit-checkout-mobile'),
    creditWhatsappCheckbox: document.getElementById('credit-whatsapp-checkbox'),
    btnSendWhatsappCredit: document.getElementById('btn-send-whatsapp-credit'),

    // Expense Tracker
    expenseForm: document.getElementById('expense-form'),
    expenseId: document.getElementById('expense-id'),
    expenseCategory: document.getElementById('expense-category'),
    expenseDesc: document.getElementById('expense-desc'),
    expenseAmount: document.getElementById('expense-amount'),
    expenseUseDrawer: document.getElementById('expense-use-drawer'),
    expenseSaveActions: document.getElementById('expense-save-actions'),
    expenseEditActions: document.getElementById('expense-edit-actions'),
    expensesTableBody: document.getElementById('expenses-table-body'),

    // Supplier Payment Modal
    supplierPaymentModal: document.getElementById('supplier-payment-modal'),
    paySupplierId: document.getElementById('pay-supplier-id'),
    paySupplierNameDisplay: document.getElementById('pay-supplier-name-display'),
    paySupplierDueDisplay: document.getElementById('pay-supplier-due-display'),
    paySupplierAmount: document.getElementById('pay-supplier-amount'),
    paySupplierUseDrawer: document.getElementById('pay-supplier-use-drawer'),
    btnConfirmSupplierPayment: document.getElementById('btn-confirm-supplier-payment'),

    // Dashboard Extras
    dashExpenses: document.getElementById('dash-expenses'),
    dashNetProfit: document.getElementById('dash-net-profit'),

    // Print Jobs
    jobModal: document.getElementById('job-modal'),
    jobModalTitle: document.getElementById('job-modal-title'),
    jobForm: document.getElementById('job-form'),
    jobName: document.getElementById('job-name'),
    jobMobile: document.getElementById('job-mobile'),
    jobDesc: document.getElementById('job-desc'),
    jobsPendingCount: document.getElementById('jobs-pending-count'),
    jobsDoneCount: document.getElementById('jobs-done-count'),
    jobsPendingList: document.getElementById('jobs-pending-list'),
    jobsDoneList: document.getElementById('jobs-done-list'),
    btnAddJob: document.getElementById('btn-add-job'),

    // FP3 Elements
    btnHoldBill: document.getElementById('btn-hold-bill'),
    btnShowHeld: document.getElementById('btn-show-held'),

    // Barcode Generator
    barcodeInput: document.getElementById('barcode-input'),
    barcodeNameInput: document.getElementById('barcode-name-input'),
    btnGenerateBarcode: document.getElementById('btn-generate-barcode'),
    btnPrintBarcode: document.getElementById('btn-print-barcode'),
    barcodeSvg: document.getElementById('barcode-svg'),
    barcodeStickerPreview: document.getElementById('barcode-sticker-preview'),
    barcodeEmptyState: document.getElementById('barcode-empty-state'),
    previewProductName: document.getElementById('preview-product-name'),

    heldCount: document.getElementById('held-count'),
    heldBillsModal: document.getElementById('held-bills-modal'),
    heldBillsList: document.getElementById('held-bills-list'),
    holdPromptModal: document.getElementById('hold-prompt-modal'),
    holdRefName: document.getElementById('hold-ref-name'),
    btnConfirmHold: document.getElementById('btn-confirm-hold'),

    // Suppliers Elements
    btnAddSupplier: document.getElementById('btn-add-supplier'),
    suppliersList: document.getElementById('suppliers-list'),
    supplierFormContainer: document.getElementById('supplier-form-container'),
    supplierFormTitle: document.getElementById('supplier-form-title'),
    supplierForm: document.getElementById('supplier-form'),
    supplierId: document.getElementById('supplier-id'),
    supplierName: document.getElementById('supplier-name'),
    supplierContact: document.getElementById('supplier-contact'),
    supplierInitialDue: document.getElementById('supplier-initial-due'),
    supplierInitBalanceDiv: document.getElementById('supplier-init-balance-div'),
    supplierBalanceLabel: document.getElementById('supplier-balance-label'),
    btnCancelSupplier: document.getElementById('btn-cancel-supplier'),

    // Dash Charts
    revPieChart: document.getElementById('rev-pieChart'),
    topBarChart: document.getElementById('top-barChart'),

    // Edit Activity Modal
    editActivityModal: document.getElementById('edit-activity-modal'),
    editActivityForm: document.getElementById('edit-activity-form'),
    editActivityId: document.getElementById('edit-activity-id'),
    editActivityReason: document.getElementById('edit-activity-reason'),
    editActivityAmount: document.getElementById('edit-activity-amount'),

    // Edit Sale Modal
    editSaleModal: document.getElementById('edit-sale-modal'),
    editSaleItemsBody: document.getElementById('edit-sale-items-body'),
    editSaleIdDisplay: document.getElementById('edit-sale-id-display'),
    editSaleSubtotal: document.getElementById('edit-sale-subtotal'),
    editSaleDiscount: document.getElementById('edit-sale-discount'),
    editSaleTotal: document.getElementById('edit-sale-total'),
    btnSaveEditSale: document.getElementById('btn-save-edit-sale'),
    btnSavePrintSale: document.getElementById('btn-save-print-sale'),
    reportFromDate: document.getElementById('report-from-date'),
    reportToDate: document.getElementById('report-to-date'),
    dashClock: document.getElementById('dash-clock'),
    posClock: document.getElementById('pos-clock'),

    // Mobile Elements
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),
    appSidebar: document.getElementById('app-sidebar'),
};

// Run initialization - called after successful login
window.initApp = async () => {
    if (isAppInitialized) return;
    isAppInitialized = true;

    console.log("App Init: Starting...");

    // Start clock immediately so users don't see "Loading time..." if a setup fails
    try {
        updateDashboardClock();
        setInterval(updateDashboardClock, 1000);
    } catch (e) {
        console.error("Clock Init Error:", e);
    }

    // Core Setup
    try {
        setupNavigation();
        setupKeyboardShortcuts();
        setupPOSEventListeners();
        setupInventoryListeners();
        setupUtilityListeners();
        setupCreditListeners();
        setupDashboardListeners();
        setupCashCheckoutListeners();
        setupExpenseListeners();
        setupPrintJobListeners();
        setupFeaturePack3Listeners();
        setupBarcodeListeners();
        setupSupplierPaymentListeners();

        // Start Cloud Sync
        if (typeof firebase !== 'undefined') {
            startCloudSync();
        }
    } catch (e) {
        console.error("Setup Listeners Error:", e);
    }

    // Set default report dates to today
    const today = new Date().toISOString().split('T')[0];
    if (elements.reportFromDate) elements.reportFromDate.value = today;
    if (elements.reportToDate) elements.reportToDate.value = today;

    try {
        await db.open();
        console.log("App Init: DB connection established.");

        // Load initial data
        await loadProducts();

        // Load Dashboard as the default tab on startup (owners), POS for staff
        const defaultTab = currentUser && currentUser.role !== 'owner' ? 'pos' : 'dashboard';
        const defaultTabBtn = document.querySelector(`[data-tab="${defaultTab}"]`);
        if (defaultTabBtn) {
            defaultTabBtn.click();
        } else {
            renderPOSProducts();
            renderInventory();
            renderDashboard();
        }

        // Apply role-based access control LAST (after all nav/tab setup)
        applyAccessControl();

    } catch (err) {
        console.error("App Init Error:", err);
    }
};

// Boot: setup login screen first
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        lucide.createIcons();
        setupLoginScreen();
    });
} else {
    lucide.createIcons();
    setupLoginScreen();
}

// ---------------- AUDIT TRAIL LOGIC ---------------- //
window.logAuditAction = async function (action, details) {
    try {
        const username = currentUser ? currentUser.username : 'Unknown/System';
        await db.auditLogs.add({
            date: new Date().toISOString(),
            action: action,
            details: details,
            user: username
        });
        console.log(`[Audit] ${action}: ${details} by ${username}`);
    } catch (err) {
        console.error("Failed to write audit log:", err);
    }
};

// ---------------- NAVIGATION LOGIC ---------------- //
function setupNavigation() {
    elements.navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update buttons visually
            elements.navBtns.forEach(b => {
                b.classList.remove('active');
            });
            btn.classList.add('active');

            // Show corresponding tab
            const tabId = btn.getAttribute('data-tab');
            elements.tabPanes.forEach(pane => {
                if (pane.id === `tab-${tabId}`) {
                    pane.classList.remove('hidden');
                } else {
                    pane.classList.add('hidden');
                }
            });

            // Specific tab initializations
            if (tabId === 'pos') {
                renderPOSProducts();
                elements.posSearch.focus();
            } else if (tabId === 'inventory') {
                renderInventory();
            } else if (tabId === 'credits') {
                renderCreditsList();
            } else if (tabId === 'dashboard') {
                renderDashboard();
            } else if (tabId === 'recent-activity') {
                renderRecentActivityTab();
            } else if (tabId === 'expenses') {
                renderExpenses();
            } else if (tabId === 'suppliers') {
                renderSuppliers();
            } else if (tabId === 'printjobs') {
                renderPrintJobs();
            }
        });
    });

    // Mobile menu toggle
    setupMobileNavigation();
}

// ---------------- MOBILE NAVIGATION LOGIC ---------------- //
function setupMobileNavigation() {
    console.log("Setting up mobile navigation...");

    // Re-query to be safe
    const menuBtn = document.getElementById('mobile-menu-btn');
    const overlay = document.getElementById('sidebar-overlay');
    const sidebar = document.getElementById('app-sidebar');

    if (!menuBtn || !overlay || !sidebar) {
        console.warn("Mobile navigation elements not found in DOM");
        return;
    }

    const toggleSidebar = () => {
        sidebar.classList.toggle('mobile-active');
        overlay.classList.toggle('active');
        console.log("Sidebar toggled:", sidebar.classList.contains('mobile-active'));
    };

    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSidebar();
    });

    overlay.addEventListener('click', toggleSidebar);

    // Close sidebar when a nav button is clicked on mobile
    elements.navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.innerWidth <= 640) {
                sidebar.classList.remove('mobile-active');
                overlay.classList.remove('active');
            }
        });
    });
}

// ---------------- GLOBAL KEYBOARD SHORTCUTS ---------------- //
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        const activeEl = document.activeElement;
        const isTypingInInput = activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT';
        const activeTabId = document.querySelector('.tab-pane:not(.hidden)').id;

        // NEW: Arrow Key Navigation
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            if (!isTypingInInput || (activeEl.id === 'pos-search')) {
                e.preventDefault();
                // Determine layout (Grid for POS, List for others)
                let cols = 1;
                let container = '';
                let selector = '';

                if (activeTabId === 'tab-pos') {
                    cols = 4; // POS Grid has roughly 4 cols usually
                    container = 'pos-products-grid';
                    selector = '.product-card';
                } else if (activeTabId === 'tab-inventory') {
                    container = 'inventory-list';
                    selector = 'tr';
                } else if (activeTabId === 'tab-expenses') {
                    container = 'expenses-list';
                    selector = 'tr';
                } else if (activeTabId === 'tab-dashboard') {
                    container = 'recent-activity-list';
                    selector = '.group';
                }

                if (container) {
                    if (keyboardNavigator.containerId !== container) {
                        keyboardNavigator.init(container, selector, cols);
                    }
                    const result = keyboardNavigator.navigate(e.key);

                    // NEW: Jump logic between grid and cart
                    if (activeTabId === 'tab-pos') {
                        if (result.boundary === 'ArrowRight' && container === 'pos-products-grid') {
                            keyboardNavigator.init('cart-items', '#cart-items > div', 1);
                            keyboardNavigator.navigate('ArrowDown'); // Select first item
                        } else if (result.boundary === 'ArrowLeft' && container === 'cart-items') {
                            keyboardNavigator.init('pos-products-grid', '.product-card', 4);
                            keyboardNavigator.navigate('ArrowDown'); // Select something in grid
                        }
                    }
                }
            }
        }

        if (e.key === 'F2') {
            e.preventDefault();
            document.querySelector('[data-tab="pos"]').click();
            elements.posSearch.focus();
            keyboardNavigator.reset();
        } else if (e.key === 'F9') {
            e.preventDefault();
            const activeTab = document.querySelector('.tab-pane:not(.hidden)').id;
            if (activeTab === 'tab-pos' && cart.length > 0 && elements.creditModal.classList.contains('hidden') && elements.cashCheckoutModal.classList.contains('hidden')) {
                openCashCheckoutModal();
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            keyboardNavigator.reset();
            if (!elements.productModal.classList.contains('hidden')) {
                elements.productModal.classList.add('hidden');
            } else if (!elements.creditModal.classList.contains('hidden')) {
                elements.creditModal.classList.add('hidden');
            } else if (!elements.cashLogModal.classList.contains('hidden')) {
                elements.cashLogModal.classList.add('hidden');
            } else if (!elements.cashCheckoutModal.classList.contains('hidden')) {
                elements.cashCheckoutModal.classList.add('hidden');
            } else {
                clearCart();
            }
        } else if (e.key === 'Enter') {
            const hasKbSelection = document.querySelector('.kb-selected');
            if (hasKbSelection) {
                e.preventDefault();
                keyboardNavigator.confirm();
                return;
            }

            // Check if user is typing in a non-search input, let it be (e.g. form submission)
            if (activeEl.id !== 'pos-search' && !isTypingInInput && document.querySelector('.tab-pane:not(.hidden)').id === 'tab-pos') {
                if (!elements.productModal.classList.contains('hidden') || !elements.creditModal.classList.contains('hidden') || !elements.cashCheckoutModal.classList.contains('hidden')) return;
                if (cart.length > 0) openCashCheckoutModal();
            }
        }
    });
}

// ---------------- DATA LOADING ---------------- //
async function loadProducts() {
    try {
        productsList = await db.products.toArray();
        console.log("Database Sync: loaded", productsList.length, "products.");
    } catch (err) {
        console.error("Critical: Failed to load products from DB", err);
        alert("Database connection error. Please refresh the page.");
    }
}

// ---------------- POS LOGIC ---------------- //
function setupPOSEventListeners() {
    // Search & Barcode
    elements.posSearch.addEventListener('input', async (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            renderPOSProducts();
            return;
        }

        // Exact barcode match first
        const exactMatch = productsList.find(p => p.barcode === query);
        if (exactMatch) {
            addToCart(exactMatch);
            elements.posSearch.value = '';
            renderPOSProducts();
            return;
        }

        // Fuzzy search by name or barcode
        const filtered = productsList.filter(p => p.name.toLowerCase().includes(query) || p.barcode.includes(query));
        renderPOSProducts(filtered);
    });

    elements.posSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = e.target.value.toLowerCase().trim();
            if (!query) return;

            const filtered = productsList.filter(p => p.name.toLowerCase().includes(query) || p.barcode.includes(query));
            if (filtered.length === 1) {
                addToCart(filtered[0]);
                elements.posSearch.value = '';
                renderPOSProducts();
            } else if (filtered.length > 0) {
                addToCart(filtered[0]); // add the first fuzzy match automatically like a scanner sometimes does
                elements.posSearch.value = '';
                renderPOSProducts();
            }
        }
    });

    // POS Tabs (Bookshop vs Services)
    elements.btnBookshop.addEventListener('click', () => {
        currentCategory = 'Bookshop';
        elements.btnBookshop.classList.add('active');
        elements.btnServices.classList.remove('active');

        elements.posProductsGrid.classList.remove('hidden');
        elements.posServicesForm.classList.add('hidden');
        elements.posSearch.disabled = false;
        elements.posSearch.focus();
    });

    elements.btnServices.addEventListener('click', () => {
        currentCategory = 'Printshop';
        elements.btnServices.classList.add('active');
        elements.btnBookshop.classList.remove('active');

        elements.posProductsGrid.classList.add('hidden');
        elements.posServicesForm.classList.remove('hidden');
        elements.posSearch.disabled = true;
        elements.serviceDesc.focus();
    });

    // Add Printshop Item
    elements.btnAddService.addEventListener('click', () => {
        const desc = elements.serviceDesc.value.trim();
        const qty = parseInt(elements.serviceQty.value) || 1;
        const price = parseFloat(elements.servicePrice.value) || 0;

        if (!desc || price <= 0) {
            alert("Please enter a valid description and price.");
            return;
        }

        addToCart({
            id: 'srv_' + Date.now(),
            name: desc,
            price: price,
            isService: true
        }, qty);

        elements.serviceDesc.value = '';
        elements.serviceQty.value = 1;
        elements.servicePrice.value = '';
        elements.serviceDesc.focus();
    });

    // Cart actions
    elements.btnClearCart.addEventListener('click', clearCart);
    elements.btnPayCash.addEventListener('click', openCashCheckoutModal);

    // Credit Payment Path
    elements.btnPayCredit.addEventListener('click', () => {
        if (cart.length === 0) {
            alert("Cart is empty!");
            return;
        }

        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const discount = parseFloat(elements.cartDiscount.value) || 0;
        const total = subtotal - discount;

        elements.creditCheckoutTotal.innerText = `Rs. ${total.toFixed(2)}`;
        document.getElementById('credit-checkout-name').value = '';
        document.getElementById('credit-checkout-mobile').value = '';
        document.getElementById('credit-checkout-advance').value = '0';

        pendingCreditCheckout = { total: total, discount: discount };
        elements.creditModal.classList.remove('hidden');
        document.getElementById('credit-checkout-name').focus();
    });

    // Credit Modal Listeners
    elements.creditModalClose.addEventListener('click', () => elements.creditModal.classList.add('hidden'));
    elements.creditModalCancel.addEventListener('click', () => elements.creditModal.classList.add('hidden'));

    elements.creditCheckoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const customerName = document.getElementById('credit-checkout-name').value.trim();
        const customerMobile = document.getElementById('credit-checkout-mobile').value.trim();
        const advanceRaw = document.getElementById('credit-checkout-advance').value;
        const advance = advanceRaw ? parseFloat(advanceRaw) : 0;

        if (!customerName) return;

        elements.creditModal.classList.add('hidden');

        const useWhatsapp = elements.creditWhatsappCheckbox.checked;

        const sid = await processCheckout({
            paymentType: 'Credit',
            customerName: customerName,
            customerMobile: customerMobile,
            advancePayment: advance,
            useWhatsapp: useWhatsapp
        });
    });

    elements.cartDiscount.addEventListener('input', updateCartTotals);
}

function openCashCheckoutModal() {
    if (cart.length === 0) {
        alert("Cart is empty!");
        return;
    }
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const discount = parseFloat(elements.cartDiscount.value) || 0;
    const total = subtotal - discount;

    elements.cashCheckoutTotal.innerText = `Rs. ${total.toFixed(2)}`;
    elements.cashCheckoutGiven.value = '';
    elements.cashCheckoutChange.innerText = 'Rs. 0.00';
    elements.cashCheckoutChange.classList.remove('text-green-600', 'text-red-500');
    elements.cashCheckoutModal.classList.remove('hidden');
    setTimeout(() => elements.cashCheckoutGiven.focus(), 100);
}

function setupCashCheckoutListeners() {
    elements.cashCheckoutClose.addEventListener('click', () => elements.cashCheckoutModal.classList.add('hidden'));
    elements.cashCheckoutCancel.addEventListener('click', () => elements.cashCheckoutModal.classList.add('hidden'));

    elements.cashCheckoutGiven.addEventListener('input', (e) => {
        const given = parseFloat(e.target.value) || 0;
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const discount = parseFloat(elements.cartDiscount.value) || 0;
        const total = subtotal - discount;
        const change = given - total;

        elements.cashCheckoutChange.innerText = `Rs. ${Math.abs(change).toFixed(2)}${change < 0 ? ' (Short)' : ''}`;
        if (change >= 0) {
            elements.cashCheckoutChange.classList.remove('text-red-500');
            elements.cashCheckoutChange.classList.add('text-green-600');
        } else {
            elements.cashCheckoutChange.classList.add('text-red-500');
            elements.cashCheckoutChange.classList.remove('text-green-600');
        }
    });

    elements.cashCheckoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const given = parseFloat(elements.cashCheckoutGiven.value) || 0;
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const discount = parseFloat(elements.cartDiscount.value) || 0;
        const total = subtotal - discount;

        if (given < total) {
            alert("Insufficient cash given!");
            return;
        }

        const mobileInput = elements.cashCheckoutMobile;
        const mobile = mobileInput ? mobileInput.value.trim() : "";
        const useWhatsapp = elements.cashWhatsappCheckbox ? elements.cashWhatsappCheckbox.checked : false;

        elements.cashCheckoutModal.classList.add('hidden');
        await processCheckout({
            paymentType: 'Cash',
            customerMobile: mobile,
            useWhatsapp: useWhatsapp,
            cashGiven: given,
            changeAmount: (given - total)
        });

        if (document.querySelector('.tab-pane:not(.hidden)').id === 'tab-dashboard') renderDashboard();
        if (document.querySelector('.tab-pane:not(.hidden)').id === 'tab-recent-activity') renderRecentActivityTab();
    });

    elements.btnSendWhatsapp.addEventListener('click', () => {
        const mobile = elements.cashCheckoutMobile.value.trim();
        if (!mobile) return alert("Please enter customer mobile number.");

        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const discount = parseFloat(elements.cartDiscount.value) || 0;
        const total = subtotal - discount;

        const message = getWhatsAppBillMessage(cart, subtotal, discount, total, { paymentType: 'Cash' });
        sendWhatsAppMessage(mobile, message);
    });

    if (elements.btnSendWhatsappCredit) {
        elements.btnSendWhatsappCredit.addEventListener('click', async () => {
            const mobile = elements.creditCheckoutMobile.value.trim();
            const customerName = document.getElementById('credit-checkout-name').value.trim();
            const advance = parseFloat(document.getElementById('credit-checkout-advance').value) || 0;

            if (!mobile) return alert("Please enter customer mobile number.");
            if (!customerName) return alert("Please enter customer name.");

            const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
            const discount = parseFloat(elements.cartDiscount.value) || 0;
            const total = subtotal - discount;

            // Fetch current balance to show on WhatsApp
            let newTotalBalance = undefined;
            try {
                const existingCredit = await db.credits.where('customerName').equalsIgnoreCase(customerName).first();
                const currentTotalBalance = existingCredit ? existingCredit.balance : 0;
                newTotalBalance = currentTotalBalance + (total - advance);
            } catch (e) {
                console.error(e);
            }

            const message = getWhatsAppBillMessage(cart, subtotal, discount, total, {
                paymentType: 'Credit',
                customerName: customerName,
                advancePayment: advance,
                newTotalBalance: newTotalBalance
            });
            sendWhatsAppMessage(mobile, message);
        });
    }
}

function getWhatsAppBillMessage(items, subtotal, discount, total, options) {
    let message = `*J Plus Booksmart - WhatsApp E Bill*\n`;
    message += `Puttalam Road, Hewenpelessa, Nikaweratiya\n`;
    message += `Tel / WhatsApp 0768938940\n`;
    message += `Date: ${new Date().toLocaleString()}\n`;
    message += `Type: *${options.paymentType}${options.paymentType === 'Credit' ? ' - ' + options.customerName : ''}*\n`;
    message += `----------------------------\n`;
    items.forEach(item => {
        message += `*${item.name}*\n`;
        message += `${item.qty} x Rs. ${item.price.toFixed(2)} = Rs. ${(item.price * item.qty).toFixed(2)}\n`;
    });
    message += `----------------------------\n`;
    message += `Subtotal: Rs. ${subtotal.toFixed(2)}\n`;
    if (discount > 0) message += `Discount: Rs. ${discount.toFixed(2)}\n`;
    message += `*Total Bill: Rs. ${total.toFixed(2)}*\n`;

    if (options.paymentType === 'Credit') {
        if (options.advancePayment > 0) {
            message += `Advance Paid: Rs. ${options.advancePayment.toFixed(2)}\n`;
        }
        if (options.newTotalBalance !== undefined) {
            message += `*OUTSTANDING BAL: Rs. ${options.newTotalBalance.toFixed(2)}*\n`;
        }
    }

    message += `\nFB Online Store: web.facebook.com/Jplusonline.lk\n`;
    message += `Thank you! Come again.\n`;
    message += `_Software by Iraasoft Solution_`;
    return message;
}

function sendWhatsAppMessage(mobile, message) {
    let cleanMobile = mobile.replace(/[^0-9]/g, '');
    if (cleanMobile.startsWith('0')) cleanMobile = '94' + cleanMobile.substring(1);
    const whatsappUrl = `https://wa.me/${cleanMobile}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

function renderPOSProducts(products = null) {
    // If no products provided, use the global list
    const targetProducts = products || productsList;

    // Fallback: If list is still empty, and we haven't manually passed a list, try to sync
    if ((!targetProducts || targetProducts.length === 0) && products === null) {
        console.log("POS Render: No products found in memory, checking database...");
        db.products.toArray().then(items => {
            if (items && items.length > 0) {
                productsList = items;
                renderPOSProductsList(productsList);
            } else {
                showPoseEmptyState();
            }
        });
        return;
    }

    if (!targetProducts || targetProducts.length === 0) {
        showPoseEmptyState();
        return;
    }

    renderPOSProductsList(targetProducts);
}

function showPoseEmptyState() {
    elements.posProductsGrid.innerHTML = `
        <div class="col-span-full flex flex-col items-center justify-center p-20 text-slate-300">
            <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <i data-lucide="package-search" class="w-8 h-8 opacity-20"></i>
            </div>
            <p class="font-black uppercase tracking-widest text-[10px]">No products available</p>
        </div>
    `;
    lucide.createIcons();
}

function renderPOSProductsList(products) {
    elements.posProductsGrid.innerHTML = '';

    products.forEach(p => {
        const div = document.createElement('div');
        const isLow = p.stock <= 5;

        // Dynamic border colors based on category
        const cat = (p.category || 'Other').toLowerCase();
        let accentColor = '#94a3b8'; // default slate
        if (cat.includes('pen') || cat.includes('stationery')) accentColor = '#6366f1'; // indigo
        if (cat.includes('book')) accentColor = '#10b981'; // emerald
        if (cat.includes('acc') || cat.includes('other')) accentColor = '#f59e0b'; // amber
        if (cat.includes('tech') || cat.includes('electronic')) accentColor = '#8b5cf6'; // violet

        div.className = `product-card group relative p-4 rounded-2xl bg-white border border-slate-100 shadow-sm cursor-pointer transition-all active:scale-95 hover:shadow-xl hover:-translate-y-1 overflow-hidden h-32 flex flex-col justify-between`;

        div.innerHTML = `
            <!-- Category Accent Bar -->
            <div class="absolute left-0 top-0 bottom-0 w-1.5" style="background-color: ${accentColor};"></div>

            <div class="relative z-10 pl-2">
                <div class="flex justify-between items-start">
                    <p class="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest truncate max-w-[100px]">${p.barcode}</p>
                    ${isLow ? '<div class="flex items-center gap-1"><span class="text-[8px] font-black text-red-500 uppercase">Low</span><span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span></div>' : ''}
                </div>
                <h3 class="font-bold text-[13px] text-slate-800 leading-tight line-clamp-2 mt-1.5 tracking-tight group-hover:text-indigo-600 transition-colors">${p.name}</h3>
            </div>

            <div class="relative z-10 pl-2 flex justify-between items-end">
                <span class="text-sm font-black text-slate-900 tracking-tighter">Rs.${p.price.toFixed(2)}</span>
                <span class="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">${p.stock} <span class="opacity-60">QTY</span></span>
            </div>
        `;

        div.addEventListener('click', () => addToCart(p));
        elements.posProductsGrid.appendChild(div);
    });
    lucide.createIcons();
}

function addToCart(product, quantity = 1) {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        if (!product.isService && existing.qty + quantity > product.stock) {
            alert(`Not enough stock! Only ${product.stock} available.`);
            return;
        }
        existing.qty += quantity;
    } else {
        if (!product.isService && quantity > product.stock) {
            alert(`Not enough stock! Only ${product.stock} available.`);
            return;
        }
        cart.push({ ...product, qty: quantity });
    }
    renderCart();
}

// Expose to window for inline onclick handler
window.updateCartItemQty = function (id, newQty) {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    if (newQty <= 0) {
        cart = cart.filter(i => i.id !== id);
    } else {
        if (!item.isService) {
            const product = productsList.find(p => p.id === id);
            if (newQty > product.stock) {
                alert("Stock limit exceeded");
                return;
            }
        }
        item.qty = newQty;
    }
    renderCart();
}

function renderCart() {
    elements.cartItems.innerHTML = '';

    if (cart.length === 0) {
        elements.cartItems.innerHTML = `
            <div class="text-center text-gray-400 mt-10">
                <i data-lucide="shopping-cart" class="w-12 h-12 mx-auto mb-2 opacity-50"></i>
                <p>Cart is empty</p>
            </div>
        `;
        lucide.createIcons();
        updateCartTotals();
        return;
    }

    cart.forEach(item => {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center py-3 border-b border-gray-100 cursor-pointer group';
        div.innerHTML = `
            <div class="flex-1 pr-2">
                <p class="font-medium text-gray-800 text-sm leading-tight">${item.name}</p>
                <div class="flex items-center mt-1">
                    <button class="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300" onclick="event.stopPropagation(); updateCartItemQty('${item.id}', ${item.qty - 1})">-</button>
                    <span class="mx-2 text-sm">${item.qty}</span>
                    <button class="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300" onclick="event.stopPropagation(); updateCartItemQty('${item.id}', ${item.qty + 1})">+</button>
                </div>
            </div>
            <div class="text-right">
                <p class="font-bold text-gray-800">Rs. ${(item.price * item.qty).toFixed(2)}</p>
                <button class="text-xs text-red-500 hover:underline mt-1" onclick="event.stopPropagation(); updateCartItemQty('${item.id}', 0)">Remove</button>
            </div>
        `;
        div.onclick = () => updateCartItemQty(item.id, item.qty + 1);
        elements.cartItems.appendChild(div);
    });

    updateCartTotals();
}

function updateCartTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const discountStr = elements.cartDiscount.value;
    const discount = discountStr === '' ? 0 : parseFloat(discountStr) || 0;
    const total = subtotal - discount;

    elements.cartSubtotal.innerText = `Rs. ${subtotal.toFixed(2)}`;
    elements.cartTotal.innerText = `Rs. ${total.toFixed(2)}`;
}

function clearCart() {
    cart = [];
    elements.cartDiscount.value = '0';
    renderCart();
    elements.posSearch.focus();
}

async function processCheckout(options) {
    if (isProcessingCheckout) return;
    isProcessingCheckout = true;

    try {
        if (cart.length === 0) {
            alert("Cart is empty!");
            return;
        }

        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const discount = parseFloat(elements.cartDiscount.value) || 0;
        const total = subtotal - discount;
        const dateNow = new Date().toISOString();

        // 1. If Credit, fetch current balance to show on receipt
        if (options.paymentType === 'Credit') {
            try {
                const existingCredit = await db.credits.where('customerName').equalsIgnoreCase(options.customerName).first();
                const currentTotalBalance = existingCredit ? existingCredit.balance : 0;
                options.newTotalBalance = currentTotalBalance + (total - options.advancePayment);
            } catch (e) {
                console.error("Error fetching credit balance for receipt:", e);
            }
        }

        // 2. Generate Print Receipt
        generateReceiptDOM(cart, subtotal, discount, total, options);

        // 3. Perform DB operations
        let saleId = await db.transaction('rw', db.sales, db.products, db.credits, db.cashLogs, async () => {
            // Save sale
            let saleRecord = {
                date: dateNow,
                items: [...cart],
                total: total,
                discount: discount,
                paymentType: options.paymentType,
                paymentStatus: options.paymentType === 'Cash' ? 'Paid' : 'Unpaid'
            };

            // Handle Credit specific logic
            if (options.paymentType === 'Credit') {
                const existingCredit = await db.credits.where('customerName').equalsIgnoreCase(options.customerName).first();
                const balanceForThisBill = total - options.advancePayment;

                if (existingCredit) {
                    await db.credits.update(existingCredit.id, {
                        totalAmount: existingCredit.totalAmount + total,
                        paidAmount: existingCredit.paidAmount + options.advancePayment,
                        balance: existingCredit.balance + balanceForThisBill,
                        lastPaymentDate: options.advancePayment > 0 ? dateNow : existingCredit.lastPaymentDate
                    });
                    saleRecord.customerId = existingCredit.id;
                } else {
                    const newCreditId = await db.credits.add({
                        customerName: options.customerName,
                        customerMobile: options.customerMobile || '',
                        totalAmount: total,
                        paidAmount: options.advancePayment,
                        balance: balanceForThisBill,
                        lastPaymentDate: options.advancePayment > 0 ? dateNow : null
                    });
                    saleRecord.customerId = newCreditId;
                }
                saleRecord.advancePayment = options.advancePayment;
            }

            const sid = await db.sales.add(saleRecord);

            // Deduct stock
            for (let item of cart) {
                if (!item.isService) {
                    const p = await db.products.get(item.id);
                    if (p) {
                        await db.products.update(item.id, { stock: Math.max(0, p.stock - item.qty) });
                    }
                }
            }

            // Cash Log
            if (options.paymentType === 'Cash' || (options.paymentType === 'Credit' && options.advancePayment > 0)) {
                await db.cashLogs.add({
                    type: 'CASH_IN',
                    amount: options.paymentType === 'Cash' ? total : options.advancePayment,
                    reason: options.paymentType === 'Cash' ? 'POS Cash Sale' : `Credit Advance - ${options.customerName}`,
                    date: dateNow,
                    refId: sid,
                    refTable: 'sales',
                    performedBy: currentUser.displayName
                });
            }
            return sid;
        });

        // 4. Print
        document.body.classList.add('receipt-mode');
        window.print();
        document.body.classList.remove('receipt-mode');

        // 5. Cleanup
        await loadProducts();
        renderPOSProducts();
        if (document.querySelector('.tab-pane:not(.hidden)').id === 'tab-inventory') renderInventory();
        if (document.querySelector('.tab-pane:not(.hidden)').id === 'tab-credits') renderCreditsList();

        clearCart();
        return saleId;

    } catch (err) {
        console.error("Checkout Error:", err);
        alert("Error saving transaction!");
        return null;
    } finally {
        isProcessingCheckout = false;
    }
}

function generateReceiptDOM(items, subtotal, discount, total, options) {
    let dateStr = options.date ? new Date(options.date).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
    let typeDisplay = options.paymentType;
    if (options.paymentType === 'Credit') {
        typeDisplay = `CREDIT: ${options.customerName}`;
    }

    let isReprint = options.isReprint === true;

    let html = `
        <div style="text-align: center; margin-bottom: 3mm; font-family: 'Courier New', Courier, monospace;">
            ${isReprint ? '<h1 style="margin: 0; font-size: 16pt; font-weight: bold; border: 2px solid #000; display: inline-block; padding: 1mm 4mm; margin-bottom: 2mm;">REPRINT</h1>' : ''}
            <h2 style="margin: 0; font-size: 14pt; font-weight: bold; text-transform: uppercase;">J Plus Booksmart</h2>
            <div style="font-size: 9pt;">Puttalam Road, Hewenpelessa,</div>
            <div style="font-size: 9pt;">Nikaweratiya</div>
            <div style="font-size: 9pt;">Tel / WhatsApp 0768938940</div>
            <div style="margin-top: 2mm;">--------------------------------</div>
        </div>
        
        <div style="font-size: 10pt; margin-bottom: 3mm; font-family: 'Courier New', Courier, monospace;">
            <div style="display: flex; justify-content: space-between;">
                <span>Date: ${dateStr}</span>
            </div>
            <div style="margin-top: 1mm;">
                Type: <strong>${typeDisplay}</strong>
            </div>
        </div>

        <table style="width: 100%; font-size: 10pt; border-collapse: collapse; margin-bottom: 2mm; font-family: 'Courier New', Courier, monospace;">
            <thead>
                <tr style="border-bottom: 1px dashed #000;">
                    <th style="padding-bottom: 1mm; text-align: left;">Item</th>
                    <th style="padding-bottom: 1mm; text-align: right; width: 30px;">Qty</th>
                    <th style="padding-bottom: 1mm; text-align: right; width: 60px;">Total</th>
                </tr>
            </thead>
            <tbody>
    `;

    items.forEach(item => {
        // Truncate name for fit
        let displayName = item.name.length > 18 ? item.name.substring(0, 16) + '..' : item.name;
        html += `
            <tr style="border-bottom: 0.1mm solid #eee;">
                <td style="padding: 1.5mm 0; word-break: break-all;">${displayName}</td>
                <td style="text-align: right; vertical-align: middle;">${item.qty}</td>
                <td style="text-align: right; vertical-align: middle;">${(item.price * item.qty).toFixed(2)}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>

        <div style="border-top: 1px dashed #000; margin-top: 2mm;"></div>
        
        <table style="width: 100%; font-size: 10pt; text-align: right; margin-top: 2mm; font-family: 'Courier New', Courier, monospace;">
            <tr>
                <td style="padding-bottom: 1mm;">Subtotal:</td>
                <td style="padding-bottom: 1mm;">${subtotal.toFixed(2)}</td>
            </tr>
            ${discount > 0 ? `
            <tr>
                <td style="padding-bottom: 1mm;">Discount:</td>
                <td style="padding-bottom: 1mm;">-${discount.toFixed(2)}</td>
            </tr>` : ''}
            <tr style="font-weight: bold; border-top: 1px solid #000;">
                <td style="padding-top: 2mm; font-size: 11pt;">GRAND TOTAL:</td>
                <td style="padding-top: 2mm; font-size: 11pt;">Rs. ${total.toFixed(2)}</td>
            </tr>
            ${options.paymentType === 'Cash' && options.cashGiven !== undefined ? `
            <tr style="border-top: 1px dashed #000;">
                <td style="padding-top: 2mm;">Cash Given:</td>
                <td style="padding-top: 2mm;">${options.cashGiven.toFixed(2)}</td>
            </tr>
            <tr style="font-weight: bold;">
                <td style="padding-bottom: 1mm;">Change:</td>
                <td style="padding-bottom: 1mm;">Rs. ${options.changeAmount.toFixed(2)}</td>
            </tr>` : ''}
            ${options.paymentType === 'Credit' && options.newTotalBalance !== undefined ? `
            <tr style="border-top: 1px dashed #000; font-weight: bold;">
                <td style="padding-top: 2mm;">OUTSTANDING BAL:</td>
                <td style="padding-top: 2mm;">Rs. ${options.newTotalBalance.toFixed(2)}</td>
            </tr>` : ''}
        </table>

        <div style="text-align: center; font-size: 9pt; margin-top: 8mm; border-top: 1px dashed #000; padding-top: 3mm; font-family: 'Courier New', Courier, monospace;">
            Thank you! Come again!<br>
            *** J Plus Booksmart ***<br>
            Software by Iraasoft Solution
        </div>
        
        <!-- FB QR Code -->
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: 5mm;">
            <div id="receipt-qrcode" style="padding: 2mm; background: #fff;"></div>
            <div style="font-size: 7pt; margin-top: 2mm; color: #666;">Scan for our FB Online Store</div>
        </div>

        <div style="height: 10mm;"></div> <!-- White space for paper tear -->
    `;

    elements.printArea.innerHTML = html;

    // Generate QR Code
    try {
        new QRCode(document.getElementById("receipt-qrcode"), {
            text: "https://web.facebook.com/Jplusonline.lk",
            width: 80,
            height: 80,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    } catch (e) {
        console.error("QR Code generation failed", e);
    }
}

// ---------------- INVENTORY LOGIC ---------------- //
function setupInventoryListeners() {
    elements.btnAddProduct.addEventListener('click', () => {
        document.getElementById('prod-id').value = '';
        elements.productForm.reset();
        document.getElementById('product-modal-title').innerText = 'Add New Product';
        elements.productModal.classList.remove('hidden');
    });

    elements.modalCloseBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.fixed');
            if (modal) modal.classList.add('hidden');
        });
    });

    elements.productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('prod-id').value;
        const data = {
            barcode: document.getElementById('prod-barcode').value,
            name: document.getElementById('prod-name').value,
            price: parseFloat(document.getElementById('prod-price').value),
            stock: parseInt(document.getElementById('prod-stock').value),
            category: document.getElementById('prod-category').value,
        };

        try {
            if (id) {
                const oldProduct = await db.products.get(parseInt(id));
                await db.products.update(parseInt(id), data);

                // Audit Log for Price or Stock change
                let changes = [];
                if (oldProduct.price !== data.price) changes.push(`Price: ${oldProduct.price} -> ${data.price}`);
                if (oldProduct.stock !== data.stock) changes.push(`Stock: ${oldProduct.stock} -> ${data.stock}`);
                if (changes.length > 0) {
                    await logAuditAction("EDIT_PRODUCT", `Product '${data.name}' (Barcode: ${data.barcode}) updated. ${changes.join(', ')}`);
                }

                console.log("DB Update: Success", data.name);
            } else {
                const ex = await db.products.where('barcode').equals(data.barcode).first();
                if (ex) {
                    alert("Barcode already exists!");
                    return;
                }
                await db.products.add(data);
                await logAuditAction("ADD_PRODUCT", `New product '${data.name}' (Barcode: ${data.barcode}) added. Price: ${data.price}, Stock: ${data.stock}`);
                console.log("DB Add: Success", data.name);
            }

            elements.productModal.classList.add('hidden');
            await loadProducts();
            renderInventory();
            console.log("Inventory Rendered after add/update");
            if (document.querySelector('.tab-pane:not(.hidden)').id === 'tab-pos') {
                renderPOSProducts();
            }
        } catch (err) {
            console.error("DB Error during product save:", err);
            alert("Failed to save product to database.");
        }
    });

    elements.inventorySearch.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        if (!q) {
            renderInventory(); // Re-render the full list if search is cleared
            return;
        }
        const filtered = productsList.filter(p =>
            (p.name && p.name.toLowerCase().includes(q)) ||
            (p.barcode && p.barcode.includes(q))
        );
        renderInventoryList(filtered);
    });

    elements.btnRefreshInventory.addEventListener('click', async () => {
        const icon = elements.btnRefreshInventory.querySelector('i');
        icon.classList.add('animate-spin');
        await loadProducts();
        renderInventory();
        setTimeout(() => icon.classList.remove('animate-spin'), 1000);
    });
}

function renderInventory() {
    if (!productsList || productsList.length === 0) {
        // Double check from DB just in case
        loadProducts().then(() => {
            renderInventoryList(productsList);
        });
        return;
    }
    renderInventoryList(productsList);
}

function renderInventoryList(list) {
    elements.inventoryTableBody.innerHTML = '';

    if (list.length === 0) {
        elements.inventoryTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="p-20 text-center">
                    <div class="flex flex-col items-center justify-center text-slate-300">
                        <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <i data-lucide="package-search" class="w-10 h-10 opacity-20"></i>
                        </div>
                        <p class="font-black uppercase tracking-widest text-[10px]">No products available</p>
                    </div>
                </td>
            </tr>
        `;
        lucide.createIcons();
        return;
    }

    list.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = 'group hover:bg-slate-50/50 transition-colors cursor-default';
        const isLow = p.stock <= 5;

        tr.innerHTML = `
            <td class="p-6 pl-8">
                <span class="text-[10px] font-black text-slate-300 uppercase tracking-widest">${p.barcode}</span>
            </td>
            <td class="p-6">
                <div class="font-bold text-slate-800">${p.name}</div>
            </td>
            <td class="p-6">
                <span class="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-wider">${p.category}</span>
            </td>
            <td class="p-6 text-right">
                <div class="font-black text-slate-800">Rs. ${p.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </td>
            <td class="p-6 text-right">
                <span class="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isLow ? 'bg-red-50 text-red-500 shadow-sm shadow-red-100' : 'bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-100'}">
                    ${p.stock} Units
                </span>
            </td>
            <td class="p-6 pr-8 text-center">
                <div class="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="p-2 bg-white border border-slate-100 rounded-xl text-indigo-600 hover:text-white hover:bg-indigo-600 hover:border-indigo-600 shadow-sm transition-all" 
                        onclick="editProduct(${p.id})">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                    </button>
                    ${currentUser.role === 'owner' ? `
                    <button class="p-2 bg-white border border-slate-100 rounded-xl text-red-500 hover:text-white hover:bg-red-500 hover:border-red-500 shadow-sm transition-all" 
                        onclick="deleteProduct(${p.id})">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>` : ''}
                </div>
            </td>
        `;
        elements.inventoryTableBody.appendChild(tr);
    });
    lucide.createIcons();
}

window.editProduct = async function (id) {
    const p = await db.products.get(id);
    if (p) {
        document.getElementById('prod-id').value = p.id;
        document.getElementById('prod-barcode').value = p.barcode;
        document.getElementById('prod-name').value = p.name;
        document.getElementById('prod-price').value = p.price;
        document.getElementById('prod-stock').value = p.stock;
        document.getElementById('prod-category').value = p.category;

        document.getElementById('product-modal-title').innerText = 'Edit Product';
        elements.productModal.classList.remove('hidden');
    }
}

window.deleteProduct = async function (id) {
    const isConfirmed = await showConfirm("Delete Product?", "Are you sure you want to delete this product?");
    if (isConfirmed) {
        try {
            const product = await db.products.get(id);
            if (product) {
                await logAuditAction("DELETE_PRODUCT", `Deleted product '${product.name}' (Barcode: ${product.barcode}). Final Stock: ${product.stock}`);
            }
            await db.products.delete(id);
            // Sync deletion to cloud
            if (typeof syncDelete === 'function') await syncDelete('products', id);

            await loadProducts();
            renderInventory();
            if (document.querySelector('.tab-pane:not(.hidden)').id === 'tab-pos') {
                renderPOSProducts();
            }
        } catch (err) {
            console.error(err);
        }
    }
};

// ---------------- UTILITY LOGIC ---------------- //
function setupUtilityListeners() {
    elements.utilityForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const type = document.getElementById('utility-type').value;
        const acc = document.getElementById('utility-acc').value;
        const name = document.getElementById('utility-name').value;
        const mobile = document.getElementById('utility-mobile').value;
        const amountStr = document.getElementById('utility-amount').value;
        const chargesStr = document.getElementById('utility-charges').value;
        const amount = parseFloat(amountStr);
        const charges = parseFloat(chargesStr) || 0;

        if (!amount || amount <= 0) return;

        const b = {
            billType: type,
            accountNo: acc,
            customerName: name,
            customerMobile: mobile,
            amount: amount,
            charges: charges,
            date: new Date().toISOString(),
            performedBy: currentUser.displayName
        };

        try {
            const billId = await db.billPayments.add(b);
            await db.cashLogs.add({
                type: 'CASH_IN',
                amount: amount + charges,
                reason: `Utility Bill - ${type}`,
                date: b.date,
                refId: billId,
                refTable: 'billPayments',
                performedBy: currentUser.displayName
            });
            if (document.querySelector('.tab-pane:not(.hidden)').id === 'tab-dashboard') renderDashboard();
            if (document.querySelector('.tab-pane:not(.hidden)').id === 'tab-recent-activity') renderRecentActivityTab();

            generateUtilityReceipt(b);
            document.body.classList.add('receipt-mode');
            window.print();
            document.body.classList.remove('receipt-mode');
            elements.utilityForm.reset();
        } catch (err) {
            console.error(err);
            alert("Failed to save bill payment");
        }
    });
}

function generateUtilityReceipt(bill, isReprint = false) {
    let dateStr = new Date(bill.date).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
    let html = `
        <div style="text-align: center; margin-bottom: 3mm; font-family: 'Courier New', Courier, monospace;">
            ${isReprint ? '<h1 style="margin: 0; font-size: 16pt; font-weight: bold; border: 2px solid #000; display: inline-block; padding: 1mm 4mm; margin-bottom: 2mm;">REPRINT</h1>' : ''}
            <h2 style="margin: 0; font-size: 14pt; font-weight: bold; text-transform: uppercase;">J Plus Booksmart</h2>
            <div style="font-size: 9pt;">Puttalam Road, Hewenpelessa,</div>
            <div style="font-size: 9pt;">Nikaweratiya</div>
            <div style="font-size: 9pt;">Tel / WhatsApp 0768938940</div>
            <div style="margin-top: 2mm;">--------------------------------</div>
        </div>

        <div style="font-size: 10pt; margin-bottom: 3mm; font-family: 'Courier New', Courier, monospace;">
            Date: ${dateStr}<br>
            Type: <strong>Utility Payment</strong><br>
            Category: <strong>${bill.billType}</strong>
        </div>

        <div style="border-bottom: 1px dashed #000; margin-bottom: 2mm;"></div>
        
        <table style="width: 100%; font-size: 10pt; text-align: left; font-family: 'Courier New', Courier, monospace;">
            <tr><td style="padding:1mm 0;">Account No:</td><td style="font-weight:bold; text-align:right;">${bill.accountNo}</td></tr>
            ${bill.customerName ? `<tr><td style="padding:1mm 0;">Name:</td><td style="text-align:right;">${bill.customerName}</td></tr>` : ''}
            ${bill.customerMobile ? `<tr><td style="padding:1mm 0;">Mobile:</td><td style="text-align:right;">${bill.customerMobile}</td></tr>` : ''}
            <tr><td style="padding:1mm 0;">Bill Amount:</td><td style="text-align:right;">${bill.amount.toFixed(2)}</td></tr>
            <tr><td style="padding:1mm 0;">Service Chrg:</td><td style="text-align:right;">${(bill.charges || 0).toFixed(2)}</td></tr>
            <tr style="border-top: 1px solid #000;">
                <td style="padding-top: 2mm; font-weight:bold; font-size:11pt;">TOTAL:</td>
                <td style="padding-top: 2mm; font-weight:bold; font-size:11pt; text-align:right;">Rs. ${(bill.amount + (bill.charges || 0)).toFixed(2)}</td>
            </tr>
        </table>

        <div style="text-align: center; font-size: 9pt; margin-top: 8mm; border-top: 1px dashed #000; padding-top: 3mm; font-family: 'Courier New', Courier, monospace;">
            Thank you! Come again!<br>
            *** J Plus Booksmart ***<br>
            Software by Iraasoft Solution
        </div>
        <div style="height: 10mm;"></div>
    `;
    elements.printArea.innerHTML = html;
}

// ---------------- CREDITS LOGIC ---------------- //
function setupCreditListeners() {
    elements.creditPaymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = parseInt(elements.creditPaymentId.value);
        const amount = parseFloat(elements.creditPaymentAmount.value);
        if (!id || !amount || amount <= 0) return;

        try {
            const credit = await db.credits.get(id);
            if (!credit) return;

            const newPaid = credit.paidAmount + amount;
            const newBalance = credit.totalAmount - newPaid;

            await db.credits.update(id, {
                paidAmount: newPaid,
                balance: newBalance,
                lastPaymentDate: new Date().toISOString()
            });

            await db.cashLogs.add({
                type: 'CASH_IN',
                amount: amount,
                reason: `Credit Payment - ${credit.customerName}`,
                date: new Date().toISOString(),
                refId: id,
                refTable: 'credits',
                performedBy: currentUser.displayName
            });
            if (document.querySelector('.tab-pane:not(.hidden)').id === 'tab-dashboard') renderDashboard();
            if (document.querySelector('.tab-pane:not(.hidden)').id === 'tab-recent-activity') renderRecentActivityTab();

            // Print Receipt for Credit Payment
            generateCreditPaymentReceipt(credit.customerName, amount, newBalance);
            document.body.classList.add('receipt-mode');
            window.print();
            document.body.classList.remove('receipt-mode');

            // Refresh panel
            elements.creditPaymentForm.reset();
            elements.creditPaymentForm.classList.add('hidden');
            elements.creditHistoryPanel.classList.add('hidden');
            document.querySelector('#credit-payment-panel > p').classList.remove('hidden');

            await renderCreditsList();

        } catch (err) {
            console.error(err);
            alert("Error processing credit payment");
        }
    });
}

async function renderCreditsList() {
    const credits = await db.credits.orderBy('balance').reverse().toArray();
    // Filter out debts that are fully paid
    const activeDebts = credits.filter(c => c.balance > 0);

    if (activeDebts.length === 0) {
        elements.creditsList.innerHTML = `<p class="text-gray-500 text-center py-4">No active debts found.</p>`;
        return;
    }

    elements.creditsList.innerHTML = activeDebts.map(c => `
        <div class="border border-gray-200 rounded-lg p-3 mb-3 hover:bg-orange-50 cursor-pointer transition flex justify-between items-center" onclick="selectCreditCustomer(${c.id}, '${c.customerName.replace(/'/g, "\\'")}', ${c.balance})">
             <div class="flex items-center gap-3">
                 <div class="bg-orange-100 text-orange-600 p-2 rounded-full">
                     <i data-lucide="user" class="w-5 h-5"></i>
                 </div>
                 <div>
                     <p class="font-bold text-gray-800">${c.customerName}</p>
                     <p class="text-xs text-gray-500">${c.customerMobile || 'No mobile logged'}</p>
                 </div>
             </div>
             <div class="text-right">
                 <p class="text-red-500 font-bold text-lg">Rs. ${c.balance.toFixed(2)}</p>
                 <p class="text-xs text-gray-400">Total: Rs. ${c.totalAmount.toFixed(2)}</p>
             </div>
        </div>
    `).join('');

    lucide.createIcons();
}

window.selectCreditCustomer = function (id, name, balance) {
    document.querySelector('#credit-payment-panel > p').classList.add('hidden');
    elements.creditPaymentForm.classList.remove('hidden');
    elements.creditHistoryPanel.classList.remove('hidden');

    elements.creditPaymentId.value = id;
    elements.creditPaymentName.value = name;
    elements.creditCurrentBalance.innerText = `Rs. ${balance.toFixed(2)}`;
    elements.creditPaymentAmount.value = '';
    elements.creditPaymentAmount.max = balance; // prevent overpaying
    elements.creditPaymentAmount.focus();

    renderCreditHistory(id);
}

async function renderCreditHistory(customerId) {
    if (!elements.creditHistoryList) return;

    elements.creditHistoryList.innerHTML = '<p class="text-center text-slate-400 py-10">Loading history...</p>';

    try {
        // 1. Fetch Sales for this customer
        const sales = await db.sales.where('customerId').equals(customerId).toArray();

        // 2. Fetch Payments (Cash Logs) for this customer
        // Note: Credit payments are logged with refTable: 'credits' and refId: customerId (as sid was used in previous code)
        // Wait, let's check setupCreditListeners to see how refId is set.
        const payments = await db.cashLogs.where('refTable').equals('credits').and(log => log.refId === customerId).toArray();

        // 3. Merge and Sort
        const history = [];

        sales.forEach(s => {
            // Add the main credit sale
            history.push({
                date: s.date,
                type: 'SALE',
                amount: s.total,
                label: 'Credit Sale',
                id: s.id
            });

            // Add advance payment if exists
            if (s.advancePayment > 0) {
                history.push({
                    date: s.date,
                    type: 'ADVANCE',
                    amount: s.advancePayment,
                    label: 'Down Payment',
                    id: s.id
                });
            }
        });

        payments.forEach(p => {
            history.push({
                date: p.date,
                type: 'PAYMENT',
                amount: p.amount,
                label: 'Account Payment',
                id: p.id
            });
        });

        // Sort by date descending
        history.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (history.length === 0) {
            elements.creditHistoryList.innerHTML = '<p class="text-center text-slate-400 py-10">No transactions found.</p>';
            return;
        }

        elements.creditHistoryList.innerHTML = history.map(item => {
            const dateObj = new Date(item.date);
            let icon = 'shopping-bag';
            let colorClass = 'text-slate-600';
            let bgClass = 'bg-slate-50';

            if (item.type === 'PAYMENT' || item.type === 'ADVANCE') {
                icon = 'check-circle';
                colorClass = 'text-emerald-600';
                bgClass = 'bg-emerald-50';
            } else if (item.type === 'SALE') {
                icon = 'file-text';
                colorClass = 'text-rose-500';
                bgClass = 'bg-rose-50';
            }

            return `
                <div class="flex justify-between items-center p-4 rounded-2xl bg-white border border-slate-50 hover:border-slate-100 transition-all shadow-sm">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-xl ${bgClass} ${colorClass} flex items-center justify-center shadow-inner">
                            <i data-lucide="${icon}" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <p class="font-bold text-slate-800 text-sm">${item.label}</p>
                            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">${dateObj.toLocaleDateString()} &bull; ${dateObj.toLocaleTimeString('en-GB', { timeStyle: 'short' })}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="font-black ${colorClass} text-base tracking-tight">
                            ${(item.type === 'SALE') ? '+' : '-'} Rs. ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            `;
        }).join('');

        lucide.createIcons();
    } catch (err) {
        console.error("History Render Error:", err);
        elements.creditHistoryList.innerHTML = '<p class="text-center text-rose-400 py-10">Failed to load history.</p>';
    }
}

function generateCreditPaymentReceipt(customerName, paidAmount, newBalance, isReprint = false) {
    let dateStr = new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
    let html = `
        <div style="text-align: center; margin-bottom: 3mm; font-family: 'Courier New', Courier, monospace;">
            ${isReprint ? '<h1 style="margin: 0; font-size: 16pt; font-weight: bold; border: 2px solid #000; display: inline-block; padding: 1mm 4mm; margin-bottom: 2mm;">REPRINT</h1>' : ''}
            <h2 style="margin: 0; font-size: 14pt; font-weight: bold; text-transform: uppercase;">J Plus Booksmart</h2>
            <div style="font-size: 9pt;">Puttalam Road, Hewenpelessa,</div>
            <div style="font-size: 9pt;">Nikaweratiya</div>
            <div style="font-size: 9pt;">Tel / WhatsApp 0768938940</div>
            <div style="margin-top: 2mm;">--------------------------------</div>
        </div>

        <div style="font-size: 10pt; margin-bottom: 3mm; font-family: 'Courier New', Courier, monospace;">
            Date: ${dateStr}<br>
            Type: <strong>Credit Payment</strong><br>
            Customer: <strong>${customerName}</strong>
        </div>

        <div style="border-bottom: 1px dashed #000; margin-bottom: 2mm;"></div>
        
        <table style="width: 100%; font-size: 11pt; text-align: left; font-family: 'Courier New', Courier, monospace;">
            <tr style="font-weight: bold;">
                <td style="padding:1mm 0;">Amount Paid:</td>
                <td style="text-align:right;">Rs. ${paidAmount.toFixed(2)}</td>
            </tr>
            <tr>
                <td style="padding:1mm 0;">New Balance:</td>
                <td style="text-align:right; color: #000;">Rs. ${newBalance.toFixed(2)}</td>
            </tr>
        </table>

        <div style="text-align: center; font-size: 9pt; margin-top: 8mm; border-top: 1px dashed #000; padding-top: 3mm; font-family: 'Courier New', Courier, monospace;">
            Thank you! Come again!<br>
            *** J Plus Booksmart ***<br>
            Software by Iraasoft Solution
        </div>
        <div style="height: 10mm;"></div>
    `;
    elements.printArea.innerHTML = html;
}

// ---------------- DASHBOARD LOGIC ---------------- //
// ---------------- DASHBOARD LOGIC ---------------- //
function setupDashboardListeners() {
    elements.btnModalCashIn.addEventListener('click', () => {
        elements.cashLogType.value = 'CASH_IN';
        elements.cashModalTitle.innerText = 'Add Cash to Drawer';
        elements.cashLogForm.reset();
        elements.cashLogModal.classList.remove('hidden');
        setTimeout(() => elements.cashLogAmount.focus(), 100);
    });

    elements.btnModalCashOut.addEventListener('click', () => {
        elements.cashLogType.value = 'CASH_OUT';
        elements.cashModalTitle.innerText = 'Remove Cash from Drawer';
        elements.cashLogForm.reset();
        elements.cashLogModal.classList.remove('hidden');
        setTimeout(() => elements.cashLogAmount.focus(), 100);
    });

    elements.cashModalClose.addEventListener('click', () => elements.cashLogModal.classList.add('hidden'));

    elements.cashLogForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = elements.cashLogType.value;
        const amount = parseFloat(elements.cashLogAmount.value);
        const reason = elements.cashLogReason.value.trim();

        if (!amount || !reason) return;

        await db.cashLogs.add({
            type: type,
            amount: amount,
            reason: reason,
            date: new Date().toISOString(),
            performedBy: currentUser.displayName
        });

        elements.cashLogModal.classList.add('hidden');
        renderDashboard();
        if (document.querySelector('.tab-pane:not(.hidden)').id === 'tab-recent-activity') renderRecentActivityTab();
    });

    // Edit Activity Form Listener
    elements.editActivityForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = parseInt(elements.editActivityId.value);
        const reason = elements.editActivityReason.value.trim();
        const amount = parseFloat(elements.editActivityAmount.value);

        if (!id || !reason || isNaN(amount)) return;

        try {
            const oldLog = await db.cashLogs.get(id);
            if (!oldLog) return;

            await db.cashLogs.update(id, { reason, amount, isEdited: true });

            await logAuditAction("EDIT_ACTIVITY", `Edited Activity #${id}. Old Amount: ${oldLog.amount}, New Amount: ${amount}. Old Reason: '${oldLog.reason}', New Reason: '${reason}'`);

            // Also mark the original record if it exists
            const log = await db.cashLogs.get(id);
            if (log && log.refTable && log.refId) {
                if (log.refTable === 'expenses') await db.expenses.update(log.refId, { isEdited: true });
                if (log.refTable === 'sales') await db.sales.update(log.refId, { isEdited: true });
            }

            elements.editActivityModal.classList.add('hidden');
            renderDashboard();
            if (document.querySelector('.tab-pane:not(.hidden)').id === 'tab-recent-activity') renderRecentActivityTab();
        } catch (err) {
            console.error(err);
            alert("Failed to update activity.");
        }
    });
}

window.reprintActivity = async function (id) {
    const log = await db.cashLogs.get(id);
    if (!log) return alert("Log not found.");

    try {
        if (log.refTable === 'sales') {
            const sale = await db.sales.get(log.refId);
            if (sale) {
                generateReceiptDOM(sale.items, (sale.total + sale.discount), sale.discount, sale.total, {
                    paymentType: sale.paymentType,
                    customerName: sale.customerName || '',
                    customerMobile: sale.customerMobile || '',
                    advancePayment: sale.advancePayment,
                    date: sale.date,
                    isReprint: true
                });
            } else { alert("Original sale record not found."); return; }
        } else if (log.refTable === 'billPayments') {
            const bill = await db.billPayments.get(log.refId);
            if (bill) {
                generateUtilityReceipt(bill, true);
            } else { alert("Original bill record not found."); return; }
        } else if (log.refTable === 'credits') {
            const credit = await db.credits.get(log.refId);
            if (credit) {
                generateCreditPaymentReceipt(credit.customerName, log.amount, credit.balance, true);
            } else { alert("Original credit record not found."); return; }
        } else {
            // Generic Cash Voucher for manual entries
            generateCashVoucherReceipt(log, true);
        }

        document.body.classList.add('receipt-mode');
        window.print();
        document.body.classList.remove('receipt-mode');

    } catch (err) {
        console.error("Reprint Error:", err);
        alert("Failed to reprint.");
    }
}

function generateCashVoucherReceipt(log, isReprint = false) {
    let dateStr = new Date(log.date).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
    let html = `
        <div style="text-align: center; margin-bottom: 3mm; font-family: 'Courier New', Courier, monospace;">
            ${isReprint ? '<h1 style="margin: 0; font-size: 16pt; font-weight: bold; border: 2px solid #000; display: inline-block; padding: 1mm 4mm; margin-bottom: 2mm;">REPRINT</h1>' : ''}
            <h2 style="margin: 0; font-size: 14pt; font-weight: bold; text-transform: uppercase;">J Plus Booksmart</h2>
            <div style="font-size: 9pt;">Puttalam Road, Hewenpelessa,</div>
            <div style="font-size: 9pt;">Nikaweratiya</div>
            <div style="font-size: 9pt;">Tel / WhatsApp 0768938940</div>
            <div style="margin-top: 2mm;">--------------------------------</div>
        </div>
        
        <div style="font-size: 10pt; margin-bottom: 3mm; font-family: 'Courier New', Courier, monospace;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 2mm;">
                <span>Date: <strong>${dateStr}</strong></span>
            </div>
            <div style="margin-bottom: 2mm;">
                Type: <strong>${log.type}</strong>
            </div>
            <div style="margin-bottom: 4mm;">
                Reason: <strong>${log.reason}</strong>
            </div>
            <div style="border-top: 1px solid #000; padding-top: 2mm; text-align: right; font-size: 14pt; font-weight: bold;">
                TOTAL: Rs. ${log.amount.toFixed(2)}
            </div>
        </div>

        <div style="text-align: center; font-size: 9pt; margin-top: 8mm; border-top: 1px dashed #000; padding-top: 3mm; font-family: 'Courier New', Courier, monospace;">
            Thank you! Come again!<br>
            *** J Plus Booksmart ***<br>
            Software by Iraasoft Solution
        </div>
        <div style="height: 10mm;"></div>
    `;
    elements.printArea.innerHTML = html;
}

window.editActivity = async function (id) {
    const log = await db.cashLogs.get(id);
    if (!log) return;

    let sale = null;
    if (log.refTable === 'sales' && log.refId) {
        sale = await db.sales.get(log.refId);
    } else if (log.reason.toLowerCase().includes("pos cash sale") || log.reason.toLowerCase().includes("credit advance")) {
        const logDate = new Date(log.date);
        const matchingSales = await db.sales.where('total').equals(log.amount).toArray();
        if (matchingSales.length > 0) {
            const logTime = logDate.getTime();
            matchingSales.sort((a, b) => Math.abs(new Date(a.date).getTime() - logTime) - Math.abs(new Date(b.date).getTime() - logTime));
            if (Math.abs(new Date(matchingSales[0].date).getTime() - logTime) < 3600000) sale = matchingSales[0];
        }
    } else if (false) { // Dummy to consume the original bracket if needed
        // Fallback for older logs: Try to find sale by date and amount
        const logDate = new Date(log.date);
        const startTime = new Date(logDate.getTime() - 2000).toISOString(); // 2 sec buffer
        const endTime = new Date(logDate.getTime() + 2000).toISOString();

        sale = await db.sales.where('date').between(startTime, endTime).and(s => Math.abs(s.total - log.amount) < 0.01).first();
    }

    if (sale) {
        renderEditSale(sale, log.id);
        return;
    }

    // Generic edit for others
    elements.editActivityId.value = log.id;
    elements.editActivityReason.value = log.reason;
    elements.editActivityAmount.value = log.amount;
    elements.editActivityModal.classList.remove('hidden');
    elements.editActivityReason.focus();
};

async function renderEditSale(sale, logId) {
    currentEditSaleId = sale.id;
    currentEditLogId = logId; // We need to store this to update the log
    editSaleItems = JSON.parse(JSON.stringify(sale.items)); // Deep copy

    elements.editSaleIdDisplay.innerText = `Sale #${sale.id} · ${new Date(sale.date).toLocaleTimeString('en-GB', { timeStyle: 'short' })}`;
    elements.editSaleDiscount.value = sale.discount || 0;

    updateEditSaleUI();
    elements.editSaleModal.classList.remove('hidden');
}

function updateEditSaleUI() {
    elements.editSaleItemsBody.innerHTML = editSaleItems.map((item, index) => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="p-4 pl-8">
                <div class="text-sm font-bold text-slate-800">${item.name}</div>
                <div class="text-[10px] text-slate-400 font-medium uppercase tracking-wider">${item.category || ''}</div>
            </td>
            <td class="p-4 text-center">
                <div class="flex items-center justify-center gap-2">
                    <button onclick="changeEditQty(${index}, -1)" class="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors">
                        <i data-lucide="minus" class="w-3 h-3"></i>
                    </button>
                    <span class="w-8 text-center text-sm font-black">${item.qty}</span>
                    <button onclick="changeEditQty(${index}, 1)" class="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors">
                        <i data-lucide="plus" class="w-3 h-3"></i>
                    </button>
                </div>
            </td>
            <td class="p-4 text-right">
                <input type="number" value="${item.price}" 
                    onchange="updateEditPrice(${index}, this.value)"
                    class="w-20 text-right bg-slate-50 border border-slate-200 rounded-lg p-1 text-sm font-bold focus:border-emerald-500 outline-none">
            </td>
            <td class="p-4 text-right">
                <span class="text-sm font-black text-slate-800">Rs. ${(item.price * item.qty).toFixed(2)}</span>
            </td>
            <td class="p-4 pr-8 text-center">
                <button onclick="removeEditItem(${index})" class="p-2 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </td>
        </tr>
    `).join('');

    const subtotal = editSaleItems.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const discount = parseFloat(elements.editSaleDiscount.value) || 0;
    const total = subtotal - discount;

    elements.editSaleSubtotal.innerText = `Rs. ${subtotal.toFixed(2)}`;
    elements.editSaleTotal.innerText = `Rs. ${total.toFixed(2)}`;

    lucide.createIcons();
}

window.changeEditQty = (index, delta) => {
    editSaleItems[index].qty = Math.max(1, editSaleItems[index].qty + delta);
    updateEditSaleUI();
};

window.updateEditPrice = (index, value) => {
    editSaleItems[index].price = parseFloat(value) || 0;
    updateEditSaleUI();
};

window.removeEditItem = (index) => {
    if (editSaleItems.length <= 1) return alert("Bills must have at least one item.");
    editSaleItems.splice(index, 1);
    updateEditSaleUI();
};

// Event listener for discount change in edit modal
document.getElementById('edit-sale-discount').addEventListener('input', updateEditSaleUI);

async function saveEditedSale(shouldPrint = false) {
    if (!currentEditSaleId || !currentEditLogId) return;

    try {
        const subtotal = editSaleItems.reduce((sum, i) => sum + (i.price * i.qty), 0);
        const discount = parseFloat(elements.editSaleDiscount.value) || 0;
        const total = subtotal - discount;

        // 1. Get original sale to compare for stock adjustment
        const originalSale = await db.sales.get(currentEditSaleId);
        if (!originalSale) return;

        // 2. Adjust stock levels
        for (let item of originalSale.items) {
            if (!item.isService) {
                const p = await db.products.get(item.id);
                if (p) await db.products.update(item.id, { stock: p.stock + item.qty });
            }
        }
        for (let item of editSaleItems) {
            if (!item.isService) {
                const p = await db.products.get(item.id);
                if (p) await db.products.update(item.id, { stock: Math.max(0, p.stock - item.qty) });
            }
        }

        // 3. Update Sale Record
        const updateData = {
            items: editSaleItems,
            total: total,
            discount: discount
        };
        await db.sales.update(currentEditSaleId, updateData);

        // 4. Update Cash Log
        await db.cashLogs.update(currentEditLogId, {
            amount: total,
            reason: `POS Cash Sale (Edited)`,
            isEdited: true
        });

        // Also mark the sale itself
        await db.sales.update(currentEditSaleId, { isEdited: true });

        // 5. Print if requested
        if (shouldPrint) {
            generateReceiptDOM(editSaleItems, subtotal, discount, total, {
                paymentType: originalSale.paymentType,
                customerName: originalSale.customerName || '',
                customerMobile: originalSale.customerMobile || '',
                advancePayment: originalSale.advancePayment
            });
            document.body.classList.add('receipt-mode');
            window.print();
            document.body.classList.remove('receipt-mode');
        }

        elements.editSaleModal.classList.add('hidden');
        renderDashboard();
        if (document.querySelector('.tab-pane:not(.hidden)').id === 'tab-recent-activity') renderRecentActivityTab();
        alert("Sale updated successfully!");

    } catch (err) {
        console.error(err);
        alert("Error updating sale!");
    }
}

elements.btnSaveEditSale.addEventListener('click', () => saveEditedSale(false));
elements.btnSavePrintSale.addEventListener('click', () => saveEditedSale(true));

window.deleteActivity = async function (id) {
    const confirmed = await showConfirm("Delete Activity?", "Are you sure you want to delete this activity log? This will NOT delete the actual sale or expense record.");
    if (!confirmed) return;

    try {
        const log = await db.cashLogs.get(id);
        if (log) {
            await logAuditAction("DELETE_ACTIVITY", `Deleted Activity #${id} (${log.type} - Rs. ${log.amount}: ${log.reason})`);
        }
        await db.cashLogs.delete(id);
        // Sync deletion to cloud
        if (typeof syncDelete === 'function') await syncDelete('cashLogs', id);

        renderDashboard();
        if (document.querySelector('.tab-pane:not(.hidden)').id === 'tab-recent-activity') renderRecentActivityTab();
    } catch (err) {
        console.error(err);
        alert("Failed to delete activity.");
    }
}

async function renderDashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allSales = await db.sales.toArray();
    const todaySales = allSales.filter(s => new Date(s.date) >= today);
    const totalSalesAmount = todaySales.reduce((sum, s) => sum + s.total, 0);

    const allLogs = await db.cashLogs.toArray();
    const todayLogs = allLogs.filter(l => new Date(l.date) >= today);

    let cashIn = 0;
    let cashOut = 0;

    todayLogs.forEach(l => {
        if (l.type === 'CASH_IN') cashIn += l.amount;
        if (l.type === 'CASH_OUT') cashOut += l.amount;
    });

    const netCash = cashIn - cashOut;

    // Expenses logic
    const allExpenses = await db.expenses.toArray();
    const todayExpenses = allExpenses.filter(e => new Date(e.date) >= today);
    const totalExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalSalesAmount - totalExpenses;

    elements.dashTodaySales.innerText = `Rs. ${totalSalesAmount.toFixed(2)}`;
    elements.dashExpenses.innerText = `Rs. ${totalExpenses.toFixed(2)}`;
    elements.dashCashIn.innerText = `Rs. ${cashIn.toFixed(2)}`;
    elements.dashCashOut.innerText = `Rs. ${cashOut.toFixed(2)}`;
    elements.dashDrawerCash.innerText = `Rs. ${netCash.toFixed(2)}`;
    elements.dashNetProfit.innerText = `Rs. ${netProfit.toFixed(2)}`;

    // Recent Activity rendering removed from dashboard and moved to its own tab.
}

// ---------------- RECENT ACTIVITY TAB LOGIC ---------------- //
window.renderRecentActivityTab = async function () {
    const allLogs = await db.cashLogs.toArray();
    const sortedLogs = allLogs.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (!elements.recentActivityList) return;

    if (sortedLogs.length === 0) {
        elements.recentActivityList.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20 text-slate-400 font-medium text-sm gap-4 border border-dashed border-slate-200 rounded-3xl h-full">
                <i data-lucide="clipboard-list" class="w-12 h-12 opacity-30"></i>
                No activity history found.
            </div>`;
    } else {
        elements.recentActivityList.innerHTML = sortedLogs.map(l => {
            const dateObj = new Date(l.date);
            const isSale = l.refTable === 'sales';
            const billText = isSale && l.refId ? `&nbsp; <span class="text-[10px] font-black tracking-widest bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md ml-2 border border-slate-200">BILL #${l.refId}</span>` : '';

            return `
            <div class="flex justify-between items-center py-4 border-b border-slate-100 last:border-0 group hover:bg-slate-50 px-4 rounded-2xl transition-all mb-2">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl ${l.type === 'CASH_IN' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'} flex items-center justify-center shadow-inner">
                        <i data-lucide="${l.type === 'CASH_IN' ? 'trending-up' : 'trending-down'}" class="w-5 h-5"></i>
                    </div>
                    <div>
                         <p class="font-bold text-slate-800 text-base flex items-center">${l.reason}${billText}</p>
                         <p class="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            ${dateObj.toLocaleDateString()} &bull; ${dateObj.toLocaleTimeString('en-GB', { timeStyle: 'short' })}
                            ${l.performedBy ? ` &bull; <span class="text-indigo-500">by ${l.performedBy}</span>` : ''}
                         </p>
                    </div>
                </div>
                <div class="flex items-center gap-6">
                    <div class="text-right">
                        <p class="font-black ${l.type === 'CASH_IN' ? 'text-emerald-600' : 'text-rose-500'} text-lg tracking-tight">
                             ${l.type === 'CASH_IN' ? '+' : '-'} Rs. ${l.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <!-- Action Buttons -->
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-4 border-l border-slate-200">
                        <button onclick="reprintActivity(${l.id})" class="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100" title="Reprint Receipt">
                            <i data-lucide="printer" class="w-5 h-5"></i>
                        </button>
                        <button onclick="editActivity(${l.id})" class="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-100" title="Edit Log">
                            <i data-lucide="edit-3" class="w-5 h-5"></i>
                        </button>
                        ${currentUser.role === 'owner' ? `
                        <button onclick="deleteActivity(${l.id})" class="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100" title="Delete Log">
                            <i data-lucide="trash-2" class="w-5 h-5"></i>
                        </button>` : ''}
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }
    lucide.createIcons();
}

// ---------------- EXPENSE TRACKER LOGIC ---------------- //
function setupExpenseListeners() {
    elements.expenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = elements.expenseId.value;
        const category = elements.expenseCategory.value;
        const description = elements.expenseDesc.value.trim();
        const amount = parseFloat(elements.expenseAmount.value);
        if (!amount || amount <= 0 || !description) return;

        if (id) {
            // Update mode
            const expId = parseInt(id);
            await db.expenses.update(expId, { category, description, amount });

            // Update corresponding cash log if it exists
            const logs = await db.cashLogs.where('refTable').equals('expenses').and(l => l.refId === expId).toArray();
            if (logs.length > 0) {
                await db.cashLogs.update(logs[0].id, {
                    amount: amount,
                    reason: `Expense: ${category} - ${description}`,
                    isEdited: true
                });
            }

            await logAuditAction("EDIT_EXPENSE", `Edited expense #${expId}. New Category: ${category}, Amount: ${amount}`);
            cancelExpenseEdit();
        } else {
            // Create mode
            const expId = await db.expenses.add({
                category,
                description,
                amount,
                date: new Date().toISOString()
            });

            const useDrawer = elements.expenseUseDrawer.checked;
            if (useDrawer) {
                await db.cashLogs.add({
                    type: 'CASH_OUT',
                    amount: amount,
                    reason: `Expense: ${category} - ${description}`,
                    date: new Date().toISOString(),
                    refId: expId,
                    refTable: 'expenses',
                    performedBy: currentUser.displayName
                });
            }
            elements.expenseForm.reset();
        }

        renderExpenses();
        if (document.querySelector('.tab-pane:not(.hidden)').id === 'tab-dashboard') renderDashboard();
    });
}

window.editExpense = async function (id) {
    const e = await db.expenses.get(id);
    if (!e) return;

    elements.expenseId.value = e.id;
    elements.expenseCategory.value = e.category;
    elements.expenseDesc.value = e.description;
    elements.expenseAmount.value = e.amount;

    elements.expenseSaveActions.classList.add('hidden');
    elements.expenseEditActions.classList.remove('hidden');

    // Smooth scroll to form
    elements.expenseForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    elements.expenseDesc.focus();
};

window.cancelExpenseEdit = function () {
    elements.expenseForm.reset();
    elements.expenseId.value = '';
    elements.expenseSaveActions.classList.remove('hidden');
    elements.expenseEditActions.classList.add('hidden');
};

window.deleteExpense = async function (id) {
    const confirmed = await showConfirm("Delete Expense?", "Are you sure you want to delete this expense? This will also remove it from cash flow records.");
    if (!confirmed) return;

    try {
        const exp = await db.expenses.get(id);
        if (exp) {
            await logAuditAction("DELETE_EXPENSE", `Deleted expense '${exp.description}' (${exp.category}) - Rs. ${exp.amount}`);
        }

        // Remove from expenses
        await db.expenses.delete(id);
        if (typeof syncDelete === 'function') await syncDelete('expenses', id);

        // Remove from cash logs
        const logs = await db.cashLogs.where('refTable').equals('expenses').and(l => l.refId === id).toArray();
        for (const log of logs) {
            await db.cashLogs.delete(log.id);
            if (typeof syncDelete === 'function') await syncDelete('cashLogs', log.id);
        }

        renderExpenses();
        if (document.querySelector('.tab-pane:not(.hidden)').id === 'tab-dashboard') renderDashboard();
    } catch (err) {
        console.error(err);
        alert("Failed to delete expense.");
    }
};

async function renderExpenses() {
    const expenses = await db.expenses.reverse().toArray();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expenses.length === 0) {
        elements.expensesTableBody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500">No expenses recorded yet.</td></tr>`;
        return;
    }

    elements.expensesTableBody.innerHTML = expenses.map(e => `
        <tr class="hover:bg-slate-50 transition-colors group">
            <td class="p-4 pl-8">
                <div class="text-sm font-bold text-slate-800">${new Date(e.date).toLocaleDateString('en-GB')}</div>
                <div class="text-[10px] text-slate-400 font-medium uppercase tracking-wider">${new Date(e.date).toLocaleTimeString('en-GB', { timeStyle: 'short' })}</div>
            </td>
            <td class="p-4">
                <span class="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm shadow-rose-100/50">${e.category}</span>
            </td>
            <td class="p-4">
                <div class="text-sm font-semibold text-slate-600">${e.description}</div>
            </td>
            <td class="p-4 text-right">
                <div class="font-black text-rose-500 text-lg">Rs. ${e.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </td>
            <td class="p-4 pr-8 text-center">
                <div class="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="p-2 bg-white border border-slate-100 rounded-xl text-indigo-600 hover:text-white hover:bg-indigo-600 hover:border-indigo-600 shadow-sm transition-all" 
                        onclick="editExpense(${e.id})">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                    </button>
                    ${currentUser.role === 'owner' ? `
                    <button class="p-2 bg-white border border-slate-100 rounded-xl text-red-500 hover:text-white hover:bg-red-500 hover:border-red-500 shadow-sm transition-all" 
                        onclick="deleteExpense(${e.id})">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>` : ''}
                </div>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

// ---------------- PRINT JOBS LOGIC ---------------- //
function setupPrintJobListeners() {
    elements.btnAddJob.addEventListener('click', () => {
        elements.jobForm.reset();
        elements.jobModalTitle.innerText = "New Print Job";
        elements.jobModal.classList.remove('hidden');
        setTimeout(() => elements.jobName.focus(), 100);
    });

    elements.jobForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = elements.jobName.value.trim();
        const mobile = elements.jobMobile.value.trim();
        const description = elements.jobDesc.value.trim();

        if (!name || !description) return;

        await db.printJobs.add({
            customerName: name,
            customerMobile: mobile,
            description: description,
            status: 'Pending',
            dateAdded: new Date().toISOString(),
            dateCompleted: null
        });

        elements.jobModal.classList.add('hidden');
        renderPrintJobs();
    });
}

async function renderPrintJobs() {
    const jobs = await db.printJobs.reverse().toArray();

    const pendingJobs = jobs.filter(j => j.status === 'Pending');
    const doneJobs = jobs.filter(j => j.status === 'Done');

    elements.jobsPendingCount.innerText = pendingJobs.length;
    elements.jobsDoneCount.innerText = doneJobs.length;

    if (pendingJobs.length === 0) {
        elements.jobsPendingList.innerHTML = `<p class="text-sm text-gray-500 text-center py-4">No pending jobs.</p>`;
    } else {
        elements.jobsPendingList.innerHTML = pendingJobs.map(j => `
            <div class="bg-white p-3 rounded-lg shadow-sm border-l-4 border-purple-500">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-bold text-gray-800">${j.customerName}</h4>
                    <span class="text-xs text-gray-500">${new Date(j.dateAdded).toLocaleString('en-GB', { timeStyle: 'short', dateStyle: 'short' })}</span>
                </div>
                <p class="text-xs text-gray-500 mb-2"><i data-lucide="phone" class="inline w-3 h-3"></i> ${j.customerMobile || 'No number'}</p>
                <p class="text-sm text-gray-700 mb-3">${j.description}</p>
                <div class="flex justify-end mt-2 pt-2 border-t border-gray-100">
                    <button onclick="markJobDone(${j.id})" class="text-xs px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded font-medium flex items-center gap-1"><i data-lucide="check" class="w-3 h-3"></i> Mark Done</button>
                </div>
            </div>
        `).join('');
    }

    if (doneJobs.length === 0) {
        elements.jobsDoneList.innerHTML = `<p class="text-sm text-gray-500 text-center py-4">No completed jobs yet.</p>`;
    } else {
        elements.jobsDoneList.innerHTML = doneJobs.map(j => `
            <div class="bg-white/60 p-3 rounded-lg border border-green-100">
                <div class="flex justify-between items-start">
                    <h4 class="font-medium text-gray-700 strike-through">${j.customerName}</h4>
                    <span class="text-xs text-gray-400 border border-green-200 bg-green-50 text-green-700 px-2 rounded-full">Done</span>
                </div>
                <p class="text-xs text-gray-500 mt-1 line-clamp-1">${j.description}</p>
                <p class="text-xs text-green-600 mt-2 flex justify-end">${new Date(j.dateCompleted).toLocaleString('en-GB', { timeStyle: 'short', dateStyle: 'short' })}</p>
            </div>
        `).join('');
    }

    lucide.createIcons();
}

window.markJobDone = async function (id) {
    const isDone = await showConfirm("Job Completed?", "Are you sure this print job is ready for history?");
    if (!isDone) return;

    const job = await db.printJobs.get(id);
    if (!job) return;

    await db.printJobs.update(id, {
        status: 'Done',
        dateCompleted: new Date().toISOString()
    });

    renderPrintJobs();

    if (job.customerMobile) {
        const sendWa = await showConfirm("Send WhatsApp?", `Would you like to notify ${job.customerName} via WhatsApp?`);
        if (sendWa) {
            let cleanMobile = job.customerMobile.replace(/[^0-9]/g, '');
            if (cleanMobile.startsWith('0')) {
                cleanMobile = '94' + cleanMobile.substring(1);
            }
            const message = `*J Plus Advertising*\nPuttalam Road, Hewenpelessa, Nikaweratiya\nTel / WhatsApp 0768938940\n----------------------------\n*Order Ready for Pickup!*\n----------------------------\n*Hello ${job.customerName},*\n\nYour printing request (${job.description}) is now completed and ready for collection at J Plus Booksmart.\n\nFB Online Store: web.facebook.com/Jplusonline.lk\nThank you! Come again.\n\n_Software by Iraasoft Solution_`;
            const whatsappUrl = `https://wa.me/${cleanMobile}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
        }
    }
}

// ---------------- FEATURE PACK 3: Supplier, Hold Bills, Print Calc ---------------- //
function setupFeaturePack3Listeners() {


    // Hold Bill Feature
    elements.btnHoldBill.addEventListener('click', () => {
        if (cart.length === 0) return alert("Cart is empty.");
        elements.holdRefName.value = '';
        elements.holdPromptModal.classList.remove('hidden');
    });

    elements.btnConfirmHold.addEventListener('click', async () => {
        const refName = elements.holdRefName.value.trim();
        if (!refName) return alert("Please enter a reference name to hold the bill.");

        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const discount = parseFloat(elements.cartDiscount.value) || 0;
        const total = subtotal - discount;

        await db.heldBills.add({
            date: new Date().toISOString(),
            name: refName,
            itemsData: JSON.parse(JSON.stringify(cart)),
            total: total
        });

        elements.holdPromptModal.classList.add('hidden');
        clearCart();
        updateHeldBillsCount();
    });

    elements.btnShowHeld.addEventListener('click', () => {
        renderHeldBills();
        elements.heldBillsModal.classList.remove('hidden');
    });

    updateHeldBillsCount();

    // Supplier UI specific setup
    elements.btnAddSupplier.addEventListener('click', () => {
        elements.supplierForm.reset();
        elements.supplierId.value = '';
        elements.supplierBalanceLabel.innerText = "Initial Balance Due (Rs.)";
        elements.supplierInitBalanceDiv.classList.remove('hidden');
        elements.supplierFormTitle.innerText = "Add New Supplier";
        elements.supplierFormContainer.classList.remove('hidden');
    });

    elements.btnCancelSupplier.addEventListener('click', () => {
        elements.supplierFormContainer.classList.add('hidden');
    });

    elements.supplierForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = elements.supplierId.value;
        const name = elements.supplierName.value.trim();
        const contact = elements.supplierContact.value.trim();
        const currentBalance = parseFloat(elements.supplierInitialDue.value) || 0;

        if (id) {
            await db.suppliers.update(parseInt(id), { name, contact, totalDue: currentBalance });
        } else {
            const initialDue = parseFloat(elements.supplierInitialDue.value) || 0;
            const newId = await db.suppliers.add({ name, contact, totalDue: initialDue });

            if (initialDue > 0) {
                await db.supplierTransactions.add({
                    supplierId: newId,
                    date: new Date().toISOString(),
                    type: 'INITIAL_BALANCE',
                    amount: initialDue,
                    description: 'Initial Balance Setup'
                });
            }
        }

        elements.supplierFormContainer.classList.add('hidden');
        renderSuppliers();
    });
}

// Held bills UI helpers
async function updateHeldBillsCount() {
    const count = await db.heldBills.count();
    elements.heldCount.innerText = count;
}

async function renderHeldBills() {
    const held = await db.heldBills.reverse().toArray();

    if (held.length === 0) {
        elements.heldBillsList.innerHTML = `<tr><td colspan="3" class="text-center p-4 text-gray-500">No held bills at the moment.</td></tr>`;
        return;
    }

    elements.heldBillsList.innerHTML = held.map(h => `
        <tr class="hover:bg-gray-50">
            <td class="p-3">
                <p class="font-bold text-gray-800">${h.name}</p>
                <p class="text-xs text-gray-500">${new Date(h.date).toLocaleTimeString()}</p>
            </td>
            <td class="p-3 text-right font-medium text-blue-600">Rs. ${h.total.toFixed(2)}</td>
            <td class="p-3 text-center">
                <button onclick="restoreHeldBill(${h.id})" class="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded text-xs font-bold mr-1">Restore</button>
                ${currentUser.role === 'owner' ? `
                <button onclick="deleteHeldBill(${h.id})" class="text-red-500 hover:text-red-700 p-1"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                ` : ''}
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

window.restoreHeldBill = async function (id) {
    const bill = await db.heldBills.get(id);
    if (!bill) return;

    if (cart.length > 0) {
        const confirmed = await showConfirm("Overwrite Cart?", "You currently have items in the cart. This will overwrite them. Proceed?");
        if (!confirmed) return;
    }

    cart = JSON.parse(JSON.stringify(bill.itemsData));
    updateCartUI();

    await db.heldBills.delete(id);
    updateHeldBillsCount();
    elements.heldBillsModal.classList.add('hidden');
}

window.deleteHeldBill = async function (id) {
    const confirmed = await showConfirm("Delete Stored Bill?", "Delete this stored bill permanently?");
    if (confirmed) {
        await db.heldBills.delete(id);
        if (typeof syncDelete === 'function') await syncDelete('heldBills', id);
        renderHeldBills();
        updateHeldBillsCount();
    }
}

function updateCartUI() {
    renderCart();
}

// Supplier Management
async function renderSuppliers() {
    const suppliers = await db.suppliers.toArray();

    if (suppliers.length === 0) {
        elements.suppliersList.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400 font-medium">No suppliers found. Click "Add Supplier" to get started.</td></tr>`;
        return;
    }

    elements.suppliersList.innerHTML = suppliers.map(s => `
        <tr class="hover:bg-slate-50 transition-colors group">
            <td class="p-4 pl-8">
                <div class="text-sm font-bold text-slate-800">${s.name}</div>
                <div class="text-[10px] text-slate-400 font-medium uppercase tracking-wider">ID: #${s.id}</div>
            </td>
            <td class="p-4 text-sm font-semibold text-slate-600">${s.contact || '-'}</td>
            <td class="p-4 text-right">
                <div class="font-black ${parseFloat(s.totalDue) > 0 ? 'text-orange-600' : 'text-emerald-600'} text-lg">Rs. ${parseFloat(s.totalDue).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                <div class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">${parseFloat(s.totalDue) > 0 ? 'Balance Due' : 'Paid in full'}</div>
            </td>
            <td class="p-4 pr-8 text-center">
                <div class="flex items-center justify-center gap-2">
                    <button class="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[10px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all shadow-sm" 
                        onclick="paySupplier(${s.id})">Pay</button>
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2 border-l border-slate-100">
                        <button class="p-2 bg-white border border-slate-100 rounded-xl text-indigo-600 hover:text-white hover:bg-indigo-600 hover:border-indigo-600 shadow-sm transition-all" 
                            onclick="editSupplier(${s.id})" title="Edit Supplier">
                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                        </button>
                        ${currentUser.role === 'owner' ? `
                        <button class="p-2 bg-white border border-slate-100 rounded-xl text-red-500 hover:text-white hover:bg-red-500 hover:border-red-500 shadow-sm transition-all" 
                            onclick="deleteSupplier(${s.id})" title="Delete Supplier">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>` : ''}
                    </div>
                </div>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

window.deleteSupplier = async function (id) {
    const confirmed = await showConfirm("Delete Supplier?", "Are you sure you want to delete this supplier? This will NOT delete transaction history but the supplier will be removed from this list.");
    if (!confirmed) return;

    try {
        const s = await db.suppliers.get(id);
        if (s) {
            await logAuditAction("DELETE_SUPPLIER", `Deleted supplier '${s.name}' (#${s.id})`);
        }
        await db.suppliers.delete(id);
        if (typeof syncDelete === 'function') await syncDelete('suppliers', id);
        renderSuppliers();
    } catch (err) {
        console.error(err);
        alert("Failed to delete supplier.");
    }
}

window.editSupplier = async function (id) {
    const supplier = await db.suppliers.get(id);
    if (!supplier) return;

    elements.supplierId.value = supplier.id;
    elements.supplierName.value = supplier.name;
    elements.supplierContact.value = supplier.contact;
    elements.supplierInitialDue.value = supplier.totalDue || 0;
    elements.supplierBalanceLabel.innerText = "Outstanding Balance (Rs.)";
    elements.supplierInitBalanceDiv.classList.remove('hidden');
    elements.supplierFormTitle.innerText = "Edit Supplier Details";
    elements.supplierFormContainer.classList.remove('hidden');

    elements.supplierName.focus();
}

window.paySupplier = async function (id) {
    const supplier = await db.suppliers.get(id);
    if (!supplier) return;

    elements.paySupplierId.value = supplier.id;
    elements.paySupplierNameDisplay.innerText = supplier.name;
    elements.paySupplierDueDisplay.innerText = `Due: Rs. ${parseFloat(supplier.totalDue).toFixed(2)}`;
    elements.paySupplierAmount.value = parseFloat(supplier.totalDue).toFixed(2);
    elements.paySupplierUseDrawer.checked = true;

    elements.supplierPaymentModal.classList.remove('hidden');
    setTimeout(() => elements.paySupplierAmount.focus(), 100);
}

// Setup Supplier Payment Listener
function setupSupplierPaymentListeners() {
    elements.btnConfirmSupplierPayment.addEventListener('click', async () => {
        const id = parseInt(elements.paySupplierId.value);
        const amount = parseFloat(elements.paySupplierAmount.value);
        const useDrawer = elements.paySupplierUseDrawer.checked;

        if (!amount || amount <= 0) return alert("Invalid amount");

        const supplier = await db.suppliers.get(id);
        if (!supplier) return;

        // Update Supplier Balance
        supplier.totalDue = parseFloat(supplier.totalDue) - amount;
        await db.suppliers.put(supplier);

        // Record Transaction
        await db.supplierTransactions.add({
            supplierId: supplier.id,
            date: new Date().toISOString(),
            type: 'PAYMENT',
            amount: amount,
            description: 'Payment given'
        });

        // Optionally record as Drawer CASH OUT
        if (useDrawer) {
            await db.cashLogs.add({
                type: 'CASH_OUT',
                amount: amount,
                reason: `Supplier Payment: ${supplier.name}`,
                date: new Date().toISOString(),
                performedBy: currentUser.displayName
            });
        }

        elements.supplierPaymentModal.classList.add('hidden');
        renderSuppliers();
        if (document.querySelector('.tab-pane:not(.hidden)').id === 'tab-dashboard') renderDashboard();

        showNotification(`Payment of Rs. ${amount.toFixed(2)} recorded to ${supplier.name}.`);
    });
}

// PREMIUM TOAST NOTIFICATION SYSTEM
window.showNotification = function (message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `min-w-[320px] p-5 rounded-2xl bg-white border border-slate-100 flex items-center gap-4 toast-shadow toast-in pointer-events-auto cursor-pointer mb-2`;

    const iconColor = type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600';
    const icon = type === 'success' ? 'check-circle' : 'alert-circle';

    toast.innerHTML = `
        <div class="w-12 h-12 rounded-xl ${iconColor} flex items-center justify-center flex-shrink-0">
            <i data-lucide="${icon}" class="w-6 h-6"></i>
        </div>
        <div class="flex-1">
            <h4 class="text-sm font-black text-slate-800 tracking-tight">${type.charAt(0).toUpperCase() + type.slice(1)}</h4>
            <p class="text-xs text-slate-400 font-bold">${message}</p>
        </div>
    `;

    container.appendChild(toast);
    lucide.createIcons();

    const removeToast = () => {
        toast.classList.replace('toast-in', 'toast-out');
        setTimeout(() => toast.remove(), 400);
    };

    // Auto-remove
    const timeout = setTimeout(removeToast, 5000);

    // Manual click to dismiss
    toast.addEventListener('click', () => {
        clearTimeout(timeout);
        removeToast();
    });
};

// PREMIUM CONFIRMATION MODAL SYSTEM
window.showConfirm = function (title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirm-modal-title');
        const msgEl = document.getElementById('confirm-modal-message');
        const btnYes = document.getElementById('btn-confirm-yes');
        const btnNo = document.getElementById('btn-confirm-no');

        if (!modal) return resolve(confirm(message)); // Fallback

        titleEl.innerText = title;
        msgEl.innerText = message;
        modal.classList.remove('hidden');

        const handleYes = () => {
            modal.classList.add('hidden');
            cleanup();
            resolve(true);
        };

        const handleNo = () => {
            modal.classList.add('hidden');
            cleanup();
            resolve(false);
        };

        const cleanup = () => {
            btnYes.removeEventListener('click', handleYes);
            btnNo.removeEventListener('click', handleNo);
        };

        btnYes.addEventListener('click', handleYes);
        btnNo.addEventListener('click', handleNo);
    });
};
// ---------------- BACKUP & RESTORE SYSTEM ---------------- //
window.exportDatabase = async function () {
    try {
        showNotification('Preparing backup...', 'success');
        const backupData = {
            version: 1,
            timestamp: new Date().toISOString(),
            tables: {},
            users: localStorage.getItem('jp_users') ? JSON.parse(localStorage.getItem('jp_users')) : null
        };

        // uses global tableNames from db.js

        for (const table of tableNames) {
            backupData.tables[table] = await db[table].toArray();
        }

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `JP_Backup_${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification('Backup downloaded successfully!');
    } catch (err) {
        console.error('Backup Error:', err);
        showNotification('Failed to create backup.', 'error');
    }
};

window.importDatabase = async function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const confirmed = await showConfirm(
        "Restore Data?",
        "This will DELETE all current sales, products, and settings and replace them with the backup. Are you absolutely sure?"
    );

    if (!confirmed) {
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.tables) throw new Error("Invalid backup file format.");

            showNotification('Restoring data...', 'success');

            // Clear and Load Tables
            for (const table in data.tables) {
                await db[table].clear();
                if (data.tables[table].length > 0) {
                    await db[table].bulkAdd(data.tables[table]);
                }
            }

            // Restore Users
            if (data.users) {
                localStorage.setItem('jp_users', JSON.stringify(data.users));
            }

            showNotification('Data restored! Reloading application...');
            setTimeout(() => window.location.reload(), 2000);
        } catch (err) {
            console.error('Restore Error:', err);
            showNotification('Failed to restore data. Invalid file.', 'error');
        }
    };
    reader.readAsText(file);
};

// ---------------- BARCODE GENERATOR LOGIC ---------------- //
function setupBarcodeListeners() {
    elements.btnGenerateBarcode.addEventListener('click', () => {
        const value = elements.barcodeInput.value.trim();
        const name = elements.barcodeNameInput.value.trim();

        if (!value) return alert("Please enter a barcode value.");

        try {
            JsBarcode("#barcode-svg", value, {
                format: "CODE128",
                width: 2,
                height: 60,
                displayValue: true
            });

            elements.previewProductName.innerText = name || "Product Name";
            elements.barcodeStickerPreview.classList.remove('hidden');
            elements.barcodeEmptyState.classList.add('hidden');
        } catch (err) {
            console.error(err);
            alert("Failed to generate barcode. Ensure value is valid for CODE128.");
        }
    });

    elements.btnPrintBarcode.addEventListener('click', () => {
        const value = elements.barcodeInput.value.trim();
        const name = elements.barcodeNameInput.value.trim();

        if (!value) return alert("Please generate a barcode first.");

        // Add sticker-mode class for special print styling
        document.body.classList.add('sticker-mode');

        let html = `
            <div class="sticker-label">
                <div style="font-size: 10pt; font-weight: bold; text-align: center; margin-bottom: 2mm; overflow: hidden; white-space: nowrap; width: 100%; text-overflow: ellipsis;">
                    ${name || 'Product'}
                </div>
                <div id="print-barcode-container" style="display: flex; justify-content: center;">
                    <svg id="barcode-print-svg"></svg>
                </div>
                <div style="font-size: 7pt; text-align: center; margin-top: 2mm; color: #666;">
                    J Plus Booksmart
                </div>
            </div>
        `;

        elements.printArea.innerHTML = html;

        // Generate barcode into the new print SVG
        JsBarcode("#barcode-print-svg", value, {
            format: "CODE128",
            width: 2,
            height: 50,
            displayValue: true
        });

        window.print();

        // Cleanup
        document.body.classList.remove('sticker-mode');
    });
}

// ---------------- DASHBOARD CLOCK & REPORTS ---------------- //

// ---------------- KEYBOARD NAVIGATION SYSTEM ---------------- //
window.keyboardNavigator = {
    currentIndex: -1,
    containerId: null,
    itemSelector: null,
    columns: 1, // Default for lists

    init(containerId, itemSelector, columns = 1) {
        this.reset();
        this.containerId = containerId;
        this.itemSelector = itemSelector;
        this.columns = columns;
    },

    reset() {
        const prev = document.querySelector('.kb-selected');
        if (prev) prev.classList.remove('kb-selected');
        this.currentIndex = -1;
    },

    navigate(direction) {
        const container = document.getElementById(this.containerId);
        if (!container) return { boundary: null };
        const items = Array.from(container.querySelectorAll(this.itemSelector)).filter(el => el.offsetParent !== null);
        if (items.length === 0) return { boundary: direction };

        let newIndex = this.currentIndex;
        let boundaryHit = null;

        if (direction === 'ArrowDown') {
            if (newIndex === -1) newIndex = 0;
            else {
                if (newIndex + this.columns >= items.length) boundaryHit = direction;
                newIndex = Math.min(items.length - 1, newIndex + this.columns);
            }
        } else if (direction === 'ArrowUp') {
            if (newIndex === -1) newIndex = 0;
            else {
                if (newIndex - this.columns < 0) boundaryHit = direction;
                newIndex = Math.max(0, newIndex - this.columns);
            }
        } else if (direction === 'ArrowRight' && this.columns > 1) {
            if (newIndex === -1) newIndex = 0;
            else {
                if ((newIndex + 1) % this.columns === 0 || newIndex + 1 >= items.length) boundaryHit = direction;
                newIndex = Math.min(items.length - 1, newIndex + 1);
            }
        } else if (direction === 'ArrowLeft' && this.columns > 1) {
            if (newIndex === -1) newIndex = 0;
            else {
                if (newIndex % this.columns === 0) boundaryHit = direction;
                newIndex = Math.max(0, newIndex - 1);
            }
        } else if (direction === 'ArrowLeft' && this.columns === 1) {
            // Special case for cart (single column) jumping back
            boundaryHit = direction;
        }

        this.updateSelection(items, newIndex);
        return { boundary: boundaryHit };
    },

    updateSelection(items, index) {
        items.forEach(el => el.classList.remove('kb-selected'));
        if (items[index]) {
            items[index].classList.add('kb-selected');
            items[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            this.currentIndex = index;
        }
    },

    confirm() {
        const selected = document.querySelector('.kb-selected');
        if (selected) {
            selected.click();
        }
    }
};

window.updateDashboardClock = function () {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[now.getDay()];
    const dateStr = now.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    const clockHtml = `<span class="text-slate-500">${dayName}, ${dateStr}</span> • <span class="text-indigo-600 font-bold">${timeStr}</span>`;

    // Try fetching if missing (due to dynamic tab loading)
    if (!elements.dashClock) elements.dashClock = document.getElementById('dash-clock');
    if (!elements.posClock) elements.posClock = document.getElementById('pos-clock');

    if (elements.dashClock) elements.dashClock.innerHTML = clockHtml;
    if (elements.posClock) elements.posClock.innerHTML = clockHtml;
};

window.generateReport = async function (type) {
    const fromDateStr = elements.reportFromDate.value;
    const toDateStr = elements.reportToDate.value;

    if (!fromDateStr || !toDateStr) return alert("Please select a date range.");

    // Filter range (inclusive)
    const startTime = fromDateStr + "T00:00:00.000Z";
    const endTime = toDateStr + "T23:59:59.999Z";

    let data = [];
    let title = "";

    try {
        if (type === 'sales') {
            title = "Sales History Report";
            data = await db.sales.where('date').between(startTime, endTime, true, true).toArray();
        } else if (type === 'expenses') {
            title = "Expenses History Report";
            data = await db.expenses.where('date').between(startTime, endTime, true, true).toArray();
        } else if (type === 'audit') {
            title = "Audit Logs (Security Trail)";
            data = await db.auditLogs.where('date').between(startTime, endTime, true, true).toArray();
        }

        if (data.length === 0) {
            alert("No data found for the selected date range.");
            return;
        }

        if (type === 'audit') {
            renderAuditReportToPrint(title, data, fromDateStr, toDateStr);
        } else {
            renderReportToPrint(title, data, fromDateStr, toDateStr, type);
        }

    } catch (err) {
        console.error("Report Generation Error:", err);
        alert("Failed to generate report.");
    }
};

function renderReportToPrint(title, data, from, to, type) {
    let html = `
        <div style="font-family: 'Inter', sans-serif; padding: 20px; color: #333; width: 100%; min-height: 100vh; background: #fff; display: flex; flex-direction: column; align-items: center;">
            <div style="width: 100%; max-width: 800px;">
                <!-- Header Section -->
                <div style="margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 15px; text-align: center;">
                    <h1 style="margin: 0; font-size: 22px; color: #111; font-weight: 700; line-height: 1.2; letter-spacing: -0.5px; text-transform: uppercase;">J PLUS BOOKSMART</h1>
                    <p style="margin: 8px 0; font-size: 14px; color: #555; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${title}</p>
                    <div style="display: inline-block; background: #f8fafc; border: 1px solid #cbd5e1; padding: 4px 12px; border-radius: 6px;">
                        <p style="margin: 0; font-size: 11px; font-weight: 500; color: #475569; white-space: nowrap;">Period: ${from} to ${to}</p>
                    </div>
                </div>

                <!-- Table Section -->
                <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 20px; font-size: 11px; text-align: left;">
                    <thead>
                        <tr>
                            <th style="padding: 8px 10px; font-weight: 600; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0;">Date</th>
                            <th style="padding: 8px 10px; font-weight: 600; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0;">Description</th>
                            <th style="padding: 8px 10px; text-align: right; font-weight: 600; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    let totalAmount = 0;

    data.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(item => {
        const date = new Date(item.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
        let desc = "";
        let amount = 0;

        if (type === 'sales' || item.reportType === 'Sale') {
            desc = `Bill #${item.id || 'N/A'}`;
            amount = item.total || 0;
        } else {
            desc = item.description || item.category || "Expense";
            amount = item.amount || 0;
        }

        totalAmount += amount;

        html += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 10px; color: #334155;">${date}</td>
                <td style="padding: 8px 10px; font-weight: 500; color: #0f172a;">${desc}</td>
                <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: #0f172a;">Rs. ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
        `;
    });

    html += `
                    </tbody>
                </table>

                <!-- Grand Total Section -->
                <div style="margin-bottom: 30px; display: flex; justify-content: flex-end;">
                    <table style="width: auto; min-width: 250px; padding: 12px 15px;">
                        <tr>
                            <td style="padding: 0 15px 0 0; font-weight: 600; font-size: 14px; color: #475569; text-transform: uppercase; text-align: left;">Grand Total</td>
                            <td style="padding: 0; font-weight: 800; font-size: 18px; color: #0f172a; text-align: right;">Rs. ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                    </table>
                </div>

                <!-- Footer Section -->
                <div style="margin-top: 40px; font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="text-align: left; vertical-align: bottom; width: 50%;">
                                <p style="margin: 2px 0;">Generated on: ${new Date().toLocaleString()}</p>
                                <p style="margin: 2px 0;">Printed By: ${currentUser ? currentUser.displayName : 'Admin'}</p>
                            </td>
                            <td style="text-align: right; vertical-align: bottom; width: 50%;">
                                <p style="font-weight: 600; color: #475569; font-size: 11px; margin: 0; text-transform: uppercase;">System By Iraasoft Solution</p>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Print
    const printArea = elements.printArea;
    printArea.innerHTML = html;
    document.body.classList.add('report-mode');
    window.print();
}

function renderAuditReportToPrint(title, data, from, to) {
    let html = `
        <div style="font-family: 'Inter', sans-serif; padding: 20px; color: #334155; width: 100%; min-height: 100vh; background: #fff; display: flex; flex-direction: column; align-items: center;">
            <div style="width: 100%; max-width: 900px;">
                <!-- Header Section -->
                <div style="margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px; color: #0f172a; font-weight: 700; line-height: 1.1; letter-spacing: -0.5px; text-transform: uppercase;">J PLUS BOOKSMART</h1>
                    <p style="margin: 8px 0; font-size: 13px; color: #475569; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">${title}</p>
                    <div style="display: inline-block; background: #f8fafc; border: 1px solid #cbd5e1; padding: 4px 12px; border-radius: 6px;">
                        <p style="margin: 0; font-size: 11px; font-weight: 500; color: #334155; white-space: nowrap;">Period: ${from} to ${to}</p>
                    </div>
                </div>

                <!-- Table Section -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 2px solid #cbd5e1; color: #475569;">
                            <th style="padding: 8px 10px; font-weight: 600; text-transform: uppercase;">Date & Time</th>
                            <th style="padding: 8px 10px; font-weight: 600; text-transform: uppercase;">User</th>
                            <th style="padding: 8px 10px; font-weight: 600; text-transform: uppercase;">Action</th>
                            <th style="padding: 8px 10px; font-weight: 600; text-transform: uppercase;">Details</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    data.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(log => {
        const dateStr = new Date(log.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

        // Color code actions
        let actionColor = "#0f172a";
        if (log.action.includes('DELETE')) actionColor = "#ef4444";
        if (log.action.includes('EDIT')) actionColor = "#f59e0b";
        if (log.action.includes('ADD')) actionColor = "#10b981";

        html += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 10px; color: #475569; white-space: nowrap;">${dateStr}</td>
                <td style="padding: 8px 10px; font-weight: 600; color: #334155;">${log.user}</td>
                <td style="padding: 8px 10px; font-weight: 700; color: ${actionColor}; font-size: 10px;">${log.action}</td>
                <td style="padding: 8px 10px; color: #0f172a;">${log.details}</td>
            </tr>
        `;
    });

    html += `
                    </tbody>
                </table>

                <!-- Footer Section -->
                <div style="margin-top: 40px; font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="text-align: left; vertical-align: bottom; width: 50%;">
                                <p style="margin: 2px 0;">Generated on: ${new Date().toLocaleString()}</p>
                                <p style="margin: 2px 0;">Printed By: ${currentUser ? currentUser.displayName : 'Admin'}</p>
                            </td>
                            <td style="text-align: right; vertical-align: bottom; width: 50%;">
                                <p style="font-weight: 600; color: #475569; font-size: 11px; margin: 0; text-transform: uppercase;">System By Iraasoft Solution</p>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Print
    const printArea = elements.printArea;
    printArea.innerHTML = html;
    document.body.classList.add('report-mode');
    window.print();
    document.body.classList.remove('report-mode');
}
// ---------------- CLOUD SYNC ENGINE (Firebase) ---------------- //
// This engine handles two-way real-time synchronization between Dexie (Local) and Firestore (Cloud)

window.lastPushTime = parseInt(localStorage.getItem('jp_last_push_time')) || 0;

async function startCloudSync() {
    console.log("Cloud Sync: Initializing...");

    // 1. Firebase Auth (Anonymous) - Required for many Firestore security rules
    try {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            await firebase.auth().signInAnonymously();
            console.log("Cloud Sync: Authenticated Anonymously.");
        }
    } catch (e) {
        console.error("Cloud Sync Auth Error:", e);
    }

    // 2. Ensure all existing data has lastUpdated (Migration)
    await ensureTimestamps();

    // 3. Add UI indicator
    const topBar = document.querySelector('header') || document.querySelector('main');
    if (topBar && !document.getElementById('cloud-sync-status')) {
        const syncStatusDiv = document.createElement('div');
        syncStatusDiv.id = 'cloud-sync-status';
        syncStatusDiv.className = 'fixed bottom-4 right-4 z-[100] flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md border border-slate-100 rounded-full shadow-xl text-[10px] font-black uppercase tracking-widest text-slate-400 opacity-60 hover:opacity-100 transition-all cursor-pointer';
        syncStatusDiv.title = 'Click to force sync';
        syncStatusDiv.onclick = () => pushLocalChanges();
        syncStatusDiv.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500" id="sync-dot"></span> <span id="sync-text">Cloud Sync: Connected</span>`;
        document.body.appendChild(syncStatusDiv);
    }

    // 4. Initial Pull
    await pullRemoteChanges();

    // 5. Periodic Push
    setInterval(pushLocalChanges, 15000);
    pushLocalChanges();

    console.log("Cloud Sync: Active.");
}

async function ensureTimestamps() {
    console.log("Cloud Sync: Checking data timestamps...");
    for (const table of tableNames) {
        try {
            const itemsToUpdate = await db[table].filter(item => !item.lastUpdated).toArray();
            if (itemsToUpdate.length > 0) {
                console.log(`Cloud Sync: Adding timestamps to ${itemsToUpdate.length} items in ${table}`);
                await Promise.all(itemsToUpdate.map(item =>
                    db[table].update(item.id, { lastUpdated: Date.now() })
                ));
            }
        } catch (e) {
            console.warn(`Failed migration for table ${table}:`, e);
        }
    }
}

async function updateSyncStatus(status, color = 'bg-amber-500') {
    const dot = document.getElementById('sync-dot');
    const text = document.getElementById('sync-text');
    if (!dot || !text) return;

    text.innerText = `Cloud Sync: ${status}`;
    dot.className = `w-2 h-2 rounded-full ${color} ${status === 'Syncing...' ? 'animate-pulse' : ''}`;
}

async function pushLocalChanges() {
    if (isCloudSyncing) return;
    isCloudSyncing = true;

    try {
        if (typeof firestore === 'undefined') return;
        if (!window.tableNames) return;

        const now = Date.now();
        let hasChanges = false;

        for (const table of window.tableNames) {
            // Find records modified since last push
            const changedItems = await db[table].where('lastUpdated').above(lastPushTime).toArray();

            if (changedItems.length > 0) {
                if (!hasChanges) {
                    hasChanges = true;
                    updateSyncStatus('Syncing...', 'bg-amber-500');
                }

                console.log(`Cloud Sync: Pushing ${changedItems.length} items from ${table}...`);

                for (const item of changedItems) {
                    if (!item.id) continue;
                    const docId = item.id.toString();

                    // Firestore cannot handle 'undefined'. We sanitize by converting to JSON and back.
                    const cleanItem = JSON.parse(JSON.stringify(item));

                    await firestore.collection(table).doc(docId).set(cleanItem, { merge: true });
                }
            }
        }

        if (hasChanges) {
            lastPushTime = now;
            localStorage.setItem('jp_last_push_time', lastPushTime.toString());
            updateSyncStatus('Connected', 'bg-emerald-500');
            console.log("Cloud Sync: Push completed successfully.");
        } else {
            // Even if no local changes, show connected if we reach here without error
            updateSyncStatus('Connected', 'bg-emerald-500');
        }
    } catch (err) {
        console.error("Cloud Sync Push Error Detail:", err);
        updateSyncStatus('Offline', 'bg-rose-500');

        // Provide friendly advice for common Firebase setup errors
        if (err.code === 'permission-denied') {
            showNotification("Cloud Sync: Permission Denied. Please check your Firebase Rules!", "error");
        } else if (err.code === 'unimplemented') {
            // Catch potential version mismatches
        }
    } finally {
        isCloudSyncing = false;
    }
}

async function pullRemoteChanges() {
    // We setup real-time listeners for all collections
    window.tableNames.forEach(table => {
        firestore.collection(table).onSnapshot(snapshot => {
            snapshot.docChanges().forEach(async (change) => {
                const data = change.doc.data();

                // Only apply if it's newer than what we have locally
                if (change.type === "added" || change.type === "modified") {
                    const localItem = await db[table].get(data.id);

                    if (!localItem || (data.lastUpdated > (localItem.lastUpdated || 0))) {
                        // Use put to upsert. Note: This will trigger the hooks, 
                        // but since we provide lastUpdated, the hook will preserve the cloud timestamp.
                        await db[table].put(data);

                        // Re-render UI if we are on the relevant tab
                        refreshUIForTable(table);
                    }
                }

                if (change.type === "removed") {
                    await db[table].delete(data.id);
                    refreshUIForTable(table);
                }
            });
        }, err => {
            console.error(`Firestore Listener Error (${table}):`, err);
        });
    });
}

/**
 * Sync deletion to Firestore
 * @param {string} table 
 * @param {any} id 
 */
async function syncDelete(table, id) {
    if (typeof firestore === 'undefined') return;
    try {
        const docId = id.toString();
        await firestore.collection(table).doc(docId).delete();
        console.log(`Cloud Sync: Deleted item ${docId} from ${table}`);
    } catch (err) {
        console.error(`Cloud Sync Deletion Error (${table}):`, err);
    }
}

function refreshUIForTable(table) {
    const activeTabId = document.querySelector('.tab-pane:not(.hidden)')?.id;

    switch (table) {
        case 'products':
            if (activeTabId === 'tab-pos') renderPOSProducts();
            if (activeTabId === 'tab-inventory') renderInventory();
            break;
        case 'sales':
        case 'cashLogs':
        case 'expenses':
            if (activeTabId === 'tab-dashboard') renderDashboard();
            if (activeTabId === 'tab-expenses') renderExpenses();
            if (activeTabId === 'tab-recent-activity') renderRecentActivityTab();
            break;
        case 'credits':
            if (activeTabId === 'tab-credits') renderCreditsList();
            break;
        case 'suppliers':
            if (activeTabId === 'tab-suppliers') renderSuppliers();
            break;
        case 'printJobs':
            if (activeTabId === 'tab-printjobs') renderPrintJobs();
            break;
    }
}
