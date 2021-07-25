const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { v4: uuidV4 } = require('uuid');

var participants=0;
app.set('view engine', 'ejs')
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.redirect(`/${uuidV4()}`)
})

app.get('/:room', (req, res) => {
  res.render('room', { roomId: req.params.room })
});

app.get('/:room/left',(req,res)=>{
  res.render('left',{url: `http://localhost:3000`/*process.env.PORT*/});
});
app.get('/:room/failed',(req,res)=>{
  res.render('failed',{url:`http://localhost:3000/${req.params.room}`/*`${process.env.PORT}/${req.params.room}`*/});
})


io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => {
    participants=io.sockets.adapter.rooms[roomId];
    if(participants==undefined){participants={}}
    if(participants.length>=2)
    {
      socket.emit('cantJoin',(`http://localhost:3000/${roomId}`/*`${process.env.PORT}/${roomId}`*/));
    }
    else{
      socket.join(roomId);
      socket.to(roomId).broadcast.emit('user-connected', userId);
      socket.to(roomId).emit('siteUrl',`${process.env.PORT}/${roomId}`);
    }
    
 
   socket.on('changeName',(roomId,name)=>{
     socket.to(roomId).broadcast.emit('changeName',(name));
   })
    socket.on('disconnect', () => {
      socket.to(roomId).broadcast.emit('user-disconnected', userId)
    });
  });
  socket.on('message',(message,roomId)=>{
    socket.to(roomId).broadcast.emit('message',message);
  })
})

server.listen(process.env.PORT||3000);