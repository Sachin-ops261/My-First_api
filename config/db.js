require('dotenv').config();
const { Pool } = require('pg');

// set up the connection manager(pool)
const pool = new Pool({
    //instead of a hardcoded string , we call the environment variable variable name
    connectionString: process.env.DATABASE_URL,
});

// test the connection instantly when the server startes
pool.connect((err, client, release) =>{
    if(err){
        return console.error('X error acquiring client', err.stack);
    }
    console.log('seccessfully connected to the postgreSQL database live in the cloud!');
    release();
});

//export the pool so other files can use it to query the DB
module.exports = pool;