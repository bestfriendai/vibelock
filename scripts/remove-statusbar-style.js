const fs = require("fs");
const path = require("path");
const appJsonPath = path.join(process.cwd(), "app.json");
const content = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));

function removeKey(obj, key) {
  if (Array.isArray(obj)) return obj.forEach((v) => removeKey(v, key));
  if (obj && typeof obj === "object") {
    delete obj[key];
    Object.values(obj).forEach((v) => removeKey(v, key));
  }
}

removeKey(content, "statusBarStyle");
fs.writeFileSync(appJsonPath, JSON.stringify(content, null, 2));
console.log("Removed deprecated statusBarStyle from app.json");
