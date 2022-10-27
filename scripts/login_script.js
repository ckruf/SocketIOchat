function main() {
  const loginBtn = document.getElementById("loginBtn");
  const usernameInputField = document.getElementById("usernameInput");
  loginBtn.addEventListener("click", () => {
    const username = usernameInputField.value;
    window.localStorage.setItem("currentUsername", username);
  })
}

window.addEventListener("DOMContentLoaded", main);