const electron = require('electron');
const { ipcRenderer } = require('electron');
var ipc = require('electron').ipcRenderer;

/* Our child process listens to the 'fill-settings' channel.
*/
ipcRenderer.on('fill-settings', (event, modifier1, modifier2, modifier3, minimizeOnStartup) => {
  document.getElementById('modifier1').value = modifier1;
  document.getElementById('modifier2').value = modifier2;
  document.getElementById('modifier3').value = modifier3;
  if(minimizeOnStartup){

    document.getElementById('minimize').checked = true;

  }
});

/* When the save settings button is clicked, we send the current values to
the main process to be saved.
*/
function savesettings() {
    ipc.send('savesettings', 
        document.getElementById('modifier1').value, 
        document.getElementById('modifier2').value,
        document.getElementById('modifier3').value,
        document.getElementById('minimize').checked
    );
  }

function cancelsettings() {
  ipc.send('cancelsettings', '');
}

// Let our main process know settings.js is completely loaded
ipc.send('settingsloaddone', '');
