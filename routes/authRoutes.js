const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// REGISTER ENDPOINT
router.post('/register', async (req, res) =>{
    const {username, password} = req.body;

    try{
        //1. generate a secure salt and hash the plain text text password (salt means useless items to put between real password)
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        //2. save the username and the SCAMBLED password to postgreSQL
        const insertQuery = `
        INSERT INTO accounts(username, password_hash, role)
        VALUES($1, $2, 'admin')
        RETURNING id, username, role;
        `;
        const result = await pool.query(insertQuery, [username, hashedPassword]);

        res.status(201).json({
            message: "account secured and created successfully!",
            account: result.rows[0]
        });
    } catch (err) {
        if(err.code === '23505'){//postgreSQL code for unique constraint violation
            return res.status(400).json({ error: "username is already taken."});    
        }
        res.status(500).json({error: err.message});
    }
});

//LOGIN ENDPOINT
router.post('/login',async(req, res) =>{
    const {username, password} = req.body;
    try{
        //1. check if the user exists in our accounts table
        const userQuery = 'SELECT * FROM accounts WHERE username = $1';
        const result = await pool.query(userQuery, [username]);

        if(result.rows.length === 0)
        {
            return res.status(401).json({error: "Invalid username or password"})
        }
        const user = result.rows[0];

        //2. mathematically compare the incoming raw password with the stored hash
        const isPasswordMatch = await bcrypt.compare(password, user.password_hash);

        if(!isPasswordMatch){
            return res.status(401).json({error: "Invalid username or password credentials."});
        }
        
        //3. Issue a secure JSON web token that expires in 1 hour
        //we embed the user's ID, username, and role directly into the token payload safely
        const token = jwt.sign(
            { id: user.id, username: user.username, role:user.role },
            process.env.JWT_SECRET,
            {expiresIn: '10s'}
        );

        res.json({
            message: "authentication successful! Access token granted.",
            accessToken: token
        });
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

module.exports = router;