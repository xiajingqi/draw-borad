;(function () {
  //变量声明
  var mouseFrom = {},
    mouseTo = {},
    drawType = null,
    canvasObjectIndex = 0,
    textbox = null
  var drawWidth = 2 //笔触宽度
  var color = "#E34F51" //画笔颜色
  var drawingObject = null //当前绘制对象
  var moveCount = 1 //绘制移动计数器
  var doDrawing = false // 绘制状态
  var fabricHistoryJson = []
  var mods = 0
  var replayllist = []

  //初始化画板
  var canvas = new fabric.Canvas("c", {
    isDrawingMode: true,
  })
  var canvas1 = new fabric.Canvas("re", {})
  window.canvas = canvas
  window.zoom = window.zoom ? window.zoom : 1
  canvas.freeDrawingBrush.color = color //设置自由绘颜色
  canvas.freeDrawingBrush.width = drawWidth

  //绑定画板事件
  canvas.on("mouse:down", function (options) {
    if (!options.pointer.x) {
      var xy = transformMouse(options.e.offsetX, options.e.offsetY)
    } else {
      var xy = transformMouse(options.pointer.x, options.pointer.y)
    }
    mouseFrom.x = xy.x
    mouseFrom.y = xy.y
    doDrawing = true
  })
  canvas.on("mouse:up", function (options) {
    if (!options.pointer.x) {
      var xy = transformMouse(options.e.offsetX, options.e.offsetY)
    } else {
      var xy = transformMouse(options.pointer.x, options.pointer.y)
    }
    mouseTo.x = xy.x
    mouseTo.y = xy.y
    // drawing();
    // replayllist.push(canvas.toJSON())
    socket.emit("startConnect1", canvas.toJSON())
    drawingObject = null
    moveCount = 1
    doDrawing = false
    updateModifications(true)
  })
  canvas.on("mouse:move", function (options) {
    if (moveCount % 2 && !doDrawing) {
      //减少绘制频率
      return
    }
    moveCount++
    if (!options.pointer.x) {
      var xy = transformMouse(options.e.offsetX, options.e.offsetY)
    } else {
      var xy = transformMouse(options.pointer.x, options.pointer.y)
    }
    mouseTo.x = xy.x
    mouseTo.y = xy.y
    var dataTo = {
      drawType: drawType,
      mouseFromX: mouseFrom.x,
      mouseFromY: mouseFrom.y,
      mouseToX: mouseTo.x,
      mouseToY: mouseTo.y,
    }
    // socket.emit("startConnect", dataTo)
    drawing()
    socket.emit("startConnect1", canvas.toJSON())
  })
  canvas.on("selection:created", function (e) {
    // if (e.target._objects) {
    //   //多选删除
    //   var etCount = e.target._objects.length
    //   for (var etindex = 0; etindex < etCount; etindex++) {
    //     canvas.remove(e.target._objects[etindex])
    //   }
    // } else {
    //   //单选删除
    //   canvas.remove(e.target)
    // }
    // canvas.discardActiveObject() //清楚选中框
  })
  // 接受画板数据
  socket.on("drawCanvas1", function (data) {
    replayllist.push(data)
    canvas.loadFromJSON(data)
  })
  //坐标转换
  function transformMouse(mouseX, mouseY) {
    return { x: mouseX / window.zoom, y: mouseY / window.zoom }
  }

  //绑定工具事件
  jQuery("#toolsul")
    .find("li")
    .on("click", function () {
      //设置样式
      jQuery("#toolsul").find("li>i") &&
        jQuery("#toolsul")
          .find("li>i")
          .each(function () {
            jQuery(this).attr("class", jQuery(this).attr("data-default"))
          })
      jQuery(this).addClass("active").siblings().removeClass("active")
      jQuery(this).find("i") &&
        jQuery(this)
          .find("i")
          .attr(
            "class",
            jQuery(this).find("i").attr("class").replace("black", "select")
          )
      drawType = jQuery(this).attr("data-type")
      canvas.isDrawingMode = false
      if (textbox) {
        //退出文本编辑状态
        textbox.exitEditing()
        textbox = null
      }
      if (drawType == "rubber") {
        console.log("rubber")
        canvas.isDrawingMode = true
        canvas.freeDrawingBrush.color = "#fff" //设置自由绘颜色
        canvas.freeDrawingBrush.width = 50
      }
      if (drawType == "next") {
        redo()
        socket.emit("startConnect1", canvas.toJSON())
      }
      if (drawType == "back") {
        undo()
        socket.emit("startConnect1", canvas.toJSON())
      }
      if (drawType == "clear") {
        canvas.clear()
        socket.emit("startConnect1", canvas.toJSON())
      } else if (drawType == "drag") {
        canvas.selection = true
        canvas.skipTargetFind = false
        canvas.selectable = true
      } else {
        canvas.skipTargetFind = true //画板元素不能被选中
        canvas.selection = false //画板不显示选中
      }
    })
  var index = 0
  var timer = null
  //回放
  $("#replay").click(function () {
    console.log(replayllist)
    canvas1.setZoom(0.5)
    if (index > replayllist.length) {
      if (timer) {
        clearInterval(timer)
      }
      return
    }
    timer = setInterval(() => {
      console.log("setInterval")
      canvas1.loadFromJSON(replayllist[index])
      index++
    }, 50)
  })
  //绘画方法
  function drawing() {
    if (drawingObject) {
      canvas.remove(drawingObject)
    }
    var canvasObject = null
    switch (drawType) {
      case "pen":
        canvas.isDrawingMode = true
        break
      case "arrow": //箭头
        canvasObject = new fabric.Path(
          drawArrow(mouseFrom.x, mouseFrom.y, mouseTo.x, mouseTo.y, 30, 30),
          {
            stroke: color,
            fill: "rgba(255,255,255,0)",
            strokeWidth: drawWidth,
          }
        )
        break
      case "line": //直线
        canvasObject = new fabric.Line(
          [mouseFrom.x, mouseFrom.y, mouseTo.x, mouseTo.y],
          {
            stroke: color,
            strokeWidth: drawWidth,
          }
        )
        break
      case "dottedline": //虚线
        canvasObject = new fabric.Line(
          [mouseFrom.x, mouseFrom.y, mouseTo.x, mouseTo.y],
          {
            strokeDashArray: [3, 1],
            stroke: color,
            strokeWidth: drawWidth,
          }
        )
        break
      case "circle": //正圆
        var left = mouseFrom.x,
          top = mouseFrom.y
        var radius =
          Math.sqrt(
            (mouseTo.x - left) * (mouseTo.x - left) +
              (mouseTo.y - top) * (mouseTo.y - top)
          ) / 2
        canvasObject = new fabric.Circle({
          left: left,
          top: top,
          stroke: color,
          fill: "rgba(255, 255, 255, 0)",
          radius: radius,
          strokeWidth: drawWidth,
        })
        break
      case "ellipse": //椭圆
        var left = mouseFrom.x,
          top = mouseFrom.y
        var radius =
          Math.sqrt(
            (mouseTo.x - left) * (mouseTo.x - left) +
              (mouseTo.y - top) * (mouseTo.y - top)
          ) / 2
        canvasObject = new fabric.Ellipse({
          left: left,
          top: top,
          stroke: color,
          fill: "rgba(255, 255, 255, 0)",
          originX: "center",
          originY: "center",
          rx: Math.abs(left - mouseTo.x),
          ry: Math.abs(top - mouseTo.y),
          strokeWidth: drawWidth,
        })
        break
      case "square": //TODO:正方形（后期完善）
        break
      case "rectangle": //长方形
        var path =
          "M " +
          mouseFrom.x +
          " " +
          mouseFrom.y +
          " L " +
          mouseTo.x +
          " " +
          mouseFrom.y +
          " L " +
          mouseTo.x +
          " " +
          mouseTo.y +
          " L " +
          mouseFrom.x +
          " " +
          mouseTo.y +
          " L " +
          mouseFrom.x +
          " " +
          mouseFrom.y +
          " z"
        canvasObject = new fabric.Path(path, {
          left: left,
          top: top,
          stroke: color,
          strokeWidth: drawWidth,
          fill: "rgba(255, 255, 255, 0)",
        })
        //也可以使用fabric.Rect
        break
      case "rightangle": //直角三角形
        var path =
          "M " +
          mouseFrom.x +
          " " +
          mouseFrom.y +
          " L " +
          mouseFrom.x +
          " " +
          mouseTo.y +
          " L " +
          mouseTo.x +
          " " +
          mouseTo.y +
          " z"
        canvasObject = new fabric.Path(path, {
          left: left,
          top: top,
          stroke: color,
          strokeWidth: drawWidth,
          fill: "rgba(255, 255, 255, 0)",
        })
        break
      case "equilateral": //等边三角形
        var height = mouseTo.y - mouseFrom.y
        canvasObject = new fabric.Triangle({
          top: mouseFrom.y,
          left: mouseFrom.x,
          width: Math.sqrt(Math.pow(height, 2) + Math.pow(height / 2.0, 2)),
          height: height,
          stroke: color,
          strokeWidth: drawWidth,
          fill: "rgba(255,255,255,0)",
        })
        break
      case "isosceles":
        break
      case "text":
        textbox = new fabric.Textbox("", {
          left: mouseFrom.x - 60,
          top: mouseFrom.y - 20,
          width: 150,
          fontSize: 18,
          borderColor: "#2c2c2c",
          fill: color,
          hasControls: false,
        })
        canvas.add(textbox)
        textbox.enterEditing()
        textbox.hiddenTextarea.focus()
        break
      case "remove":
        break
      default:
        break
    }
    if (canvasObject) {
      // canvasObject.index = getCanvasObjectIndex();
      canvas.add(canvasObject) //.setActiveObject(canvasObject)
      drawingObject = canvasObject
    }
    // replayllist.push(canvas.toJSON())
  }

  //绘制箭头方法
  function drawArrow(fromX, fromY, toX, toY, theta, headlen) {
    theta = typeof theta != "undefined" ? theta : 30
    headlen = typeof theta != "undefined" ? headlen : 10
    // 计算各角度和对应的P2,P3坐标
    var angle = (Math.atan2(fromY - toY, fromX - toX) * 180) / Math.PI,
      angle1 = ((angle + theta) * Math.PI) / 180,
      angle2 = ((angle - theta) * Math.PI) / 180,
      topX = headlen * Math.cos(angle1),
      topY = headlen * Math.sin(angle1),
      botX = headlen * Math.cos(angle2),
      botY = headlen * Math.sin(angle2)
    var arrowX = fromX - topX,
      arrowY = fromY - topY
    var path = " M " + fromX + " " + fromY
    path += " L " + toX + " " + toY
    arrowX = toX + topX
    arrowY = toY + topY
    path += " M " + arrowX + " " + arrowY
    path += " L " + toX + " " + toY
    arrowX = toX + botX
    arrowY = toY + botY
    path += " L " + arrowX + " " + arrowY
    return path
  }

  //获取画板对象的下标
  function getCanvasObjectIndex() {
    return canvasObjectIndex++
  }
  //保存历史轨迹
  function updateModifications(savehistory) {
    if (savehistory == true) {
      fabricHistoryJson.push(JSON.stringify(canvas))
    }
  }
  //后退
  function undo() {
    let state = fabricHistoryJson
    if (mods < state.length) {
      canvas.clear().renderAll()
      canvas.loadFromJSON(state[state.length - 1 - mods - 1])
      canvas.renderAll()
      mods += 1
    }
  }
  //前进
  function redo() {
    let state = fabricHistoryJson
    if (mods > 0) {
      canvas.clear().renderAll()
      canvas.loadFromJSON(state[state.length - 1 - mods + 1])
      canvas.renderAll()
      mods -= 1
    }
  }
})()
