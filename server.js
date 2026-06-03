const express = require('express');
const { Pool } = require('pg');

const connectionString = "postgresql://neondb_owner:npg_RgB9bKyH7tGO@ep-silent-hill-aqxepx05.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require";

// set up the connection manager(pool)
const pool = new Pool({
    connectionString: connectionString,
});

// test the connection instantly when the server startes
pool.connect((err, client, release) =>{
    if(err){
        return console.error('X error acquiring client', err.stack);
    }
    console.log('seccessfully connected to the postgreSQL database live in the cloud!');
    release();
});

//function to create the table if it doesn't exist
async function createTable(){
    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users(
        id SERIAL PRIMARY KEY, 
        name VARCHAR(100) NOT NULL,
        role VARCHAR(100) NOT NULL
    );
    `;
    try{
        await pool.query(createTableQuery);
        console.log("'users' table is ready in the database!");
    } catch(err) {
        console.error("X error creating table: ",err);
    }
}

//run the function immediately
createTable();

const app = express();
const PORT = 3000;
app.use(express.json()); // middleware for express to understand json.

// this array of objects is our temporary, in-memory database
// usersDatabase = [
//     { id: 1, name: "rahul", role: "developer" },
//     { id: 2, name: "sneha", role: "designer" }
// ];

// //get route to view our database array
// app.get('/users', (req, res) => {
//     res.json(usersDatabase);
// });

// // post route to add a new object to our database array
// app. post('/users/add', (req, res) => {
//     const {name, role } = req.body;

//     //create a new object structure
//     const newUser = {
//         id: usersDatabase.length + 1, // generate a simple sequential ID
//         name: name,
//         role: role
//     };

//     // push the new object into our array (data manegement)
//     usersDatabase.push(newUser);

//     res.json({
//         message: "user added successfully!",
//         currentDatabase: usersDatabase
//     });
// });

// //put route to update a user's details based on their id
// app.put('/users/update/:id', (req, res) => {
//     // convert the incoming id parameter from string to a numebr
//     const userId = parseInt(req.params.id);
//     const { role } = req.body; // grab the new role details from postman

//     //find the specific user object inside the array
//     const user = usersDatabase.find(u => u.id === userId);

//     if(user){
//         user.role = role; // modify the object property directly in memory
//         res.json({
//             message: `user id ${userId} updated successfully!`,
//             currentDatabase: usersDatabase
//         });
//     }else {
//         res.status(404).json({error: "user not found in our system."})
//     }
// });

// //delete route to remove a user based on their id
// app.delete('/users/delete/:id', (req,res) => {
//     const userId = parseInt(req.params.id);
    
//     //verify if the user exists before wiping them out
//     const userExists = usersDatabase.some(person => person.id === userId);
    
//     if(userExists){
//         //keep everything except the item that matches the target id
//         usersDatabase = usersDatabase.filter(u => u.id !== userId);

//         res.json({
//             message: `user Id ${userId} deleted successfully!`,
//             currentDataase: usersDatabase
//         });
//     }else {
//         res.status(404).json({error: "user not found in our system."});
//     }
// });


// this is an api endpoint (a get request)
app.get('/hello', (req, res) => {
    res.json({message: "hello world! your api is officially working"});
})

app.get('/greet/:name', (req, res) =>{
    //req.params grabs whateveer text the user types in place of :name
    const userName = req.params.name;

    res.json({
        message: `Welcome back, ${userName}`,
        status: "success",
        timestamp: new Date()
    });
});

// a post endpoint to handle user login
app.post('/login', (req, res) => {
    //req.body captures the data sent from postman
    const {username, password} = req.body;

    //a simple logiv check (simulating a database check )
    if (username === "admin" && password === "secret123"){
        res.json({
            status: "login succuessful",
            token: "mock-jwt-token-xyz123",
            user: {username: username, role:"developer"}
        });
    }else{
        res.status(401).json({
            status: "failed",
            error: "invalid username or password"
        });
    }
});

app.get('/users', async (req, res) => {
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

app.post('/users/add', async(req, res) =>{
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

app.put('/users/update/:id', async (req, res) => {
    const userId = parseInt(req.params.id);
    const {role} = req.body;
    const {name} = req.body;
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
        if(result.rows.length === 0){
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

app.delete('/users/delete/:id', async(req, res) =>{
    const userId = parseInt(req.params.id);

    try{
        //DELETE FROM table WHERE condition
        const deleteQuery = 'DELERE FROM users WHERE id = $1 RETURNING *';
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

//start the server on port 3000
app.listen(PORT, () => {
    console.log(`server is running at http://localhost:${PORT}`);
});