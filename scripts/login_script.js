function main() {
  const loginBtn = document.getElementById("loginBtn");
  const usernameInputField = document.getElementById("usernameInput");
  loginBtn.addEventListener("click", () => {
    const username = usernameInputField.value;
    console.log("username ", username);
    window.localStorage.setItem("username", username);
  })
}

window.addEventListener("DOMContentLoaded", main);