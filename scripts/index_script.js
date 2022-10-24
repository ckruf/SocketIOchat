function main() {
  const messageTextarea = document.getElementById("messageInputField");
  messageTextarea.addEventListener("input" ,adjustHeightOnInput);
}

function adjustHeightOnInput() {
  console.log("entered")
  console.log(this.scrollHeight)
  this.style.height 
  this.style.height = (this.scrollHeight) + "px";
}

window.addEventListener("DOMContentLoaded", main);