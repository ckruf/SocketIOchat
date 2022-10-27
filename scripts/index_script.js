/*
localStorage

{
  currentUsername: currentUsername, // string, username of signed in user
  currentChatName: currentChatName, // string, this is set when user clicks on chatWindow in sidebar
  allChats: 
    {
      chatName: {
        chatName: chatName,
        chatMongoId: chatMongoId,
        chatType: chatType, // "friend" | "community"
        isOnline: bool // if user is online, we will send chats also to websocket, otherwise only to server
      }
    } 
  // allChats is initially set with all info except chatSocketId on page load of homepage, by fetching
  // an endpoint which returns all user's friends and communities. chatSocketId is then populated
  // initially on the "users" event, which will populate it for friends who are online at that time
  // (ie when the user connects to socketIO on page load). chatSocketIds are then added whenever
  // a new friend goes online, using the "user connected" event 
}

*/

async function main() {
  await storeAllChatInfo();

  window.localStorage.removeItem("currentChatName");
  // window.localStorage.setItem("currentUserShownOnline", JSON.stringify(false));
  const currentUsername = window.localStorage.getItem("currentUsername");

  const socket = io("http://localhost:3000", {autoConnect: false});
  socket.auth = { username: currentUsername };
  socket.connect();
  setupSocketEventListeners(socket);

  const messageTextarea = document.getElementById("messageInputField");
  messageTextarea.addEventListener("input", adjustHeightOnInput);
  attachChatWindowsEventListener();
  const sendBtn = document.getElementById("sendBtn");
  sendBtn.addEventListener("click", () => sendMessage(socket));
}

const attachChatWindowsEventListener = () => {
  const chatWindows = document.getElementsByClassName("chatWindow");
  for (let chatWindow of chatWindows) {
    const chatName = chatWindow.getAttribute("data-chat-name");
    chatWindow.addEventListener("click", () => loadChat(chatName));
  }
}

const setupSocketEventListeners = (socket) => {
  const currentlyOnlineDiv = document.getElementById("currentlyOnline");

  socket.on("users", (onlineUsernames) => {
    const offlineMsg = document.querySelector("#offlineMsg"); 
    if (offlineMsg) {
      offlineMsg.remove();
    }
    const allChatsObject = JSON.parse(window.localStorage.getItem("allChats"));
    const currentUsername = window.localStorage.getItem("currentUsername");
    onlineUsernames.forEach(username => {
      if (username !== currentUsername) {
        const chatObject = allChatsObject[username];
        // prevents duplication in "currently online" section, because this event could be fired
        // more than on first page load (if connection to server is lost and then gained again)
        if (chatObject.isOnline) return;
        chatObject.isOnline = true;
      } 
      else {
          const currentUserDisplayed = JSON.parse(sessionStorage.getItem("currentUserDisplayed"));
          if (currentUserDisplayed) return;
          sessionStorage.setItem("currentUserDisplayed", JSON.stringify(true));
      }
      const onlineUserHTML = createOnlineUserHTML(username);
      currentlyOnlineDiv.appendChild(onlineUserHTML);
    })
    window.localStorage.setItem("allChats", JSON.stringify(allChatsObject));
  });

  socket.on("user connected", username => {
    const currentUsername = window.localStorage.getItem("currentUsername");
    if (username !== currentUsername) {
      const allChatsObject = JSON.parse(window.localStorage.getItem("allChats"));
      const chatObject = allChatsObject[username];
      if (!chatObject.isOnline) {
        chatObject.isOnline = true;
        const onlineUserHTML = createOnlineUserHTML(username);
        currentlyOnlineDiv.appendChild(onlineUserHTML);
        window.localStorage.setItem("allChats", JSON.stringify(allChatsObject));
      }
    }
  })

  socket.on("private message", ({ content, from, to}) => {
    const currentUsername = window.localStorage.getItem("currentUsername");
    const currentChatName = window.localStorage.getItem("currentChatName");
    // message belongs to currently opened chat, could be either from other party, or from myself in different tab
    if (from === currentChatName || to === currentChatName) {
      message = {
        content,
        timeSent: new Date()
      }
      const messageHTML = createMessageHTML(message, to === currentChatName);
      const allMessagesContainer = document.getElementById("allMessagesContainer");
      allMessagesContainer.appendChild(messageHTML)
    }
    // message belongs to one of (currently unopened) chats in the sidebar, could be either from other party,
    // or from myself in different tab
    else {
      let chatWindowName;

      to === currentUsername
      ? chatWindowName = from
      : chatWindowName = to;

      const chatWindow = document.getElementById(`chatWindow${chatWindowName}`);
      const chatPreview = chatWindow.querySelector(".chatPreview");
      chatPreview.textContent = content;

      // message sent by other party, show notification
      if (to === currentUsername) {
        const topRow = chatWindow.querySelector(".chatTopRow");
        if (!topRow.querySelector(".notificationSpan")) {
          const notificationSpan = document.createElement("span");
          notificationSpan.classList.add("notificationSpan");
          topRow.appendChild(notificationSpan);
        }
      }
    }
  });

  socket.on("disconnect", reason => {
    console.log("disconnected");
    console.log(reason);

    const currentlyOnline = document.getElementById("currentlyOnline");
    currentlyOnline.textContent = "";
    const offlineMessage = document.createElement("p");
    offlineMessage.id = "offlineMsg";
    offlineMessage.textContent = "You are offline";
    currentlyOnline.appendChild(offlineMessage);

    // mark all chats as offline
    const allChatsObject = JSON.parse(window.localStorage.getItem("allChats"));
    const chats = Object.values(allChatsObject);
    chats.forEach(chat => {
      chat.isOnline = false;
    });
    window.localStorage.setItem("allChats", JSON.stringify(allChatsObject));
    console.log(window.localStorage);
    sessionStorage.setItem("currentUserDisplayed", JSON.stringify(false));
  })

  socket.onAny((event, ...args) => {
    console.log(event, args);
  });

}

// adjust height of text area based on amount of text
// not arrow function, because we need 'this'
function adjustHeightOnInput() {
  const width = this.offsetWidth;
  const charsPerLine = width / 9.75;
  let charCount;
  if (this.value) {
    charCount = this.value.length;
  } else {
    charCount = 0;
  }
  let lineCount = Math.ceil(charCount / charsPerLine);
  if (charCount === 0) {
    lineCount = 1;
  }
  const properHeight = lineCount * 32;
  this.style.height = properHeight + "px"; 
}

// get (non-real-time) messages from server and display them 
// chatType is either "community" or "friend"
const loadChat = async (chatName) => {
  const allMessagesContainer = document.getElementById("allMessagesContainer");
  allMessagesContainer.textContent = "";
  const chatTitle = document.getElementById("chatTitle");
  chatTitle.textContent = chatName;
  window.localStorage.setItem("currentChatName", chatName);
  const messages = await fetchChatMessages(chatName);
  displayChatMessages(messages);
  const chatWindow = document.getElementById(`chatWindow${chatName}`);
  const topRow = chatWindow.querySelector(".chatTopRow");
  const notificationSpan = topRow.querySelector(".notificationSpan");
  if (notificationSpan) {
    notificationSpan.remove();
  }

}

// display messages in main window
const displayChatMessages = (messages) => {
  const currentUsername = window.localStorage.getItem("currentUsername");
  const allMessagesContainer = document.getElementById("allMessagesContainer");
  messages = messages.sort((a, b) => a.timeSent - b.timeSent);
  messages.forEach(message => {
    const isTo = currentUsername === message.author.username;
    const messageHTML = createMessageHTML(message, isTo);
    allMessagesContainer.appendChild(messageHTML);
  })
}

// get (non-real-tine) messages from server
const fetchChatMessages = async (chatName) => {
  const allChatsObject = JSON.parse(window.localStorage.getItem("allChats"));
  const chatObject = allChatsObject[chatName];
  const chatType = chatObject.chatType;
  const chatMongoId = chatObject.chatMongoId;
  const url = `/${chatType}_messages/${chatMongoId}`;
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
  messageInputField.value = "";
  const currentChatName = window.localStorage.getItem("currentChatName");
  postMessageToServer(currentChatName, messageContent);
  displaySentMessage(messageContent);
  
  const allChatsObject = JSON.parse(window.localStorage.getItem("allChats"));
  const currentChatObject = allChatsObject[currentChatName];
  if (currentChatObject.isOnline) {
    socket.emit("private message", {
      content: messageContent,
      to: currentChatName
    });
  }
}

const postMessageToServer = async (chatName, messageContent) => {
  const allChatsObject = JSON.parse(window.localStorage.getItem("allChats"));
  const chatObject = allChatsObject[chatName];
  const chatMongoId = chatObject.chatMongoId;
  const chatType = chatObject.chatType;

  const payload = {
    id: chatMongoId,
    content: messageContent
  }
  
  const url = `/${chatType}_messages`

  fetch(url, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

const displaySentMessage = (messageContent) => {
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
    chatObject.isOnline = false;
    allChatsObject[chatName] = chatObject;
    return allChatsObject;
  }, {})
  window.localStorage.setItem("allChats", JSON.stringify(allChatsObject));
}

const findChatObjectBySocketId = (socketId) => {
  const allChatsObject = JSON.parse(window.localStorage.getItem("allChats"));
  for (let chatObject of Object.values(allChatsObject)) {
    if (chatObject.chatSocketId === socketId) return chatObject;
  }
}


window.addEventListener("DOMContentLoaded", main);