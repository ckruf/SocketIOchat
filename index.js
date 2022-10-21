const express = require("express");
const http = require("http");
const mustacheExpress = require("mustache-express");

const PORT = 3000;

const app = express();
const server = http.createServer(app);

app.use(express.static("styles"));
app.use(express.static("scripts"));

app.set("views", `${__dirname}/views`);
app.set("view engine", "mustache");
app.engine("mustache", mustacheExpress());

app.get("/chats", async (req, res) => {
    return res.render("index", {
        name: "Chris",
        message: "Hey man, what's up?"
    })
});

app.get("/", async (req, res) => {
    return res.render("login");
})

server.listen(PORT);

