// Grab pointers to our HTML interface elements (just like DOM manipulation)
const userForm = document.getElementById('userForm');
const nameInput = document.getElementById('name');
const roleInput = document.getElementById('role');
const usersList = document.getElementById('usersList');

// 1. FUNCTION: Fetch users from our API and render them onto the screen
async function fetchUsers() {
    try {
        // Fetch data from our local Express route prefix
        const response = await fetch('/users');
        const users = await response.json();

        // Clear out the "Loading..." text placeholder
        usersList.innerHTML = '';

        if (users.length === 0) {
            usersList.innerHTML = '<p class="loading">No users in the database yet.</p>';
            return;
        }

        // Loop through the data array (just like a loop layout) and build HTML strings
        users.forEach(user => {
            const userCard = document.createElement('div');
            userCard.className = 'user-item';

            //we've added a button insdie the layout holding the user's specific ID
            userCard.innerHTML = `
                <div class="user-info">
                    <h4>${user.name}</h4>
                    <p>ID: ${user.id} • ${user.role}</p>
                </div>
                <button class="delete-btn" onclick="deleteUser(${user.id})">🗑️</button>
            `;
            usersList.appendChild(userCard);
        });
    } catch (err) {
        console.error('Error fetching data:', err);
        usersList.innerHTML = '<p class="loading" style="color: #ef4444;">Failed to sync with cloud data cluster.</p>';
    }
}

// new function = fire a delete request to our backend api route
async function deleteUser(id){
    if(!confirm("Are you sure you want to delete this user from the clous?")) return;
    try{
        const response = await fetch(`/users/delete/${id}`,{
            method: 'DELETE'
        });

        if(response.ok){
            //insteantly refresh the visual interfave layout list
            fetchUsers();
        }
    } catch (err){
        console.error('Error deleting user:', err);
    }
}

// 2. EVENT LISTENER: Handle form submission to add a new user to the database
userForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Stop the webpage from forcing a hard refresh on submit

    const name = nameInput.value;
    const role = roleInput.value;

    try {
        // Send a POST request to our API endpoint containing the form input values
        const response = await fetch('/users/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, role })
        });

        if (response.ok) {
            // Reset the form fields cleanly
            nameInput.value = '';
            roleInput.value = '';
            
            // Re-fetch the updated user list instantly without reloading the entire window page!
            fetchUsers();
        }
    } catch (err) {
        console.error('Error adding user:', err);
    }
});

// Run this function automatically the instant the page finishes booting up in the browser
fetchUsers();