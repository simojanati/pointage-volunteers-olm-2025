function getRole(){
  return localStorage.getItem("role") || "";
}
function isAuthed(){
  return !!localStorage.getItem("sessionToken");
}
function requireAdmin(){
  if(!isAuthed()) location.href = "./index.html";
}
function requireSuperAdmin(){
  if(!isAuthed()) location.href = "./index.html";
  const role = getRole();
  if(role !== "SUPER_ADMIN") location.href = "./admin.html";
}
function logout(){
  localStorage.removeItem("sessionToken");
  localStorage.removeItem("role");
  localStorage.removeItem("username");
  localStorage.removeItem("nomComplet");
  location.href = "./index.html";
}
