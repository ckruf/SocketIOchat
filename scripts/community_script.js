function main() {
  const joinCommunityButtons = document.getElementsByClassName("joinButton");
  for (let joinButton of joinCommunityButtons) {
    joinButton.addEventListener("click", joinCommunityHandler);
  }
}

function joinCommunityHandler(event) {
  console.log("handler entered");
  const buttonParent = event.target.parentElement;
  const communityId = buttonParent.getAttribute("data-mongo-id");
  console.log("communityId is ", communityId);
  fetch("/join_community", {
    method: "POST",
    body: JSON.stringify({id: communityId}),
    headers: {
      'Content-Type': 'application/json'
    },
  })
  .then(response => {
    console.log(response)
    buttonParent.innerHTML = "community joined!"
  })
}

window.addEventListener("DOMContentLoaded", main);