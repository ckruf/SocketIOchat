function main() {
  const logoutSpan = document.getElementById("logoutSpan");
  logoutSpan.addEventListener("click", () => {
    document.cookie = "AuthToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    window.location.href = "/login";
  })
}

window.addEventListener("DOMContentLoaded", main);