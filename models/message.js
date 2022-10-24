const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  content: {
    type: String,
    minLength: 1,
    required: true
  },
  timeSent: {
    type: Date,
    required: true
  }
})

module.exports = messageSchema