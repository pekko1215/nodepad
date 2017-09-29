const electron = require('electron');
const { app } = electron;
const { BrowserWindow } = electron;
const { Menu } = electron;

const {dialog} = electron;

let win;

function createWindow() {
    win = new BrowserWindow({
        width: 800,
        height: 600,
        icon: __dirname + '/icon.ico',
        show:false
    });
    win.once('ready-to-show', () => { win.show(); });
    win.loadURL(`file://${__dirname}/index.html`);
    win.on('closed', () => { win = null; });
    win.webContents.openDevTools()

}
app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (win === null) createWindow();
});