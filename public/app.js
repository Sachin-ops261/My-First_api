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

// Update UI view based on whether a valid token exists in memory
function updateSessionUI() {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('username');
    
    if (token) {
        sessionStatus.className = "session-box authenticated";
        sessionStatus.innerHTML = `🔓 Authenticated: ${storedUser} <button onclick="logout()" style="margin-left:10px; background:none; border:none; color:#f87171; cursor:pointer; text-decoration:underline;">Logout</button>`;
        fetchUsers();
    } else {
        sessionStatus.className = "session-box unauthenticated";
        sessionStatus.innerText = "🔒 System Status: Unauthenticated Session";
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    updateSessionUI();
    fetchUsers();
}

// Handle Authentication Form Submit (Login & Register Engine)
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = usernameInput.value;
    const password = passwordInput.value;
    
    // Choose the target endpoint path dynamically based on state
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
            // Save token and username securely in browser memory!
            localStorage.setItem('token', data.accessToken);
            localStorage.setItem('username', username);
            
            // Wipe inputs
            usernameInput.value = '';
            passwordInput.value = '';
            updateSessionUI();
        } else {
            // If they just registered, automatically toggle them back to login screen smoothly
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

        const isLogedIn = localStorage.getItem('token');

        users.forEach(user => {
            const userCard = document.createElement('div');
            userCard.className = 'user-item';
            userCard.innerHTML = `
                <div class="user-info">
                    <h4>${user.name}</h4>
                    <p>ID: ${user.id} • ${user.role}</p>
                </div>
                <button class="delete-btn ${!isLogedIn? 'hidden' : ''}" onclick="deleteUser(${user.id})">🗑️</button>
            `;
            usersList.appendChild(userCard);
        });
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

// 3. DELETE A USER (SECURED VIA JWT HEADERS Injection)
async function deleteUser(id) {
    if (!confirm("Are you sure you want to permanently delete this user?")) return;

    // Grab the token out of localStorage memory!
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`/users/delete/${id}`, {
            method: 'DELETE',
            headers: {
                // We pass our token payload down inside the headers exactly how Postman does!
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            // Catches the '401 Missing' or '403 Expired' errors thrown by our backend middleware!
            alert(`⚠️ Action Blocked: ${data.error}`);
            if (response.status === 403 || (data.error && data.error.toLowerCase().includes('expired'))) {
                console.log("Detected expired session token. Resetting layout state...");
                logout(); // this clears localStorage, hides buttons, and updates the lock image
            }
            return;
        }

        // Successfully cleared gate
        fetchUsers();
    } catch (err) {
        console.error('Deletion Exception:', err);
    }
}

// Core Boot Initializer Loop
updateSessionUI();
fetchUsers();