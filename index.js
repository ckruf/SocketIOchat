const express = require("express");
const http = require("http");
const mustacheExpress = require("mustache-express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const url_module = require("url");
const jwt = require("jsonwebtoken");
const cookies = require("cookie-parser");

const User = require("./models/user");
const { loginVerifier } = require("./middleware");

const PORT = 3000;
const MONGODB_URI = "mongodb://localhost:27017"
const JWT_SECRET = "supertopsecret123";

const app = express();
const server = http.createServer(app);

app.use(express.static("styles"));
app.use(express.static("scripts"));

app.use(bodyParser.urlencoded({extended: true}));
app.use(cookies());

app.set("views", `${__dirname}/views`);
app.set("view engine", "mustache");
app.engine("mustache", mustacheExpress());

app.get("/", loginVerifier, async (req, res, next) => {
    return res.render("index", {
        name: "Chris",
        message: "Hey man, what's up?"
    })
});

app.get("/login", async (req, res) => {
    return res.render("login");
});

app.post("/login_handler", async (req, res) => {
  console.log(JSON.stringify(req.body));

  let userDataForToken;

  const potentialUser = await User.findOne({username: req.body.username});

  console.log("potentailsUser is ", potentialUser);


  if (potentialUser && potentialUser.password !== req.body.password) {
    console.log("first condition entered");
    return res.redirect(url_module.format({
      pathname: "/login",
      query: {"err_msg": "Wrong credentials"}
    }))
  } 
  else if (potentialUser && potentialUser.password === req.body.password) {
    console.log("second condition entered");
    userDataForToken = {
      username: potentialUser.username,
      id: potentialUser._id
    }
  }

  else if (!potentialUser) {
    console.log("third condition entered");
    const newUserData = {
      username: req.body.username,
      password: req.body.password
    };
    const newUser = new User(newUserData);
    await newUser.save();
    userDataForToken = {
      username: newUser.username,
      id: newUser._id
    }
  }

  const token = jwt.sign(userDataForToken, JWT_SECRET);
  
  res.cookie("AuthToken", token);

  return res.redirect("/");
});

app.get("/users", async (req, res) => {
  return res.render("users");
});

app.get("/communities", async (req, res) => {
  return res.render("communities");
});

console.log("connecting to ", MONGODB_URI);

mongoose.connect(MONGODB_URI)
.then(() => {
  console.log("Connected to MongoDB");
})
.catch(error => {
  console.log("Error connecting to MongoDB: ", error.message);
})

server.listen(PORT, () => {
  console.log("Server running on port ", PORT);
});

