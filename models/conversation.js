const mongoose = require("mongoose");
const messageSchema = require("./message");


const conversationSchema = new mongoose.Schema({
  userA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  userB: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  messages: [ messageSchema ]
})

module.exports = mongoose.model("Conversation", conversationSchema);