var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var request = require('request');
var fs = require("fs");
var downloadImage = require('./downloadEngine')
// 同步读取消息Config
var data = fs.readFileSync('MessageConfig.json');
let templateJSONInfo = JSON.parse(data)
console.log(templateJSONInfo)

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function (req, res) {
  res.send('Hello World!');
});

// MacQQ消息接入
app.post('/qqmessage', function (req, res) {
  // console.log(req)
  // console.log(JSON.stringify(req.body));
  let fromUserID = req.body["fromUserID"]
  let toUserID = req.body["toUserID"]
  let time = req.body["time"]
  let groupCode = req.body["groupCode"]
  let nickName = req.body["nickName"]
  let messages = req.body["message"]
  //图片信息数组。可能没有
  let imageInfo = req.body["imgInfo"]
  // console.log(11111111, Object.keys(req.body))
  // if (req.body['imgInfo'] || req.body['imgInfo'].lenth > 0)
  var UIN = fromUserID
  var finalMessage = ""
  if (groupCode !== '') {
    //群消息
    UIN = groupCode
    finalMessage += '来源于群消息,群号:' + UIN + ',发消息Q号:' + fromUserID + '\n'
    isGroupChat = true
  } else {
    //个人消息
    UIN = fromUserID
    finalMessage += '来源个人消息,Q号:' + UIN + '\n'
  }
  //匹配信息中存在的需要处理的ID
  if (templateJSONInfo.hasOwnProperty(UIN)) {
    let messageInfo = templateJSONInfo[UIN]
    let toUserInfo = messageInfo["toUserID"]
    if (!toUserInfo) {
      res.sendStatus(200)
      return
    }
    let keyWordsArray = messageInfo["keyword"]
    if (!keyWordsArray) {
      res.sendStatus(200)
      return
    }
    //匹配关键词
    var isFindedKeyword = false
    messages.forEach(message => {
      //消息组,message为字典
      // if (isFindedKeyword) break
      let msgType = message["msg-type"]
      if (msgType === 0) {
        //文字消息
        keyWordsArray.forEach(keyword => {
          let messageText = message['text']
          if (messageText.indexOf(keyword) != -1) {
            //存在关键词匹配
            isFindedKeyword = true
          }
        });
      }
    });
    if (!isFindedKeyword) {
      //没有关键词匹配
      res.sendStatus(200)
      return
    }
    //有匹配关键字
    let messageArray = []
    var promiseArray = []
    for (let index = 0; index < messages.length; index++) {
      //首先提取所有图片url数组 与 文字信息数组
      let msgType = messages[index]["msg-type"]
      if (msgType == 1) {
        if (messages[index]["localPath"]) {
          var picMessagePromise = new Promise(function (resolve, reject) {
            resolve({ 'msg-type': "1", "file-path": messages[index]["localPath"], "burn": false })
          })
          promiseArray.push(picMessagePromise)
        } else if (messages[index]["url"]) {



          var picMessagePromise = new Promise(function (resolve, reject) {
            var fileName = messages[index]["md5"]
            downloadImage.downloadImage('http://c2cpicdw.qpic.cn' + messages[index]["url"], `/Users/sylar/Documents/Cache/${fileName}.jpg`, function (res, filePath) {
              resolve({ 'msg-type': "1", "file-path": filePath, "burn": false })
              setTimeout(() => {
                fs.exists(filePath, function (exists) {
                  if (exists) {
                    fs.unlinkSync(filePath)
                    console.log('已删除文件')
                  } else {
                    console.log('不存在文件')
                  }
                })
              }, 10000);
            })

          })
          promiseArray.push(picMessagePromise)
        } else {
          //如果本地没有图片或者网上图片过期，丢弃图片消息
        }
      } else {
        //其他消息直接转发
        var otherTextMessagePromise = new Promise(function (resolve, reject) {
          resolve(messages[index])
        })
        promiseArray.push(otherTextMessagePromise)
      }
      // } else if (msgType == 0) {
      //   var pureTextMessagePromise = new Promise(function (resolve, reject) {
      //     resolve({ 'msg-type': "0", "text": messages[index]["text"] })
      //   })
      //   promiseArray.push(pureTextMessagePromise)
      // }

    }
    Promise.all(promiseArray).then(function (results) {
      //返回的事消息字典数组
      let macQQServer = 'http://127.0.0.1:53777/QQ-plugin/send-message'
      for (let index = 0; index < toUserInfo.length; index++) {
        let messageToUserID = toUserInfo[index]["toUserID"]
        if (!messageToUserID) continue
        let isGroup = toUserInfo[index]["isGroup"]
        if (isGroup === undefined) continue
        //构造消息
        var sendMessageData = {}
        if (isGroup) {
          sendMessageData["groupCode"] = messageToUserID
        } else {
          sendMessageData["toUserID"] = messageToUserID
        }
        sendMessageData["messages"] = results
        request({
          url: "http://localhost:5400/sendqqmessage",
          method: "POST",
          json: true,
          headers: {
            "content-type": "application/json",
          },
          body: sendMessageData
        }, function (error, response, body) {
          if (!error && response.statusCode == 200) {
          }
        });
      }
    })
  }
  res.sendStatus(200)
})

//MacQQ消息发送
app.post('/sendqqmessage', function (req, res) {
  let macQQServer = 'http://127.0.0.1:53777/QQ-plugin/send-message'
  let toUserID = req.body["toUserID"]
  let groupCode = req.body["groupCode"]
  let messages = req.body["messages"]
  if ((toUserID != undefined || groupCode != undefined) && messages) {
    var sendMessageData = {}
    if (groupCode) {
      sendMessageData["groupCode"] = toUserID
    } else {
      sendMessageData["toUserID"] = toUserID
    }
    sendMessageData["messages"] = messages
    request({
      url: macQQServer,
      method: "POST",
      json: true,
      headers: {
        "content-type": "application/json",
      },
      body: sendMessageData
    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
      }
    });
  }
  res.sendStatus(200)

})

app.listen(5400, function () {
  console.log('Example app listening on port 5400!');
});