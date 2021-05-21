// Requirements
const {
  app,
  globalShortcut,
  BrowserWindow,
  Menu,
  Tray,
} = require('electron');
const path = require('path');
const cp = require('child_process');
var ipc = require('electron').ipcMain;
const storage = require('electron-json-storage');

// Child process execute options
const exec_options = {
  cwd: null,
  env: null,
  encoding: 'utf8',
  timeout: 0,
  maxBuffer: 200 * 1024,
  killSignal: 'SIGTERM',
};

// Global variables
let win;
let settingswin = null;
var helpers = ['', '', '', '', '', '', '', '', '', '', ''];
var modifiers = ['Alt', 'Shift', ''];
const isMac = process.platform === 'darwin';
const isWin = process.platform === "win32";
var windowHeight = 720;
let tray = null;
let isQuiting;

// Template used for creating a menu
const menuTemplate = [
  // { role: 'appMenu' }
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideothers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
          ],
        },
      ]
    : []),
  // { role: 'fileMenu' }
  {
    label: 'File',
    submenu: [isMac ? { role: 'close' } : { role: 'quit' }],
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
    ],
  },
];

// Set the application menu
const menu = Menu.buildFromTemplate(menuTemplate);
Menu.setApplicationMenu(menu);

// Our app methods
app.on('ready', () => {

  tray = new Tray(path.join(__dirname, '/assets/icons/tray.png'));

  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: 'Show', click: function () {
        win.show();
      }
    },
    {
      label: 'Quit', click: function () {
        isQuiting = true;
        app.quit();
      }
    }
  ]));

  tray.on('right-click', () => {
    tray.popUpContextMenu();
  })

  tray.setToolTip('FreeTouchDeck-Helper');

  tray.on('click', () => {
    if(isWin){
      win.show();
    }
    
   });

});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {

  isQuiting = true;

});

// Our IPC methods
ipc.on('did-finish-load', function (event) {
  storage.has('settings', function (error, hasKey) {
    if (!hasKey) {
      //console.log('Settings non-existant, creating new.');
      storage.set(
        'settings',
        {
          modifier1: modifiers[0],
          modifier2: modifiers[1],
          modifier3: modifiers[2],
        },
        function (error) {}
      );
      createShortcuts();
      helpersare = `Helpers listen to `;
      for (const value in modifiers) {
        if (modifiers[value] !== '') {
          helpersare += `${modifiers[value]} + `;
        }
      }
      helpersare += `F1 - F11`;
      win.webContents.send('update-helpershortcut', helpersare);
    } else {
      storage.get('settings', function (error, data) {
        modifiers = [];
        var helpersare = 'Helpers listen to';
        for (const [key, value] of Object.entries(data)) {
          modifiers.push(value);
          if (value !== '') {
            helpersare += ` ${value} +`;
          }
        }
        createShortcuts();
        helpersare += ` F1 - F11`;
        win.webContents.send('update-helpershortcut', helpersare);
      });
    }
  });

  fillHelpers();
});

ipc.on('opensettings', function (event) {

  if(settingswin == null){
    createSettingsWindow();
  }
  
});

ipc.on('settingsloaddone', function (event) {
  settingswin.webContents.send(
    'fill-settings',
    modifiers[0],
    modifiers[1],
    modifiers[2]
  );
});

ipc.on('savesettings', function (event, modifier1, modifier2, modifier3) {
  storage.set(
    'settings',
    {
      modifier1: modifier1,
      modifier2: modifier2,
      modifier3: modifier3,
    },
    function (error) {}
  );
  globalShortcut.unregisterAll();
  modifiers = [modifier1, modifier2, modifier3];
  createShortcuts();
  settingswin.close();

  helpersare = `Helpers listen to `;
  for (const value in modifiers) {
    if (modifiers[value] !== '') {
      helpersare += `${modifiers[value]} + `;
    }
  }
  helpersare += `F1 - F11`;
  win.webContents.send('update-helpershortcut', helpersare);
});

ipc.on('cancelsettings', function (event) {
  settingswin.close();
});

ipc.on('change-helper', function (event, index, key, value) {
  helpers[index] = value;
  saveHelpers();
});

// Our custom functions
function fillHelpers() {
  storage.has('helpers', function (error, hasKey) {
    if (!hasKey) {
      //console.log('Helpers non-existant, creating new.');
      storage.set(
        'helpers',
        {
          helper1: '',
          helper2: '',
          helper3: '',
          helper4: '',
          helper5: '',
          helper6: '',
          helper7: '',
          helper8: '',
          helper9: '',
          helper10: '',
          helper11: '',
        },
        function (error) {}
      );
    } else {
      storage.get('helpers', function (error, data) {
        helpers = [];
        for (const [key, value] of Object.entries(data)) {
          helpers.push(value);
          win.webContents.send('update-helper', key, value);
        }
      });
    }
  });
}

function saveHelpers() {
  storage.set(
    'helpers',
    {
      helper1: helpers[0],
      helper2: helpers[1],
      helper3: helpers[2],
      helper4: helpers[3],
      helper5: helpers[4],
      helper6: helpers[5],
      helper7: helpers[6],
      helper8: helpers[7],
      helper9: helpers[8],
      helper10: helpers[9],
      helper11: helpers[10],
    },
    function (error) {}
  );
}

function cpexecute(helper, data) {
  if (data === '') {
    win.webContents.send('output-return', 'Nothing, because command can not be empty.');
    return;
  }

  cp.exec(data, exec_options, (err, stdout, stderr) => {
    if (err) {
      win.webContents.send('output-return', stderr);
      //console.log(stderr);
      return;
    }
    win.webContents.send('output-return', stdout);
    win.webContents.send('update-history', helper, data);
    //console.log(stdout);
  });
}

function createShortcuts() {
  var shortcut = modifiers[0] + `+` + modifiers[1] + `+` + modifiers[2] + `+` + 'F1';
  globalShortcut.register(shortcut, () => {
    cpexecute('Helper 1', helpers[0]);
  });

  var shortcut = modifiers[0] + `+` + modifiers[1] + `+` + modifiers[2] + `+` + 'F2';
  globalShortcut.register(shortcut, () => {
    cpexecute('Helper 2', helpers[1]);
  });

  var shortcut = modifiers[0] + `+` + modifiers[1] + `+` + modifiers[2] + `+` + 'F3';
  globalShortcut.register(shortcut, () => {
    cpexecute('Helper 3', helpers[2]);
  });

  var shortcut = modifiers[0] + `+` + modifiers[1] + `+` + modifiers[2] + `+` + 'F4';
  globalShortcut.register(shortcut, () => {
    cpexecute('Helper 4', helpers[3]);
  });

  var shortcut = modifiers[0] + `+` + modifiers[1] + `+` + modifiers[2] + `+` + 'F5';
  globalShortcut.register(shortcut, () => {
    cpexecute('Helper 5', helpers[4]);
  });

  var shortcut = modifiers[0] + `+` + modifiers[1] + `+` + modifiers[2] + `+` + 'F6';
  globalShortcut.register(shortcut, () => {
    cpexecute('Helper 6', helpers[5]);
  });

  var shortcut = modifiers[0] + `+` + modifiers[1] + `+` + modifiers[2] + `+` + 'F7';
  globalShortcut.register(shortcut, () => {
    cpexecute('Helper 7', helpers[6]);
  });

  var shortcut = modifiers[0] + `+` + modifiers[1] + `+` + modifiers[2] + `+` + 'F8';
  globalShortcut.register(shortcut, () => {
    cpexecute('Helper 8', helpers[7]);
  });

  var shortcut = modifiers[0] + `+` + modifiers[1] + `+` + modifiers[2] + `+` + 'F9';
  globalShortcut.register(shortcut, () => {
    cpexecute('Helper 9', helpers[8]);
  });

  var shortcut = modifiers[0] + `+` + modifiers[1] + `+` + modifiers[2] + `+` + 'F10';
  globalShortcut.register(shortcut, () => {
    cpexecute('Helper 10', helpers[9]);
  });

  var shortcut = modifiers[0] + `+` + modifiers[1] + `+` + modifiers[2] + `+` + 'F11';
  globalShortcut.register(shortcut, () => {
    cpexecute('Helper 11', helpers[10]);
  });
}

function createWindow() {

  /* Windows creates the BrowserWindow a bit differently, so we make it a bit bigger
     to get rid of the vertical scrollbar.
  */
  if (isWin){
    windowHeight = 740;
  }

  win = new BrowserWindow({
    useContentSize: true,
    resizable: false,
    width: 1280,
    height: windowHeight,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
    },
    icon: path.join(__dirname, 'assets/icons/linux/icon.png'),
  });
  win.loadFile('src/index.html');

  win.on('minimize',function(event){
    event.preventDefault();
    win.hide();
  });

  win.on('close', function (event) {
    if (!isQuiting) {
      event.preventDefault();
      win.hide();
      event.returnValue = false;
    }
});

}

function createSettingsWindow() {
  settingswin = new BrowserWindow({
    parent: win,
    useContentSize: true,
    resizable: false,
    frame: false,
    width: 550,
    height: 550,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
    },
    icon: path.join(__dirname, 'assets/icons/linux/icon.png'),
  });

  settingswin.loadFile('src/settings.html');

  settingswin.on('close', function () {
  
    // On close we clean up by set settingswin to NULL 
  settingswin = null;
  });
}
