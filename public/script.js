const socket = io('/')  // importing socket io from script specified in room.ejs
const videoGrid = document.getElementById('video-grid');

// setting up the peer server this is possible after a peer server is listening to a port 
const myPeer = new Peer(undefined, {
  host: '/',
  port: '3001',  //the port number where peer server is listening
  config: { 
    'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }],   // a stun server
   'sdpSemantics': 'unified-plan' 
  }
});
let url;

//default names of the users
const myName='You';
var remoteUserName='Remote User';
 
const myVideo = document.createElement('video');
myVideo.muted = true   // will mute the video so we dont hear ourself

// to maintain a list of present peers in the room this will help us remove the user after he got dissconnect
const peers = {}
let myVideoStream;

//this function will help us add the video of both the users to our video grid
function addVideoStream(video, stream) {
  video.classList.add('video')
  video.srcObject = stream
  video.addEventListener('loadedmetadata', () => {
    video.play()
  })
  videoGrid.append(video);
  
}

// using navigator web api to fetch users video
navigator.mediaDevices.getUserMedia({
  video: {width: 400,height: 300},
  audio: true
}).then(stream => {
  myVideoStream=stream;
  addVideoStream(myVideo, stream);
  
  //this event is triggered when someone tries to connect to the user
  myPeer.on('call', call => {
    call.answer(stream)   // answering the call and sending our stream back
    const video = document.createElement('video');
    // receiving the stream from remote user and adding it to our video-grid element
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream)
    })
  })

//
socket.on('user-connected', (userId) => {
    setTimeout(()=>{
        connectToNewUser(userId,stream) //user when connected to the same socket room will trigger this function 
    },1000);

 })
});
socket.on('siteUrl',(siteUrl)=>{
  url=siteUrl;
});

// when user is dissconnected remove his data from peers object. 
socket.on('user-disconnected', userId => {
  if (peers[userId]) {peers[userId].close()}
})

// when the user open the site url he will emit this event and join a room 
myPeer.on('open', id => {        
   // open event is triggered when user successfully creates his peer connection now we want him to join a specific room 
  socket.emit('join-room', ROOM_ID, id);
});

// this function help us to make a call to the new user when he joines our room
function connectToNewUser(userId, stream) {

  // establishing a connection with remote user
  const call = myPeer.call(userId, stream)
  const video = document.createElement('video')
  call.on('stream', userVideoStream => {
    addVideoStream(video, userVideoStream)
  })
  call.on('close', () => {
    video.remove()
  })

  peers[userId] = call;
  
}

//this operates the copy link button 
const showCopied=()=>{
  const copied=document.getElementById('showCopied');
  copied.style.opacity=1;
  copied.style.transition="opacity 1s"
  setTimeout(()=>{
  copied.style.opacity=0;
  },[1000]);

}

// this function is used to send messages to the remote users 
const form=document.getElementById('chat_message_form');
form.addEventListener('submit',(e)=>{
  e.preventDefault();
  socket.emit('message',e.target.elements.message.value,ROOM_ID);
  addMessage(e.target.elements.message.value,myName);
  e.target.elements.message.value="";
});

socket.on('message',(message)=>{
  addMessage(message,remoteUserName);
});


// this maintain change in the name of remote user
socket.on('changeName',(name)=>{
  remoteUserName=name;
});

//when 2 persons are in the call the user is routed to this route
socket.on('cantJoin',(url)=>{
  window.location.href=`${url}/failed`;
});

//adding the message to our chat section
const addMessage=(message,name)=>{
  const msg=document.createElement('div');
  msg.innerHTML=`<p style=" color: rgba(46, 157, 248, 0.945);
  font-weight: bolder;">${name}</p><p>${message}</p>`
  msg.classList.add('chat_message');
  document.getElementById('chat_messages_container').appendChild(msg);
  var scroll = (document.getElementById('chat_messages_container'));
    scroll.scrollTop = scroll.scrollHeight;
}

//operating the microphone
const microphone=document.getElementById('microphone')
microphone.addEventListener('click',()=>{
   const enabled=myVideoStream.getAudioTracks()[0].enabled;
   if(enabled){
     myVideoStream.getAudioTracks()[0].enabled=false;
     microphone.innerHTML=`<i class="fas fa-microphone-slash" style="color:black"></i>` 
     microphone.style.backgroundColor='rgba(238, 238, 238, 0.836)';
   }
   else{
     myVideoStream.getAudioTracks()[0].enabled=true;
     microphone.innerHTML= '<i class="fas fa-microphone "></i>'
     microphone.style.backgroundColor='rgba(46, 157, 248, 0.945)'
   }
})


// enabling-disabling video sharing
const videoShare=document.getElementById('share_video');
videoShare.addEventListener('click',()=>{
  const enabled=myVideoStream.getVideoTracks()[0].enabled;
  if(enabled){
    myVideoStream.getVideoTracks()[0].enabled=false;
    videoShare.style.backgroundColor='rgba(238, 238, 238, 0.836)';
    videoShare.style.color='black';
  }
  else{
    myVideoStream.getVideoTracks()[0].enabled=true;
    videoShare.style.backgroundColor='rgba(46, 157, 248, 0.945)';
    videoShare.style.color="white";
  }
})

// leaving the call 
const leaveCall=document.getElementById('leave_call');
leaveCall.addEventListener('click',()=>{
  window.location.href = `http://localhost:3000/${ROOM_ID}/left`;
});


// copying the link of my room
const copyLink=document.getElementById('copy_link');
copyLink.addEventListener('click',()=>{
  const inp=document.createElement('input');
  inp.value='localhost:3000/'+ROOM_ID;
  document.body.appendChild(inp);
  inp.select();
  document.execCommand('copy');
  document.body.removeChild(inp);
  showCopied();
});


//chaning my name 
const menu=document.getElementById('menu');
menu.addEventListener('click',()=>{
  const name=prompt('enter your name');
  if(name!=null){
  socket.emit('changeName',ROOM_ID,name);
  }
});