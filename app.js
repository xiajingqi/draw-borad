var express = require("express")
var app = express()
var server = require("http").Server(app)
var io = require("socket.io")(server)
var path = require("path")
var ejs = require("ejs")

app.set("views", path.join(__dirname, "views"))
app.set("view engine", "ejs")
app.engine(".html", ejs.__express)
app.set("view engine", "html")

app.use(express.static(path.join(__dirname, "public")))

server.listen(8080)

app.get("/", function (req, res, next) {
  res.render("index")
})
app.get("/student", function (req, res, next) {
  res.render("student")
})
app.get("/replay", function (req, res, next) {
  res.render("replay")
})

io.on("connection", function (socket) {
  console.log("Server conneced!")

  socket.emit("init", { userid: Math.random() * 1000 })

  socket.on("draw", function (data) {
    socket.broadcast.emit("draw", data)
  })
  socket.on("startConnect", function (data) {
    // 数据传递方式1
    socket.broadcast.emit("drawCanvas", data)
  })
  socket.on("startConnect1", function (data) {
    // 数据传递方式2 json
    socket.broadcast.emit("drawCanvas1", data)
  })
  socket.on("config", function (data) {
    socket.broadcast.emit("config", data)
  })

  socket.on("clear", function () {
    socket.broadcast.emit("clear")
  })
})
