const url_module = require("url");
const jwt = require("jsonwebtoken");
const JWT_SECRET = "supertopsecret123";

// check that valid token is set in localStorage and put user detail into req.user
const loginVerifier = async (req, res, next) => {
  const token = req.cookies["AuthToken"];
  if (token) {
    try {
      const decodedToken = jwt.verify(token, JWT_SECRET);
      req.user = decodedToken;
      return next();
    } catch (error) {
      console.log("error while decoding token from localStorage ", error.message);
    }
  }
  return res.redirect(url_module.format({
    pathname: "/login",
    query: "You must be logged in to view this page"
  }))
}

module.exports = {
  loginVerifier
}