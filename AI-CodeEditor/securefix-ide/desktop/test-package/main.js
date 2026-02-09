console.log("process.type:", process.type);
console.log("process.versions.electron:", process.versions.electron);
const { app } = require("electron");
console.log("app:", app);
if (app) { app.whenReady().then(() => { console.log("Ready\!"); app.quit(); }); }
