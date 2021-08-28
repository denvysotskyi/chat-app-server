const express = require('express')
const config = require('config')
const cors = require('cors')
const app = require('express')()
const httpServer = require('http').createServer(app)
const io = require("socket.io")(httpServer, {
  cors: {
    origin: '*',
    allowedHeaders: ['*'],
    credentials: true
  }
})

const PORT = process.env.PORT || config.get('port') || 7878

app.use(cors())

app.use(express.json({ extended: true }))

const rooms = new Map()

app.post('/api/1.0/rooms', (req, res) => {
  try {
    const { roomId } = req.body

    if (!rooms.has(roomId)) {
      rooms.set(
        roomId,
        new Map([
        ['users', new Map()],
        ['messages', []]
      ])
      )
    }
    res.status(200).send()
  } catch (e) {
    res.status(500).json(e.message)
  }
})

const appStart = (async () => {
  try {
    io.on('connection', socket => {
      socket.on('ROOM:ENTER', data => {
        const { roomId, userName } = data.values
        socket.join(roomId)
        rooms.get(roomId).get('users').set(socket.id, userName)
        const users = [...rooms.get(roomId).get('users').values()]
        io.sockets.in(roomId).emit('USERS:GET', users)
      })
      socket.on('DATA:SEND', data => {
        const { roomId, userName, message } = data.values
        const obj = {
          roomId,
          userName,
          message
      }
        rooms.get(roomId).get('messages').push(obj)
        const messages = [...rooms.get(roomId).get('messages').values()]
        io.sockets.in(roomId).emit('MESSAGES:GET', messages)
      })
      socket.on('disconnect', () => {
        rooms.forEach((value, roomId) => {
          if (value.get('users').delete(socket.id)) {
            const users = [...value.get('users').values()]
            io.sockets.in(roomId).emit('USERS:GET', users)
          }
        })
      })
    })
    await httpServer.listen(PORT, () => console.log(`Server is started on port ${PORT}`))
  } catch (e) {
    console.log(e.message)
    process.exit(1)
  }
})()