/*
localStorage

{
  currentUser: {
    username: username // currentUser is set during login
  },
  currentChatName: currentChatName, // this is set when user clicks on chatWindow in sidebar 
  allChats: 
    {
      chatName: {
        chatName: chatName,
        chatMongoId: chatMongoId,
        chatType: chatType, // "friend" | "community"
        chatSocketId: chatSocketId // socketIO chatId
      }
    } 
  // allChats is initially set with all info except chatSocketId on page load of homepage, by fetching
  // an endpoint which returns all user's friends and communities. chatSocketId is then populated
  // initially on the "users" event, which will populate it for friends who are online at that time
  // (ie when the user connects to socketIO on page load). chatSocketIds are then added whenever
  // a new friend goes online, using the "user connected" event 
}
*/


let currentUsername;

function main() {
  const currentUser = JSON.parse(window.localStorage.getItem("currentUser"));
  currentUsername = currentUser.username;

  const socket = io("http://localhost:3000", {autoConnect: false});
  socket.auth = { username: currentUsername };
  socket.connect();

  setupSocketEventListeners(socket);  
  attachAllEventListeners(socket);
  
  storeAllChatInfo();
}


const attachAllEventListeners = (socket) => {
  const messageTextarea = document.getElementById("messageInputField");
  messageTextarea.addEventListener("input", adjustHeightOnInput);

  attachFriendChatEventListeners();
  attachCommunityChatEventListeners();

  const sendBtn = document.getElementById("sendBtn");
  sendBtn.addEventListener("click", () => sendMessage(socket));

}

const attachFriendChatEventListeners = () => {
  for (let friendWindow of friendChatWindows) {
    const conversationId = friendWindow.getAttribute("data-mongo-id");
    let chatNameElement;
    for (let child of friendWindow.childNodes) {
      if (child.className === "chatName") {
        chatNameElement = child;
        break;
      } 
    }
    const chatName = chatNameElement.textContent;
    friendWindow.addEventListener("click", () => loadChat(conversationId, chatName, "friend"));
  }
}

const attachCommunityChatEventListeners = () => {
  const communityChatWindows = document.getElementsByClassName("communityChatWindow");
  for (let communityWindow of communityChatWindows) {
    const communityId = communityWindow.getAttribute("data-mongo-id");
    let chatNameElement;
    for (let child of communityWindow.childNodes) {
      if (child.className === "chatName") {
        chatNameElement = child;
        break;
      } 
    }
    const chatName = chatNameElement.textContent;
    communityWindow.addEventListener("click", () => loadChat(communityId, chatName, "community"));
  }

}

const setupSocketEventListeners = (socket) => {
  const currentlyOnlineDiv = document.getElementById("currentlyOnline");
  socket.on("users", (onlineUsers) => {
    const allChatsObject = JSON.parse(window.localStorage.getItem("allChats"));
    onlineUsers.forEach(user => {
      allChatsObject.username.chatSocketId = user.userID;
      const onlineUserHTML = createOnlineUserHTML(user.username);
      currentlyOnlineDiv.appendChild(onlineUserHTML);
    })
    window.localStorage.setItem("allChats", JSON.stringify(allChatsObject));
  });

  socket.on("user connected", user => {
    const username = user.username;
    const allChatsObject = JSON.parse(window.localStorage.getItem("allChats"));
    allChatsObject.username.chatSocketId = user.userID;
    window.localStorage.setItem("allChats", JSON.stringify(allChatsObject));
    const onlineUserHTML = createOnlineUserHTML(username);
    currentlyOnlineDiv.appendChild(onlineUserHTML);
  })

  socket.on("private message", ({ content, from}) => {
    console.log("event handler entered")
    console.log("from ", from);
    const currentChatName = window.localStorage.getItem("currentChatName");
    const fromChatObject = findChatObjectBySocketId(from);
    // message received from currently opened chat, display message
    if (fromChatObject.chatName === currentChatName) {
      message = {
        content,
        timeSent: new Date()
      }
      const messageHTML = createMessageHTML(message);
      const allMessagesContainer = document.getElementById("allMessagesContainer");
      allMessagesContainer.appendChild(messageHTML)
    }
    // message received from one of unopened chats in sidebar, show unread message notification
    else {
        const unreadMessagesSpan = document.getElementById("unreadMessageCount");
        let unreadMessageCount = unreadMessagesSpan.textContent;
        unreadMessageCount = parseInt(unreadMessageCount);
        unreadMessageCount++;
        unreadMessagesSpan.textContent = unreadMessageCount;
    }
  })

  socket.onAny((event, ...args) => {
    console.log(event, args);
  });

}

// adjust height of text area based on amount of text
function adjustHeightOnInput() {
  const width = this.offsetWidth;
  const charsPerLine = width / 9.75;
  const charCount = this.value.length;
  const lineCount = Math.ceil(charCount / charsPerLine);
  if (charCount === 0) {
    lineCount = 1;
  }
  const properHeight = lineCount * 32;
  this.style.height = properHeight + "px"; 
}

// get (non-real-time) messages from server and display them 
// chatType is either "community" or "friend"
const loadChat = async (chatMongoId, chatName, chatType) => {
  const allMessagesContainer = document.getElementById("allMessagesContainer");
  allMessagesContainer.textContent = "";
  const chatTitle = document.getElementById("chatTitle");
  chatTitle.textContent = chatName;
  window.localStorage.setItem("currentChat", chatName);
  const messages = await fetchChatMessages(chatMongoId, chatType);
  displayChatMessages(messages, currentUsername);
}

// display messages in main window
const displayChatMessages = (messages, currentUsername) => {
  const allMessagesContainer = document.getElementById("allMessagesContainer");
  messages = messages.sort((a, b) => a.timeSent - b.timeSent);
  messages.forEach(message => {
    const isTo = currentUsername === message.author.username;
    const messageHTML = createMessageHTML(message, isTo);
    allMessagesContainer.appendChild(messageHTML);
  })
}

// get (non-real-tine) messages from server
const fetchChatMessages = async (chatMongoId, chatType) => {
  let url;
  if (chatType === "friend") {
    url = `/friend_messages/${chatMongoId}`;
  } 
  else if (chatType === "community") {
    url = `/community_messages/${communityId}`;
  }

  const response = await fetch(url);
  const jsonResponse = await response.json();
  return jsonResponse.messages;
}

// chatType is either "community" or "friend"
// isTo is boolean, if it's true, then the message was sent by currently logged in user,
// else it was sent from someone else (this determines placement of message on screen)
const createMessageHTML = (message, isTo) => {
  const messageSection = document.createElement("div");
  messageSection.classList.add("msgSection");
  if (isTo) messageSection.classList.add("to") 
  else messageSection.classList.add("from");

  const messageContainer = document.createElement("div");
  messageContainer.classList.add("message");

  const messageContent = document.createElement("div");
  messageContent.classList.add("messageContent");
  messageContent.textContent = message.content;

  const messageMeta = document.createElement("div");

  const timeSent = new Date(message.timeSent);
  const shownTime = timeSent.getHours() + ":" + timeSent.getMinutes();

  messageMeta.classList.add("messageMeta");
  messageMeta.textContent = shownTime;

  messageContainer.appendChild(messageContent);
  messageContainer.appendChild(messageMeta);
  messageSection.appendChild(messageContainer);

  return messageSection;
}

// sendMessage does everything to do with sending message - posting to server, emitting to socket, displaying sent message,
// it is the 'wrapper' which calls the helper functions for sending message
const sendMessage = (socket) => {
  const messageInputField = document.getElementById("messageInputField");
  const messageContent = messageInputField.value;
  const id = window.localStorage.getItem("currentChatId");
  const currentChatType = window.localStorage.getItem("currentChatType");
  postMessageToServer(id, messageContent, currentChatType)
  displaySentMessage(messageContent);
  const currentChatName = window.localStorage.getItem("currentChatName");
  const currentChatSocketId = window.localStorage.getItem(`socketID-${currentChatName}`);
  socket.emit("private message", {
    content: messageContent,
    to: currentChatSocketId
  })
}

const postMessageToServer = async (chatMongoId, messageContent, chatType) => {
  const payload = {
    id: chatMongoId,
    content: messageContent
  }
  let url;
  if (chatType === "community") {
    url = "/community_messages";
  }
  else if (chatType === "friend") {
    url = "/friend_messages";
  }
  fetch(url, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

const displaySentMessage = (messageContent) => {
  console.log("displaySentMessage");
  const message = {
    content: messageContent,
    timeSent: new Date()
  }
  const messageHTML = createMessageHTML(message, true);
  const allMessagesContainer = document.getElementById("allMessagesContainer");
  allMessagesContainer.appendChild(messageHTML)
}

const createOnlineUserHTML = (username) => {
  const onlineUserContainer = document.createElement("div");
  onlineUserContainer.classList.add("onlineUserContainer");
  const onlineUsername = document.createElement("span");
  onlineUsername.classList.add("onlineUsername");
  onlineUsername.textContent = username;
  if (username === window.localStorage.getItem("username")) onlineUsername.textContent += " (yourself)";
  const onlineDot = document.createElement("span");
  onlineDot.classList.add("onlineDot");
  onlineUserContainer.appendChild(onlineUsername);
  onlineUserContainer.appendChild(onlineDot);
  return onlineUserContainer;
}

// put info about all user's chat in localStorage
const storeAllChatInfo = async () => {
  const response = await fetch("/all_user_chats");
  const jsonResponse = await response.json();
  const allChatsObject = jsonResponse.reduce((allChatsObject, chatObject) => {
    const chatName = chatObject.chatName;
    allChatsObject.chatName = chatObject;
    return allChatsObject;
  }, {})
  window.localStorage.setItem("allChats". JSON.stringify(allChatsObject));
}

const findChatObjectBySocketId = (socketId) => {
  const allChatsObject = JSON.parse(window.localStorage.getItem("allChats"));
  for (let chatObject of Object.values(allChatsObject)) {
    if (chatObject.chatSocketId === socketId) return chatObject;
  }
}


window.addEventListener("DOMContentLoaded", main);