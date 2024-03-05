const express = require('express');
const pool = require('./dbConfig');
const ejs = require('ejs');
const bcrypt = require('bcrypt');
const flash = require('express-flash');
const passport = require('passport');
const session = require('express-session');
const path = require('path');

require("dotenv").config();
const app = express();

app.use(express.urlencoded({extended : false}));
app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.static(path.join(__dirname, 'utils')));
const PORT = process.env.PORT || 5000 ;
const initializePassport = require("./passportConfig");
initializePassport(passport);
// ------------------MIDDLEWARE------------------
app.use(
    session({
        name : "session",

        secret: process.env.SESSION_SECRET,

        resave: false,

        saveUninitialized: false

    })

);

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());



//------------------ROUTES-------------------------


app.get("/",(req,res)=>{
    res.render("home");
});

app.get("/users/dashboard", checkNotAuthenticated, (req, res) => {
    console.log(req.isAuthenticated());
    res.render("dashboard", { user: req.user.name });
});

app.get("/users/logout", (req, res) => {
    req.logout();
    res.redirect("/");
  });
  
app.get("/users/register", checkAuthenticated, (req, res) => {
    res.render("register.ejs");
});

app.get("/users/login", (req, res) => {
    // flash sets a messages variable. passport sets the error message
    console.log("herererererre")
    //console.log(req.session.flash.error);
    res.render("login.ejs");

});

app.post("/users/register", async (req,res)=>{
    let {name, email, password, password2 } = req.body;
    let errors = [];

    console.log(name, email, password, password2);

    if(password.length < 6)
    {
        errors.push({message: "Password Must have at least 6 characters"});
       console.log("hereee at er1")
        console.log(errors)
        
    }
    if(password !== password2)
    {
        errors.push({message: "The passwords doesnt match"});
        console.log("hereee at er2")
        console.log(errors)
    }
    if(errors.length > 0){
      req.flash("errors",errors );
      res.redirect("/users/register") 
    }
    else{
        hashedPassword = await bcrypt.hash(password,10);
        pool.query(
            `SELECT * FROM users WHERE email = $1 OR username = $2`,
            [email,name],
            (err,results)=>{
                if(err){
                    console.log(err);
                }
                console.log(results.rows);
                if(results.rows.length > 0){
                    errors.push({message : "The Username or Email is Already Registered"});
                    console.log("The Username or Email is Already Registered");
                    req.flash("errors",errors);
                    res.redirect("/users/register");
                }
                else{
                    pool.query(
                        `INSERT INTO users (username,email,password)
                        VALUES ($1,$2,$3)`,[name,email,hashedPassword],
                        (err, results) => {
                            if (err) {
                              throw err;
                            }
                            console.log(results.rows);
                            req.flash("success_msg", "You are now registered. Please log in");
                            res.redirect("/users/login");
                        }

                    );
                }
            }

        );
    }
});

app.post("/users/login",
    passport.authenticate(
        "local",
        { 
        successRedirect : "/users/dashboard",
        failureRedirect : "/",
        failureFlash : true
        }
    )
);

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()){
        console.log("isAuthenticated2");

      return res.redirect("/users/dashboard");
    }
    next();
}
  
function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      console.log("isAuthenticated");
        return next();
    }
    res.redirect("/users/login");
}
  

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
});
  
