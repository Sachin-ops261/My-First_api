const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken'); // import jwt package
const pool = require('../config/db');//import our database pool configuration 

//GATEKEEPER MIDDLEWARE : verifies if incoming request has a valid token pass
function authenticateToken(req, res, next){
    //read the authorization header from the incoming http request
    const authHeader = req.headers['authorization'];
    //headers usually say: "bearer <TOKEN_STRING". we split it to grab just the token
    const token = authHeader && authHeader.split(' ')[1];
    if(!token){
        return res.status(401).json({error: "access denied: missing authentication token!"});
    }

    //verify token calidity against our secret environment passphrase
    jwt.verify(token, process.env.JWT_SECRET, (err, decodedUser) =>{
        if(err){
            return res.status(403).json({error: "access forbidden: invalid or expired token!"});
        }

        req.user = decodedUser;  //inject user details into request stream 
        next();   //authorization approved! Pass execution to the main route controller block.
    });
}


// read all users
router.get('/', async (req, res) => {
    try {
        // SELECT * MEANS : "get all the colums from the users table"
        const result = await pool.query('SELECT * FROM users ORDER BY id ASC');

        //result.rows contains the actual array of objects returned by postgreSQL
        res.json(result.rows);
    } catch (err)
    {
        res.status(500).json({error: err.message});
    }
});

// create a user
router.post('/add', async(req, res) =>{
    const { name, role} = req.body;
    try {
        // $1 and $2 are secure placeholders to prevent SQL injection attacks
        const insertQuery = 'INSERT INTO users ( name, role) VALUES ($1, $2) RETURNING *';
        const result = await pool.query(insertQuery, [name, role]);

        res.json ({
            message: "user added to permanent database successfully!",
            newUser: result.rows[0]  // returns the exact row just inserted(with its new id)
        });
    } catch (err)
    {
        res.status(500).json({error: err.message});
    }
});

//update a user
router.put('/update/:id', async (req, res) => {
    const userId = parseInt(req.params.id);
    const {role, name} = req.body;
    let result;

    try{
        if(role)
        {
            //UPDATE table SET column = new_value WHERE condition
            const updateQuery = 'UPDATE users SET role = $1 WHERE id = $2 RETURNING *';
            result = await pool.query(updateQuery, [role, userId]);
    
            //if result.row is empty, it means no user matced that id 
        }
        else if(name)
        {
            const updateName = 'UPDATE users SET name = $1 WHERE id = $2 RETURNING *';
            result = await pool.query(updateName, [name, userId]);
        }

        // if and else if only changes one thing at a time so 
        //this tells SQl : "set name to the new name , but if new name wasn't provided ($1 is null), keep the old name"
        // const updateQuery =`
        //     UPDATE users
        //     SET name = COALESCE($1, name),
        //         role = COALESCE($2, role)
        //     WHERE id = $3
        //     RETURNING *;
        // `;
        // const result = await pool.query(updateQuery, [name || null, role || null], userId);
        if(!result || result.rows.length === 0){
            return res.status(404).json({error: "user not found in our database."});
        }
        res.json({
            message: `user ID ${userId} updated successfully in cloud!`,
            updateUser: result.rows[0]
        });
    }catch(err) {
        res.status(500).json({error: err.message});
    }
});

//delete a user
router.delete('/delete/:id', authenticateToken, async(req, res) =>{
    //everthing stays the same, all we have to do is add one more parameter (authenticateToken) and its done 
    const userId = parseInt(req.params.id);

    try{
        //DELETE FROM table WHERE condition
        const deleteQuery = 'DELETE FROM users WHERE id = $1 RETURNING *';
        const result = await pool.query(deleteQuery, [userId]);

        if(result.rows.length === 0)
        {
            return res.status(404).json({error: "user not found in our database."});
        }

        res.json({
            message: `user ID ${userId} permanently deleted from database.`,
            deletedUser: result.rows[0]
        });

    } catch(err){
        res.status(500).json({error: err.message});
    }
});

//export the router configuration
module.exports = router;