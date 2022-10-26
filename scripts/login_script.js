function main() {
  const loginBtn = document.getElementById("loginBtn");
  const usernameInputField = document.getElementById("usernameInput");
  loginBtn.addEventListener("click", () => {
    const username = usernameInputField.value;
    const currentUser = { username };
    window.localStorage.setItem("currentUser", currentUser);
  })
}

window.addEventListener("DOMContentLoaded", main);