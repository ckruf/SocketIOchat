const express = require("express");
const http = require("http");
const mustacheExpress = require("mustache-express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const url_module = require("url");
const jwt = require("jsonwebtoken");
const cookies = require("cookie-parser");
const { Server } = require("socket.io");

const User = require("./models/user");
const Community = require("./models/community");
const Conversation = require("./models/conversation");
const { loginVerifier } = require("./middleware");

const PORT = 3000;
const MONGODB_URI = "mongodb://localhost:27017"
const JWT_SECRET = "supertopsecret123";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("styles"));
app.use(express.static("scripts"));

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cookies());

app.set("views", `${__dirname}/views`);
app.set("view engine", "mustache");
app.engine("mustache", mustacheExpress());

// Socket IO code

// SocketIO middleware for username extraction
io.use((socket, next) => {
  const username = socket.handshake.auth.username;
  if (!username) {
    return next(new Error("Iinvalid username"));
  }
  socket.username = username;
  next();
})

io.on("connection", (socket) => {
  // put client in their own room (since client could have multiple tabs open, each with own connection)
  socket.join(socket.username);
  // when a client connects, send them a list of all online clients:
  let onlineUsers = new Set();
  for (let [id, socket] of io.of("/").sockets) {
    onlineUsers.add(socket.username)
  }
  onlineUsers = Array.from(onlineUsers);

  socket.emit("users", onlineUsers);

  // when user connects, send "user connected" event to all users
  // except for the one which just connected.
  socket.broadcast.emit("user connected", socket.username);

  socket.on("private message", ({content, to}) => {
    console.log("private message", {content, to});
    // send message to receiver's room and to sender's room, since sender could have multiple 
    // tabs open with separate sockets, but they are all in the sender's room
    socket.to(to).to(socket.username).emit("private message", {
      content,
      to,
      from: socket.username,
    })
  })
})



// Regular code

// display home page, fill sidebar with all user's chats and most recent message in each
app.get("/", loginVerifier, async (req, res, next) => {

  // helper function
  const findMostRecentMessage = (messages) => {
    let sortedMessages = messages.sort((a, b) => a.timeSent - b.timeSent);
    let mostRecentMessage;
    sortedMessages.length > 0
    ? mostRecentMessage = sortedMessages[sortedMessages.length - 1].content.split(" ").slice(0, 30).join(" ")
    : mostRecentMessage = "No messages yet."

    return mostRecentMessage;
  }


  const loggedUsername = req.user.username;
  const loggedUserId = mongoose.Types.ObjectId(req.user.id);
  let friendChats = await Conversation.find({$or: [{userA: loggedUserId}, {userB: loggedUserId}]}).populate("userA").populate("userB");

  friendChats = friendChats.map(chat => {
    let friend;
    chat.userA.username === loggedUsername 
    ? friend = chat.userB.username
    : friend = chat.userA.username;
    
    let mostRecentMessage = findMostRecentMessage(chat.messages);

    return {
      friend,
      mostRecentMessage,
      id: chat._id.toString()
    };
  });

  let communityChats = await Community.find({members: loggedUserId});
  communityChats = communityChats.map(community => {
    let mostRecentMessage = findMostRecentMessage(community.messages)

    return {
      community: community.name,
      id: community._id.toString(),
      mostRecentMessage
    }
  })

  return res.render("index", {
      friendChats,
      communityChats
  })
});

// display login page
app.get("/login", async (req, res) => {
    return res.render("login");
});

// handle login with data POSTed from login form on login page, redirect user 
// to home page if all is well
app.post("/login_handler", async (req, res) => {
  let userDataForToken;
  const potentialUser = await User.findOne({username: req.body.username});

  if (potentialUser && potentialUser.password !== req.body.password) {
    return res.redirect(url_module.format({
      pathname: "/login",
      query: {"err_msg": "Wrong credentials"}
    }))
  } 
  else if (potentialUser && potentialUser.password === req.body.password) {
    userDataForToken = {
      username: potentialUser.username,
      id: potentialUser._id
    }
  }

  else if (!potentialUser) {
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

// display page with all users that a user could become friends with (ie users he's not friends with already)
app.get("/users", loginVerifier, async (req, res) => {
  const loggedUsername = req.user.username;
  const loggedUserId = mongoose.Types.ObjectId(req.user.id);
  let users = await User.find({"$and": [{username:{"$ne": loggedUsername}}, {friends: {"$ne": loggedUserId}}]});
  let potentialFriends = users.map(user => {
    return {
      id: user._id.toString(),
      username: user.username
    }
  })
  return res.render("users", {users: potentialFriends});
});

// display page with all communities that a user could join (ie the ones he's not involved in)
app.get("/communities", loginVerifier, async (req, res) => {
  const loggedUserId = mongoose.Types.ObjectId(req.user.id);
  let potentialCommunities = await Community.find({"members": {"$ne": loggedUserId}});
  potentialCommunities = potentialCommunities.map(community => {
    return {
      name: community.name,
      id: community._id.toString()
    }
  })
  return res.render("communities", {communities: potentialCommunities});
});

// make two users be friends
app.post("/add_friend", loginVerifier, async (req, res) => {
  const loggedUser = await User.findOne({username: req.user.username});
  const newFriendId = req.body.id;
  const newFriend = await User.findById(newFriendId);
  loggedUser.friends.push(newFriend._id);
  newFriend.friends.push(loggedUser._id);
  await loggedUser.save();
  await newFriend.save();
  const newConversation = new Conversation({
    userA: loggedUser._id,
    userB: newFriend._id
  })
  await newConversation.save();
  return res.json({message: "success"});
});

// create new community
app.post("/add_community", loginVerifier, async (req, res) => {
  const founder = await User.findOne({username: req.user.username});
  let potentiallyExists = await Community.findOne({name: req.body.communityName});
  if (potentiallyExists) {
    return res.redirect("/communities");
  }
  const newCommunity = new Community({name: req.body.communityName});
  newCommunity.members.push(founder);
  await newCommunity.save();
  return res.redirect("/communities");
});

// add user as member of community chat
app.post("/join_community", loginVerifier, async (req, res) => {
  const joiner = await User.findOne({username: req.user.username});
  const communityId = req.body.id;
  const community = await Community.findById(communityId);
  community.members.push(joiner._id);
  await community.save();
  joiner.communities.push(community._id);
  await joiner.save();
  return res.json({message: "success"});
});

// get messages from community chat
app.get("/community_messages/:id", loginVerifier, async (req, res) => {
  const communityId = req.params.id;
  const community = await Community
  .findById(communityId)
  .populate({
    path: "messages",
    populate: {
      path: "author",
      model: "User"
    }
  });
  return res.json({messages: community.messages});
});

// save new message in community chat to mongo
app.post("/community_messages", loginVerifier, async (req, res) => {
  const communityId = req.body.id;
  const authorId = req.user.id;
  const now = new Date();
  const messageContent = req.body.content;
  const message = {
    author: mongoose.Types.ObjectId(authorId),
    content: messageContent,
    timeSent: now
  }
  const community = await Community.findById(communityId);
  community.messages.push(message);
  await community.save();
  return res.json({success: message});
});

// get messages from friend conversation
app.get("/friend_messages/:id", loginVerifier, async (req, res) => {
  const conversationId = req.params.id;
  const loggedUserId = req.user.id;
  const conversation = await Conversation
  .findById(conversationId)
  .populate({
    path: "messages",
    populate: {
      path: "author",
      model: "User"
    }
  });
  if (conversation.userA.toString() !== loggedUserId && conversation.userB.toString() !== loggedUserId) {
    return res.status(401).json({fail: "Not allowed"});
  }

  return res.json({messages: conversation.messages});
});

// save new message in friend conversation to mongo
app.post("/friend_messages", loginVerifier, async (req, res) => {
  const conversationId = req.body.id;
  const authorId = req.user.id;
  const messageContent = req.body.content;
  const now = new Date();
  const message = {
    author: mongoose.Types.ObjectId(authorId),
    content: messageContent,
    timeSent: now
  };

  const conversation = await Conversation.findById(conversationId);
  if (conversation.userA.toString() !== authorId && conversation.userB.toString() !== authorId) {
    return res.status(401).json({fail: "Not allowed"})
  }
  conversation.messages.push(message);
  await conversation.save();
  return res.json({success: message});
});

// return all chats that user sending the request is involved in, as json, so info can be put in localStorage
app.get("/all_user_chats", loginVerifier, async (req, res)  => {
  const loggedUserId = req.user.id;
  const user = await User.findById(loggedUserId).populate("friends").populate("communities");
  const communities = user.communities.map(community => {
    return {
      chatMongoId: community._id.toString(),
      chatName: community.name,
      chatType: "community"
    }
  });
  const userConversations = await Conversation.find({$or: [{userA: loggedUserId}, {userB: loggedUserId}]}).populate("userA").populate("userB");
  const friends = userConversations.map(conversation => {
    let chatName;
    conversation.userA._id.toString() === req.user.id 
    ? chatName = conversation.userB.username
    : chatName = conversation.userA.username;
    return {
      chatMongoId: conversation._id.toString(),
      chatName,
      chatType: "friend"
    }
  })
  const chats = communities.concat(friends);
  
  return res.json(chats);
})

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

