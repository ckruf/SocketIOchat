const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    minLength: 3,
    required: true
  },
  password: {
    type: String,
    minLength: 3,
    required: true
  },
  friends: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],
  communities: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community"
    }
  ]
})

module.exports = mongoose.model("User", userSchema);