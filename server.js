const express = require('express');
const pool = require('./dbConfig');
const ejs = require('ejs');
const bcrypt = require('bcrypt');
const flash = require('express-flash');
const passport = require('passport');
const session = require('express-session');
const path = require('path');
// const router =  require('./routes/router')
require("dotenv").config();
const app = express();
const server =require('http').createServer(app);
const updateDb = require('./updateDb');
app.use(express.urlencoded({extended : false,limit : '50mb'}));
app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.static(path.join(__dirname, 'public')));
const PORT = process.env.PORT || 5000 ;
const initializePassport = require("./passportConfig");
const router = require('./routes/router');
initializePassport(passport);
const io = require('socket.io')(server);
//-------------------WEB SOCKET------------------
/* 
io.on('connection', (socket) => {
    console.log('A user connected');
  
    // Handle bid event
    socket.on('bid', async (data) => {
      try {
        // Update highest bid in the database
        await pool.query(`Insert into bids (userId,auctionId,amount) values ($1,$2,$3)`,[data.userId,data.auctionId,data.bidAmount]);
        await pool.query('UPDATE Auctions SET highestBid = $1 WHERE auctionId = $2', [data.bidAmount, data.auctionId]);
        // Broadcast the new highest bid to all connected clients
        io.emit('newHighestBid', { itemId: data.auctionId, highestBid: data.bidAmount });
      } catch (error) {
        console.error('Error updating highest bid:', error);
      }
    });
  
    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  }); */

  io.on('connection',(socket) => {
    console.log("in server socket");
});
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
// app.use(router);


//------------------ROUTES-------------------------


app.get("/dev",(req,res)=>{
    res.render("home");
});

app.get("/",async (req,res)=>{
    let products = [];
    let msg,msg1;
    try {
       
        let result = await pool.query(`select * from Auctions where auctionStatus = 'ongoing' ORDER BY endTime `);
        console.log("in ongoing products")

        if (result.rowCount > 0) {
           products = result.rows;
           console.log("has ongoing products")
        }
        else{
            console.log("in upcoming products")

            msg = "NO ONGOING AUCTIONS AT THIS TIME";
            result = await pool.query(`select * from Auctions where auctionStatus = 'upcoming' ORDER BY startTime`);
            console.log(result.rows);
            if(result.rowCount > 0 ) {
                products = result.rows;
                console.log("has upcoming products")

                console.log(products);
                msg = "";
            }
            else{
                msg = "";
                msg1 = "NO ONGOING AND UPCOMING AUCTIONS AT THIS TIME";
            }
        }
    }
    catch (error) {
        throw(error);
    }
   // console.log(products);
    res.render("home1",{ products : products, msg : msg,msg1 : msg1 });
})
app.get("/users/profile",checkNotAuthenticated,async (req,res)=>{
    let myProducts = [];
    try {
       
        const result = await pool.query(`select * from Auctions where sellerId = $1  ORDER BY endTime ; `,[req.user.id]);

        if (result.rowCount > 0) {
        myProducts = result.rows;
        }

    }
    catch (error) {
        throw(error);
    }
    
    console.log("in myproducts",myProducts);
    res.render("profile",{myProducts : myProducts,user : req.user});
})
/* app.get("/users/dashboard", checkNotAuthenticated,async (req, res) => {
    console.log(req.isAuthenticated());
    let myProducts = [];
    try {
       
        const result = await pool.query(`select * from Auctions where sellerId = $1  ORDER BY endTime  DES `,[req.session.user.id]);
        console.log(result);
        console.log("in here in try block");
        if (result.rowCount > 0) {
        myProducts = result.rows;
        }

    }
    catch (error) {
        throw(error);
    }
    res.render("dashboard", { user: req.user.name });
}); */
app.get("/products",checkNotAuthenticated,async (req,res) => {
  let params = req.query;
  let prodId;
  if( typeof params.id == 'undefined' )
  {
    res.send("ERRRORR");
  }
  else{
    prodId = parseInt(params.id);

    result = await pool.query("Select * from Auctions where auctionId = $1",[prodId]);
    product_details = result.rows[0];
    console.log("results rows",result.rows);
    console.log(product_details);
    res.render("product",{ product : product_details});
  }

});
app.post("/products",checkNotAuthenticated,(req,res) => {
    const { bidAmount }=req.body ;
  //  console.log(bidAmount);
    let params = req.query;
    let prodId = parseInt(params.id);
   // console.log(bidAmount,req.query);
    //console.log("asdfghjklsdfghjkzxcvbnm")
    try {
        // Update highest bid in the database
        pool.query(`Insert into bids (userId,auctionId,amount) values ($1,$2,$3)`,[parseInt(req.user.id),prodId,bidAmount]);
        pool.query('UPDATE Auctions SET highestBid = $1 WHERE auctionId = $2', [bidAmount, prodId]);
        // Broadcast the new highest bid to all connected clients
        
        io.emit('newHighestBid', { auctionId: prodId, highestBid: bidAmount });
    } 
    catch (error) {
        console.error('Error updating highest bid:', error);
    }
});
app.get("/category", async (req,res) => {
   
    let params = req.query;
    let category;
    if( typeof params.type == 'undefined' )
    {
      res.render("categories");
    }
    else{
      category = params.type;
      let products =[];
      let msg,msg1;
      try {
            let result = await pool.query(`select * from Auctions where category = $1 and auctionStatus = 'ongoing' ORDER BY endTime `,[category]);

            if (result.rowCount > 0) {
            products = result.rows;
            }
            else{
                msg = "NO ONGOING AUCTIONS AT THIS TIME";
                result = await  pool.query(`select * from Auctions where  category = $1 and auctionStatus = 'upcoming' ORDER BY startTime`,[category]);
                
                if(result.rowCount > 0 ) {
                    products = result.rows;
                    console.log(products)
                    msg = "";
                }
                else{
                    msg = "";
                    msg1 = "NO ONGOING AND UPCOMING AUCTIONS AT THIS TIME";
                }
            }
        }
        catch (error) {
            throw(error);
        }
        console.log(products,"category products")
        res.render("home1",{ products : products, msg : msg,msg1 : msg1 });
    }
});
app.get("/users/logout", (req, res) => {
    req.logout((err)=>{
        if(err)
        {
            console.log(err);
            return err;
        }
    });
    res.redirect("/");
  });
  
app.get("/users/register", checkAuthenticated, (req, res) => {
    res.render("register.ejs");
});

app.get("/users/login",checkAuthenticated, (req, res) => {
    // flash sets a messages variable. passport sets the error message
    console.log("herererererre")
    console.log(req.session);
    // if(req.session.flash.error)
    // {
    //     console.log(req.session.flash.error);
    // }
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
        successRedirect : "/users/profile",
        failureRedirect : "/users/login",
        failureFlash : true
        }
    )
);
 
app.get("/users/sell", checkNotAuthenticated, (req, res) => {
   console.log("in get users/sell");
   res.render("form1.ejs");
});
app.post("/users/sell",checkNotAuthenticated, (req, res) => {
    console.log(req.body);
    let {
        product_name ,
        image_src,
        description,
        productCategory,
        start_time,
        end_time,
        base_price 
        } = req.body;
    console.log( product_name ,
        image_src,
        description,
        productCategory,
        start_time,
        end_time,
        base_price );
        console.log( req.session.passport.user);
    
   /*  pool.query(`SELECT * FROM Auctions;`,(err,results)=>{
        if(err)
        {
            throw (err);
        }
        else
        {
            console.log("here");
            console.log(results.rows);
        }
    });
 */
    pool.query(
        `INSERT INTO Auctions (sellerId,prodName,prodImg,description,category,startTime,endTime,basePrice,prodStatus,auctionStatus) 
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10);`,
        [req.session.passport.user,product_name ,image_src,description,productCategory,start_time,end_time,base_price,"unsold","pending"],
        (err,results)=>{
             if(err){
                console.log("here2")
                throw (err);
                            
                }
                console.log(results.rows);
        }
    )
});

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()){
        console.log("isAuthenticated2");

      return res.redirect("/users/profile");
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
  