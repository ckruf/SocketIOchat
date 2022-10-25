function main() {

  const currentUsername = window.localStorage.getItem("username");
  
  const messageTextarea = document.getElementById("messageInputField");
  messageTextarea.addEventListener("input", adjustHeightOnInput);
  
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
    communityWindow.addEventListener("click", () => loadCommunityChat(communityId, currentUsername, chatName));
  }

  const friendChatWindows = document.getElementsByClassName("friendChatWindow");


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
    friendWindow.addEventListener("click", () => loadFriendChat(conversationId, currentUsername, chatName));
  }

  const sendBtn = document.getElementById("sendBtn");
  sendBtn.addEventListener("click", sendMessage);
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

// get community chat messages from sever and display them
const loadCommunityChat = async (communityId, currentUsername, chatName) => {
  const allMessagesContainer = document.getElementById("allMessagesContainer");
  allMessagesContainer.textContent = "";
  const chatTitle = document.getElementById("chatTitle");
  chatTitle.textContent = chatName;
  window.localStorage.setItem("currentChatType", "community");
  window.localStorage.setItem("currentChatId", communityId);
  console.log(`loadCommunityChat, communityId=${communityId}, currentUsername=${currentUsername}`);
  const messages = await fetchCommunityChatMessages(communityId);
  console.log("messages: ", messages);
  displayChatMessages(messages, currentUsername);
}

// get friend chat messages from server and display them
const loadFriendChat = async (conversationId, currentUsername, chatName) => {
  const allMessagesContainer = document.getElementById("allMessagesContainer");
  allMessagesContainer.textContent = "";
  const chatTitle = document.getElementById("chatTitle");
  chatTitle.textContent = chatName;
  window.localStorage.setItem("currentChatType", "friend");
  window.localStorage.setItem("currentChatId", conversationId);
  console.log(`loadFriendChat, conversationId=${conversationId}, currentUsername=${currentUsername}`);
  const messages = await fetchFriendChatMessages(conversationId);
  console.log("messages ", messages);
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

//  get friend messages from server
const fetchFriendChatMessages = async (conversationId) => {
  const response = await fetch(`/friend_messages/${conversationId}`);
  console.log("response ", response)
  const json_response = await response.json();
  console.log("json_response", json_response);
  return json_response.messages;
}

// get community messages from server
const fetchCommunityChatMessages = async (communityId) => {
  const response = await fetch(`/community_messages/${communityId}`);
  const json_response = await response.json();
  return json_response.messages;
}

// chatType is either "community" or "friend"
// isTo is boolean, if it's true, then the message was sent by currently logged in user,
// else it was sent from someone else (this determines placement of message on screen)
const createMessageHTML = (message, isTo) => {
  console.log(`createMessageHTML, message=${JSON.stringify(message)}, isTo=${isTo}`);
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

  console.log("createMessageHTML return value ", messageSection);

  return messageSection;
}

const sendMessage = () => {
  console.log("sendMessage")
  const messageInputField = document.getElementById("messageInputField");
  const messageContent = messageInputField.value;
  console.log("messageContent", messageContent)
  const id = window.localStorage.getItem("currentChatId");
  console.log("id ", id)
  const currentChatType = window.localStorage.getItem("currentChatType");
  console.log("currentChatType", currentChatType)
  if (currentChatType === "community") {
    postCommunityMessage(id, messageContent)
  } else {
    postFriendMessage(id, messageContent);
  }
  displaySentMessage(messageContent);
}

const postCommunityMessage = async (communityId, messageContent) => {
  console.log("postCommunityMessage");
  const payload = {
    id: communityId,
    content: messageContent
  }

  const response = await fetch("/community_messages", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json'
    }
  })
  console.log(response.json().then());
}

const postFriendMessage = async (conversationId, messageContent) => {
  console.log("postFriendMessage");
  const payload = {
    id: conversationId,
    content: messageContent
  }

  const response = await fetch("/friend_messages", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json'
    }
  })
  console.log(response.json().then());
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


window.addEventListener("DOMContentLoaded", main);