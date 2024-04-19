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
//--------------------WEB SOCKET --------------------
io.on('connection',(socket) => {
    console.log("user connected");

});
io.on('disconnect',(socket)=>{
    console.log("userdisconnected");
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
    let myProducts = [],myBids = [];
    try {
       
        const result = await pool.query(`select * from Auctions where sellerId = $1  ORDER BY endTime ; `,[req.user.id]);

        if (result.rowCount > 0) {
            myProducts = result.rows;
        }
        const result1 = await pool.query(`  
            SELECT auctionid, userid, MAX(amount) AS highestBid
            FROM Bids
            WHERE userid = $1
            GROUP BY auctionid, userid;`
            ,[req.user.id]
        );
        if (result1.rowCount > 0) {
            myBids = result1.rows;
        }
        

    }
    catch (error) {
        throw(error);
    }
    
    console.log("in myproducts",myProducts);
    res.render("profile",{myProducts : myProducts,user : req.user, myBids : myBids });
});
app.get("/products",checkNotAuthenticated,async (req,res) => {
  let params = req.query;
  let prodId;
  const msg = req.session.msg ;
  req.session.msg = "";
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
    console.log(msg,"BACKEND")
    // console.log(res.msg,"BACKEND")
    res.render("product",{ product : product_details ,userId : req.user.id,msg : msg });
  }
///vsfhulildshudshildgfyudcidgckuydicuk
});
app.post("/products",checkNotAuthenticated, async (req,res) => {
    const { bidAmount }=req.body ;
    let msg = "";
    let params = req.query;
    let prodId = parseInt(params.id);
    const  result = await pool.query(`Select highestBid from Auctions where auctionId = $1`,[prodId]);
    console.log(result.rows)
    const highestbid = result.rows[0].highestbid;
    console.log(highestbid)
    if(bidAmount > highestbid){
        try {
            // Update highest bid in the database
            await pool.query(`Insert into bids (userId,auctionId,amount) values ($1,$2,$3)`,[parseInt(req.user.id),prodId,bidAmount]);
            await pool.query('UPDATE Auctions SET highestBid = $1 WHERE auctionId = $2', [bidAmount, prodId]);
            // Broadcast the new highest bid to all connected clients
            
            io.emit('newHighestBid', { auctionId: prodId, highestBid: bidAmount });
            msg = "Bid Placed Succesfully";
            console.log(msg);
        } 
        catch (error) {
            console.error('Error updating highest bid:', error);
            msg = "Internal Error. Bid NOT PLACED";
            console.log(msg);
        }
    }
    else{
        msg = "Server Error.... Bid NOT PLACED.  Please Check The Current Highest Bid Amount";
        console.log(msg)
    }
    req.session.msg = msg;

    //console.log(res.locals)
    res.redirect(req.url)
    
});
app.get("/search", async(req,res)=> {
    let query = req.query.q?.trim().toLowerCase();
    let category_flag = false;
    let products;
    console.log("The query is",query);
    function isCategory(query)
    {
        let categories = ['electronics','paintings','automobile','furniture','antique','watch','watches']
        if( categories.includes(query) )
        {
            return true;
        }
        return false;
    }

    if(isCategory(query))
    {
        category_flag = true;
        console.log(category_flag);
    }
    console.log(category_flag);
    try {
        const result = await pool.query("Select * from searchauctions($1,$2);",[category_flag,query]);
        console.log(result);
        if(result.rowCount > 0)
        {
            products = result.rows;
            //console.log("seraching for products",products)
        }
        else
        {
           products = []; 
        }
    } catch (error) {
        throw(error);
    }

    res.render("home1",{products : products , query : query,msg : "", msg1 : ""})
    
})
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

    console.log(req.session);
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
   const msg = req.session.msg;
   console.log(msg);
   res.render("form1.ejs",{msg : msg});
});
app.post("/users/sell",checkNotAuthenticated, (req, res) => {
    console.log(req.body);
    let msg ="";
    let {
        product_name ,
        image_src,
        description,
        productCategory,
        start_time,
        end_time,
        base_price 
    } = req.body;
   /*  console.log( product_name ,
        image_src,
        description,
        productCategory,
        start_time,
        end_time,
        base_price ); */
    console.log( req.session.passport.user);
    
  
    pool.query(
        `INSERT INTO Auctions (sellerId,prodName,prodImg,description,category,startTime,endTime,basePrice,prodStatus,auctionStatus) 
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10);`,
        [req.session.passport.user,product_name ,image_src,description,productCategory,start_time,end_time,base_price,"unsold","pending"],
        (err,results)=>{
            if(err){
                msg = "INTERNAL ERROR";
                console.log(msg);
                throw (err);
                            
            }
            else{

                msg = "Product ADDED SUCESSFULLY";
                console.log(msg);
            }
        }
    );
    req.session.msg = msg;
    res.redirect("/users/sell");
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

server.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
    
});

  