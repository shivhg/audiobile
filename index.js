let http = require('http');
const fs = require('mz/fs')
const audioBooksDir = '/audiobooks_dir'

let app = http.createServer(async function(req,res){
  let resPayload = {};

  let requestUrl = req.url;
  console.log(requestUrl, 'new req')

  if(requestUrl === '/api/audio-books-list') {
    resPayload = await getBooksList()
    res.setHeader('Content-Type', 'application/json');
    res.write(JSON.stringify(resPayload));
    res.end()
  }

  if(requestUrl.match(/(\/audio-books-list\/).?/)) {
    let reqSplitArray = requestUrl.split('/');
    resPayload = await getChaptersList(parseInt(reqSplitArray.pop()))
    res.setHeader('Content-Type', 'application/json');
    res.write(JSON.stringify(resPayload));
    res.end()
  }

  if(requestUrl.match(/(\/play\/).?/)) {
    let reqSplitArray = requestUrl.split('/');
    playAudio(parseInt(reqSplitArray[reqSplitArray.length-3]), parseInt(reqSplitArray[reqSplitArray.length-1]), res, req)
  }
}).on('error', (e) => console.log('gone case', e));
app.listen(3010);


async function getBooksList() {
  let res = []
  let files = []

  try {
    files = await fs.readdir(audioBooksDir)
  } catch(err) {
  }

  return {availableAudioBooks: files.sort()}
}

async function getChaptersList(bookId) {
  const files = await fs.readdir(audioBooksDir)
  const chapters = await fs.readdir(audioBooksDir+'/'+files[bookId])


  return {chapters: chapters}
}

async function playAudio(bookId, chapterId, res, req) {
  const files = await fs.readdir(audioBooksDir)
  const chapters = await fs.readdir(audioBooksDir+'/'+files[bookId])
  let fileName = audioBooksDir+'/'+files[bookId]+'/'+chapters[chapterId];
  const stats = await fs.stat(fileName)

  let range = req.headers.range
  if (!range) {
    return res.sendStatus(416);
  }
  let positions = range.replace(/bytes=/, "").split("-");
  let start = parseInt(positions[0], 10);
  let total = stats.size;
  let end = positions[1] ? parseInt(positions[1], 10) : total - 1;
  let chunksize = (end - start) + 1;

  res.writeHead(206, {
    "Content-Range": "bytes " + start + "-" + end + "/" + total,
    "Accept-Ranges": "bytes",
    "Content-Length": chunksize,
    "Content-Type": "audio/mp3"
  });

  console.log(bookId, chapterId, req.headers.range, start, end, total,positions)

  let stream = fs.createReadStream(fileName, {start: start, end: end})

  stream.on('error', (err) => console.log('error', err))
  stream.on('end', () => console.log('end'))
  stream.on('close', (err) => {console.log('close'); res.end()})
  stream.on("connect", function() {
    console.error("Stream connected error!");
    console.error(stream.headers);
  });

  stream.pipe(res);
}