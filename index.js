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
          if (messageText.indexOf(keyword)  != -1) {
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
    for (let index = 0; index < messages.length; index++) {
      //首先提取所有图片url数组 与 文字信息数组
      let msgType = messages[index]["msg-type"]
      if (msgType == 1) {
        downloadImage.downloadImage('http://c2cpicdw.qpic.cn' + messages[index]["url"], './z.jpg')
        let info = { 'msg-type': "1", "file-path": '/Users/sylar/Desktop/MessageHandler/z.jpg', "burn": false }
        messageArray.push(info)
      } else if (msgType == 0) {
        let info = { 'msg-type': "0", "text": messages[index]["text"] }
        messageArray.push(info)
      }
    }
    if (messageArray.length > 0) {
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
        sendMessageData["messages"] = messageArray
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




    }
  }



  // if (req.body['imgInfo']) {
  //   if (message.length == 0) {
  //     //纯图片消息
  //     finalMessage += '纯图片信息,'
  //     imageInfo.forEach(element => {
  //       finalMessage += '图片下载地址:' + element['url'] + ','
  //     });
  //     finalMessage += '\n'
  //   } else {
  //     //图文混合消息
  //     finalMessage += '图文混合信息,消息内容:' + message + '\n'
  //     imageInfo.forEach(element => {
  //       finalMessage += '图片下载地址 : ' + element['url'] + ','
  //     });
  //     finalMessage += '\n'
  //   }
  // } else {
  //   //无图片消息
  //   finalMessage += '纯文本信息:' + message + '\n'
  //   isPureTextMessage = true
  // }
  // console.log(finalMessage)

  // if (templateJSONInfo.hasOwnProperty(fromUserID)) {
  //   if (isPureTextMessage) {
  //     //纯文本信息
  //     let messageInfo = templateJSONInfo["fromUserID"]
  //     let toUserInfo = messageInfo["toUserID"]
  //     if (!toUserInfo) {
  //       res.sendStatus(200)
  //       return
  //     }
  //     var isContainWord = false
  //     for (let index = 0; index < toUserInfo.length; index++) {
  //       if (isContainWord) break;
  //       const toUser = toUserInfo[index];
  //       let messageToUserID = toUser["toUserID"]
  //       if (!messageToUserID) continue
  //       let isGroup = toUser["isGroup"]
  //       if (!isGroup) continue
  //       let keyWordsArray = messageInfo["keyword"]
  //       if (!keyWordsArray) continue
  //       //构造QQ消息

  //       for (const keyword in keyWordsArray) {
  //         if (message.indexOf(keyword) > 0) {
  //           //包含关键词
  //           isContainWord = true


  //           break;
  //         }
  //       }
  //     }

  //     let requestData = {
  //       "toUserID": "941862614",
  //       "groupCode": "941862614",
  //       "messages": [{
  //         "msg-type": "0",
  //         "text": "复读机纯文字消息测试 \n" + finalMessage
  //       }]
  //     }
  //   } else {
  //     //需要下载图片
  //   }
  // }



  // if (groupCode == '941862614' && isGroupChat && isPureTextMessage){

  //   let requestData = {
  //     "toUserID":"941862614",
  //     "groupCode":"941862614",
  //     "messages":[{
  //       "msg-type":"0",
  //       "text":"复读机纯文字消息测试 \n" + finalMessage
  //     }]

  //   }
  //   request({
  //     url: macQQServer,
  //     method: "POST",
  //     json: true,
  //     headers: {
  //         "content-type": "application/json",
  //     },
  //     body: requestData
  // }, function(error, response, body) {
  //     if (!error && response.statusCode == 200) {
  //     }
  // }); 
  // }




  res.sendStatus(200)
})

app.listen(5400, function () {
  console.log('Example app listening on port 5400!');
});