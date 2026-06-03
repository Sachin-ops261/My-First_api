require('dotenv').config(); 
const express = require('express');
const app = express();
const PORT = 3000;
app.use(express.static('public'));

const userRoutes = require('./routes/userRoutes'); // this is user routes file

app.use(express.json()); // middleware for express to understand json.

//link the router file to a base path
//this means every route inside userRoutes now automatically starts with "/users"
app.use('/users', userRoutes);

app.get('/hello', (req, res) => {
    res.json({message: "hello world!"});
});

//start the server on port 3000
app.listen(PORT, () => {
    console.log(`server is running at http://localhost:${PORT}`);
});