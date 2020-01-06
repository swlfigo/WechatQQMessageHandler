let fs = require('fs')
let request = require('request')
let path = require('path')
// 下载单张图片 src是图片的网上地址 dest是你将这图片放在本地的路径 callback可以是下载之后的事}
const downloadImage = (src, dest, callback) => {
  request.head(src, (err, res, body) => {
    if (err) { console.log(err); return }
    src && request(src).pipe(fs.createWriteStream(dest)).on('close', () => {
      callback && callback(null, dest)
    })
  })
}

module.exports = {
    downloadImage:downloadImage
}
