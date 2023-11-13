const os = require('os');
const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const resizeImg = require('resize-img');

const isMac = process.platform === 'darwin';
const isDev = process.env.NODE_ENV !== 'production';

const menu = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Quit',
        click: () => app.quit(),
        accelerator: 'CmdOrCtrl+W',
      },
    ],
  },
  {
    label: 'Help',
    submenu: [
      {
        label: 'About',
        click: createAboutWindow,
      },
    ],
  },
];

let mainWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: 'Image Resizer',
    height: 600,
    width: isDev ? 1000 : 500,
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));
}

function createAboutWindow() {
  const aboutWindow = new BrowserWindow({
    width: 300,
    height: 300,
    title: 'About Image Resizer',
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
  });

  aboutWindow.loadFile(path.join(__dirname, './renderer/about.html'));
}

app.whenReady().then(() => {
  createMainWindow();

  const mainMenu = Menu.buildFromTemplate(menu);

  Menu.setApplicationMenu(mainMenu);

  mainWindow.on('closed', () => mainWindow = null);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

ipcMain.on('image:resize', (e, options) => {
  options.destination = path.join(os.homedir(), 'imageresizer');
  resizeImage(options);
});

async function resizeImage({ imgPath, height, width, destination }) {
  try {
    const newPath = await resizeImg(fs.readFileSync(imgPath), {
      width: +width,
      height: +height,
    });

    const filename = path.basename(imgPath);

    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination);
    }

    fs.writeFileSync(path.join(destination, filename), newPath);

    mainWindow.webContents.send('image:done');

    shell.openPath(destination);
  } catch (err) {
    mainWindow.webContents.send('image:failed');

    console.log(err);
  }
}
