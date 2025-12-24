function isAuthed(){
  return sessionStorage.getItem("pointage_authed") === "1";
}
function requireAuth(){
  if (!isAuthed()) location.href = "./index.html";
}
function logout(){
  sessionStorage.removeItem("pointage_authed");
  location.href = "./index.html";
}
