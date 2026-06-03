const express = require('express');
const router = express.Router();
const pool = require('../config/db');//import our database pool configuration 

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
router.delete('/delete/:id', async(req, res) =>{
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