const mongoose = require("mongoose");
const messageSchema = require("./message");

const communitySchema = new mongoose.Schema({
  name: {
    type: String,
    minLength: 3,
    required: true
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],
  messages: [ messageSchema ]
})

module.exports = mongoose.model("Community", communitySchema);