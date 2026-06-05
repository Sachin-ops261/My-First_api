// DOM Element Targets
const userForm = document.getElementById('userForm');
const nameInput = document.getElementById('name');
const roleInput = document.getElementById('role');
const usersList = document.getElementById('usersList');

// Auth Form Targets
const authForm = document.getElementById('authForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const authTitle = document.getElementById('authTitle');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const sessionStatus = document.getElementById('sessionStatus');
const showLoginBtn = document.getElementById('showLoginBtn');
const showRegisterBtn = document.getElementById('showRegisterBtn');

// Local Global State Tracker
let authMode = 'login'; // can be 'login' or 'register'

// --- AUTHENTICATION INTERACTION MANAGEMENT ---

// Toggle Between Login Form Mode and Register Form Mode
showLoginBtn.addEventListener('click', () => {
    authMode = 'login';
    showLoginBtn.classList.add('active');
    showRegisterBtn.classList.remove('active');
    authTitle.innerText = "Secure System Login";
    authSubmitBtn.innerText = "Authenticate Credentials";
});

showRegisterBtn.addEventListener('click', () => {
    authMode = 'register';
    showRegisterBtn.classList.add('active');
    showLoginBtn.classList.remove('active');
    authTitle.innerText = "Register New Admin Pool";
    authSubmitBtn.innerText = "Generate Encrypted Account";
});

// Helper function to check if the stored token is mathematically expired
function isTokenExpired() {
    const token = localStorage.getItem('token');
    if (!token) return true; // No token means it's effectively expired/empty

    try {
        // A JWT token is split by periods: Header.Payload.Signature
        // We grab the middle section (index 1), decode the base64 string, and parse the JSON
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        
        // payload.exp is in seconds, Date.now() is in milliseconds
        const currentTime = Date.now() / 1000;
        return payload.exp < currentTime; 
    } catch (e) {
        return true; // If decoding fails, treat it as expired/broken
    }
}

// Master UI Sync: Checks token validity and aligns the whole screen layout automatically
function updateSessionUI() {
    const storedUser = localStorage.getItem('username');
    const tokenExpired = isTokenExpired();

    // Grab all trashcan buttons currently rendered on the screen
    const deleteButtons = document.querySelectorAll('.delete-btn');

    if (!tokenExpired) {
        // --- STATE A: USER IS AUTHENTICATED AND VALID ---
        sessionStatus.className = "session-box authenticated";
        sessionStatus.innerHTML = `🔓 Authenticated: ${storedUser} <button onclick="logout()" style="margin-left:10px; background:none; border:none; color:#f87171; cursor:pointer; text-decoration:underline;">Logout</button>`;
        
        // Instantly make all delete buttons visible
        deleteButtons.forEach(btn => btn.classList.remove('hidden'));
    } else {
        // --- STATE B: NO TOKEN OR TOKEN EXPIRED ---
        // If there was a token but it just expired, silently wipe it out of memory
        if (localStorage.getItem('token')) {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
        }

        sessionStatus.className = "session-box unauthenticated";
        sessionStatus.innerText = "🔒 System Status: Unauthenticated Session";
        
        // Instantly hide all delete buttons on the screen
        deleteButtons.forEach(btn => btn.classList.add('hidden'));
    }
}

// Clean and simplified logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    updateSessionUI();
}

// Handle Authentication Form Submit (Login & Register Engine)
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = usernameInput.value;
    const password = passwordInput.value;
    
    const targetUrl = authMode === 'login' ? '/auth/login' : '/auth/register';
    
    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            alert(data.error || "Authentication operation failed.");
            return;
        }
        
        alert(data.message);
        
        if (authMode === 'login') {
            localStorage.setItem('token', data.accessToken);
            localStorage.setItem('username', username);
            
            usernameInput.value = '';
            passwordInput.value = '';
            updateSessionUI();
        } else {
            showLoginBtn.click();
            passwordInput.value = '';
        }
        
    } catch (err) {
        console.error('Auth Loop Error:', err);
        alert('Could not establish contact with security servers.');
    }
});


// --- SYSTEM USER RECOGNITION DATABASE CRUD OPERATIONS ---

// 1. READ ALL USERS
async function fetchUsers() {
    try {
        const response = await fetch('/users');
        const users = await response.json();
        usersList.innerHTML = '';

        if (users.length === 0) {
            usersList.innerHTML = '<p class="loading">No records currently hosted.</p>';
            return;
        }

        users.forEach(user => {
            const userCard = document.createElement('div');
            userCard.className = 'user-item';
            userCard.innerHTML = `
                <div class="user-info">
                    <h4>${user.name}</h4>
                    <p>ID: ${user.id} • ${user.role}</p>
                </div>
                <button class="delete-btn hidden" onclick="deleteUser(${user.id})">🗑️</button>
            `;
            usersList.appendChild(userCard);
        });

        // Sync button visibilities right after rendering the fresh list
        updateSessionUI();
    } catch (err) {
        console.error('Error fetching profiles:', err);
        usersList.innerHTML = '<p class="loading" style="color: #ef4444;">Failed to sync data channels.</p>';
    }
}

// 2. CREATE A USER
userForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = userForm.querySelector('.btn');

    submitBtn.disabled = true;
    submitBtn.innerText = "Adding to Cloud...";
    submitBtn.style.opacity = "0.6";
    submitBtn.style.cursor = "not-allowed";

    const name = nameInput.value;
    const role = roleInput.value;

    try {
        const response = await fetch('/users/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, role })
        });

        if (response.ok) {
            nameInput.value = '';
            roleInput.value = '';
            await fetchUsers();
        }
    } catch (err) {
        console.error('Write Error:', err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Add to Database";
        submitBtn.style.opacity = "1";
        submitBtn.style.cursor = "pointer";
    }
});

// 3. DELETE A USER (CLEAN & SECURED VIA JWT HEADERS)
async function deleteUser(id) {
    if (!confirm("Are you sure you want to permanently delete this user?")) return;

    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`/users/delete/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            alert(`⚠️ Action Blocked: ${data.error}`);
            return;
        }

        fetchUsers();
    } catch (err) {
        console.error('Deletion Exception:', err);
    }
}

// --- INITIALIZER & AUTOMATED POLLING ---
fetchUsers();
updateSessionUI();

// 🔄 THE POLLING ENGINE: Evaluates token expiration and flips visibility every 1 second!
setInterval(() => {
    updateSessionUI();
}, 1000);