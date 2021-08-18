const electron = require('electron');
const { ipcRenderer } = require('electron');
var ipc = require('electron').ipcRenderer;

var capturing = false;

function startcapture () {

    if(!capturing){

        ipc.send('start-capture', '');
        document.getElementById('capturebutton').innerHTML = "Stop Capture";
        document.getElementById('iscapturing').style.display = "block";
        capturing = true;

    }else{

        ipc.send('stop-capture', '');
        document.getElementById('capturebutton').innerHTML = "Start Capture";
        document.getElementById('iscapturing').style.display = "none";
        capturing = false;
        // TODO fill list of windows/apps
    }

    
}

ipcRenderer.on('fill-windows', (event, allWindows) => {

    for (var j = 1; j < 6; j++) {
        selectList = document.getElementById(`menu${j}follow`)

        // var option = document.createElement("option");
        //     option.value = 'none';
        //     option.text = ' -none- ';
        //     selectList.appendChild(option);

        for (var i = 0; i < allWindows.length; i++) {
            var option = document.createElement("option");
            option.value = allWindows[i];
            option.text = allWindows[i];
            selectList.appendChild(option);
        }
    }

  });

  ipcRenderer.on('fill-followers', (event, followers) => {

    console.log(followers)

    for(var i = 1; i < followers.length+1; i++){

        selectList = document.getElementById(`menu${i}follow`)
        var option = document.createElement("option");
        option.value = followers[i-1];
        option.text = followers[i-1];
        selectList.appendChild(option);
    }


  });

  ipcRenderer.on('fill-ports', (event, ports) => {

    selectList = document.getElementById(`ports`)

    for (var i = 0; i < ports.length; i++) {
        var option = document.createElement("option");
        option.value = ports[i];
        option.text = ports[i];
        selectList.appendChild(option);
    }

  });

  ipcRenderer.on('load-port', (event, port, start) => {

    selectList = document.getElementById(`ports`)

        var option = document.createElement("option");
        option.value = port;
        option.text = port;
        selectList.appendChild(option);

    if(start){

        document.getElementById("followstart").checked = true;
    }

  });

  function cancelfollower() {
    ipc.send('cancelfollower', '');
  }

  function savefollower() {
    ipc.send('savefollower', 

    document.getElementById('menu1follow').value, 
    document.getElementById('menu2follow').value, 
    document.getElementById('menu3follow').value, 
    document.getElementById('menu4follow').value, 
    document.getElementById('menu5follow').value,
    document.getElementById('ports').value,
    document.getElementById('followstart').checked
    
    );
  }

  function getports() {
    ipc.send('getports', '');
  }

  ipc.send('followersloaddone', '');



