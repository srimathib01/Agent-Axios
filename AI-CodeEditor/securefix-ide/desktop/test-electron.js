const electron = require('electron');
console.log('electron type:', typeof electron);
console.log('electron:', electron);
console.log('electron.app:', electron.app);

if (electron.app) {
  electron.app.whenReady().then(() => {
    console.log('App is ready!');
    electron.app.quit();
  });
} else {
  console.log('electron.app is undefined - electron not loaded properly');
  process.exit(1);
}
