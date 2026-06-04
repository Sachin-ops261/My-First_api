require('dotenv').config(); 
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const pool = require('./config/db');
app.use(express.static('public'));
app.use(express.json()); // middleware for express to understand json.

const userRoutes = require('./routes/userRoutes'); // this is user routes file
const authRoutes = require('./routes/authRoutes');

//put this right next to your other oute links(for future me)
app.use('/auth',authRoutes);


//link the router file to a base path
//this means every route inside userRoutes now automatically starts with "/users"
app.use('/users', userRoutes);

async function createTables(){
        try{
            await pool.query(`
            CREATE TABLE IF NOT EXISTS users(
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                role VARCHAR(100) NOT NULL
            );`
        );
        } catch (err) {
            console.error("error making table", err);
        }
        const createAccountsTableQuery = `
        CREATE TABLE IF NOT EXISTS accounts(
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user'
    );`;
    try{
        await pool.query(createAccountsTableQuery);
        console.log("'accounts' security table is ready in the cloud database!");
    } catch (err){
        console.error("error creating accounts table:", err);
    }
};

createTables();

//start the server on port 3000
app.listen(PORT, () => {
    console.log(`server is running at http://localhost:${PORT}`);
});