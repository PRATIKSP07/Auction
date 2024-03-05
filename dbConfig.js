const Pool = require('pg').Pool;
require("dotenv").config();
const pool = new Pool({
    user : process.env.DB_USER,
    password : process.env.DB_PASSWORD,
    port : process.env.DB_PORT,
    host : process.env.DB_HOST,
    database : process.env.DB_DATABASE

})

 

module.exports = pool