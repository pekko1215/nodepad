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
        icon: __dirname + '/icon.ico'
    });
    win.loadURL(`file://${__dirname}/index.html`);
    win.on('closed', () => { win = null; });
    win.webContents.openDevTools()
    var menu = [{
            label: "ファイル(F)",
            submenu: [
                { label: "新規" }
            ]
        },
        {
            label: "編集(E)",
            submenu: [
                { label: "元に戻す" }
            ]
        }, {
            label: "書式(O)",
            submenu: [
                { label: "右側で折り返す" }
            ]
        }, {
            label: "表示(V)",
            submenu: [
                { label: "ステータス バー" }
            ]
        }, {
            label: "ヘルプ(H)",
            submenu: [
                { label: "ヘルプの表示" }
            ]
        }
    ]
    Menu.setApplicationMenu(Menu.buildFromTemplate(menu))

}
app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (win === null) createWindow();
});