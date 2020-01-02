var express = require('express');
var bodyParser = require('body-parser');
var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.get('/', function (req, res) {
  res.send('Hello World!');
});

// MacQQ消息接入
app.post('/qqmessage',function(req,res){

  // console.log(req)
  console.log(JSON.stringify(req.body));
  let fromUserID = req.body["fromUserID"]
  let toUserID = req.body["toUserID"]
  let time = req.body["time"]
  let groupCode = req.body["groupCode"]
  let nickName = req.body["nickName"]
  let message = req.body["message"]
  //图片信息。可能没有
  let imageInfo = req.body["imgInfo[url]"]
  var UIN = fromUserID
  var finalMessage = ""
  if ( groupCode !== '') {
    //群消息
    UIN = groupCode
    finalMessage += '来源于群消息,群号:' + UIN + ' 发消息Q号 :' + fromUserID + '\n'
  }else{
    //个人消息
    UIN = fromUserID
    finalMessage += '来源个人消息,Q号: ' + UIN +  '\n'
  }
  console.log(req.body)
  console.log(typeof(imageInfo))
  if (imageInfo == undefined) {
    //无图片消息
    finalMessage += '纯文本信息 : ' + message + '\n'
  }else{
    if (message.lenth == 0) {
      //纯图片消息
      finalMessage += '纯图片信息,图片下载地址 : ' + imageInfo['url'] + '\n'
    }else{
      //图文混合消息
      finalMessage += '图文混合信息,消息内容 : ' + message + ', 图片下载地址 : ' + imageInfo['url'] + '\n'
    }
  }
  console.log(finalMessage)

  res.sendStatus(200)
})

app.listen(5400, function () {
  console.log('Example app listening on port 5400!');
});