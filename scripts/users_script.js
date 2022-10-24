function main() {
  const addFriendButtons = document.getElementsByClassName("addButton");
  for (let addButton of addFriendButtons) {
    addButton.addEventListener("click", addFriendHandler);
  }
}

function addFriendHandler(event) {
  console.log("handler entered");
  const buttonParent = event.target.parentElement;
  const friendId = buttonParent.getAttribute("data-mongo-id");
  console.log("friendId is ", friendId);
  fetch("/add_friend", {
    method: "POST",
    body: JSON.stringify({id: friendId}),
    headers: {
      'Content-Type': 'application/json'
    },
  })
  .then(response => {
    console.log(response)
    buttonParent.innerHTML = "friend added!"
  })
}

window.addEventListener("DOMContentLoaded", main);