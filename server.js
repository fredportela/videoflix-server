const fs = require('fs');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const bodyParser = require('body-parser');
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({"extended": false}));
app.use(express.static(__dirname + '/public'));

const storage = multer.diskStorage({
    destination: function(req, file, callback) {
        const dirName = './movies/';
        addDir(dirName)
        callback(null, dirName); // set the destination
    },
    filename: function(req, file, callback) {
        const fileName = './movies/' + file.originalname;
        removeFile(fileName);
        console.log('Upload: ' + file.originalname);
        callback(null, file.originalname); // set the file name and extension
    }
});

var upload = multer({storage: storage});
app.upload = upload;

app.get('/movies/:movieName', (req, res) => {
    const { movieName } = req.params;
    const movieFile = `./movies/${movieName}`;
    fs.stat(movieFile, (err, stats) => {
        if (err) {
            console.log(err);
            return res.status(404).end('<h1>Movie Not found</h1>');
        }
        // Variáveis necessárias para montar o chunk header corretamente
        const { range } = req.headers;
        const { size } = stats;
        const start = Number((range || '').replace(/bytes=/, '').split('-')[0]);
        const end = size - 1;
        const chunkSize = (end - start) + 1;
        // Definindo headers de chunk
        res.set({
            'Content-Range': `bytes ${start}-${end}/${size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': 'video/mp4'
        });
        // É importante usar status 206 - Partial Content para o streaming funcionar
        res.status(206);

        const stream = fs.createReadStream(movieFile, { start, end });

        stream.on('open', () => stream.pipe(res));
        stream.on('error', (streamErr) => res.end(streamErr));
    });
});

app.post('/upload', app.upload.single('video-upl'), function(req,res) {
    try {
        const filePath = req.file.path;
        const filnameStringify = JSON.stringify(req.file.path); //Stringify file original name
        const filnameParse = JSON.parse(filnameStringify); //Parsing file Original name
        const filename = extsplit(filnameParse);
        const destpath = './' + toInvertBar(filename[1]);
        
        const extension = filename[filename.length-1];
        if(extension && extension != 'mp4') {
            const newFile = filePath.replace(extension, 'mp4');
            var command = ffmpeg(filePath)
                        .output(newFile)
                        .videoCodec('libx264')
                        .on('end', function() {
                            console.log('Finished processing');
                            if(fs.existsSync(req.file.path)) {
                                fs.unlinkSync(req.file.path);
                            }
                        })
                        .run();
            /*
            command.save(newFile).on('end', function() {
                if(fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                console.log('Finished processing');
            });
            */
            req.file.path = newFile;
            req.file.originalname = req.file.originalname.replace(extension, 'mp4');
            req.file.fieldname = req.file.fieldname.replace(extension, 'mp4');
            req.file.filename = req.file.filename.replace(extension, 'mp4');
            req.file.mimetype = req.file.mimetype.replace(extension, 'mp4');
        }
        
        removeDir(destpath);
        doScreenshots(req.file.path, 'thumbnail', '150x150');
        doScreenshots(req.file.path, 'screenshot');

        req.file.thumbnail = 'thumbnail/' + req.file.filename,
        req.file.screenshot = 'screenshot/' + req.file.filename,
        req.file.url = 'movies/' + req.file.filename
        
        res.send(req.file).responseJSON;

    } catch (e) {
        console.log(e);
        res.status(404).send({ message: e.msg }).responseJSON;
    }
});

app.get('/screenshot/:movieName', (req, res) => {
    try {
        const { movieName } = req.params;
        const movieFile = `./movies/${movieName}`;
        const filnameStringify = JSON.stringify(movieFile); //Stringify file original name
        const filnameParse = JSON.parse(filnameStringify); //Parsing file Original name
        const filename = extsplit(filnameParse);
        const destpath = './' + toInvertBar(filename[1]);

        const stream = fs.createReadStream(destpath + '/screenshot_1.png')
            .on('open', () => stream.pipe(res))
            .on('error', (streamErr) => { 
                console.log(streamErr.message);
                res.status(404).send({ message: streamErr.message }).responseJSON;
            });
    } catch (e) {
        console.log(e.msg);
        res.status(404).send({ message: e.msg }).responseJSON;
    }
});

app.get('/thumbnail/:movieName', (req, res) => {
    try {
        const { movieName } = req.params;
        const movieFile = `./movies/${movieName}`;
        const filnameStringify = JSON.stringify(movieFile); //Stringify file original name
        const filnameParse = JSON.parse(filnameStringify); //Parsing file Original name
        const filename = extsplit(filnameParse);
        const destpath = './' + toInvertBar(filename[1]);

        const stream = fs.createReadStream(destpath + '/thumbnail_1.png')
            .on('open', () => stream.pipe(res))
            .on('error', (streamErr) => { 
                console.log(streamErr.message);
                res.status(404).send({ message: streamErr.message }).responseJSON;
            });
    } catch (e) {
        console.log(e.msg);
        res.status(404).send({ message: e.msg }).responseJSON;
    }
});

function doScreenshots(movieFile, imageName = 'screenshot', imageSize = '100%')
{
    try {
        const filnameStringify = JSON.stringify(movieFile); //Stringify file original name
        const filnameParse = JSON.parse(filnameStringify); //Parsing file Original name
        const filename = extsplit(filnameParse);
        var destpath = './' + toInvertBar(filename[0]);
        
        ffmpeg(movieFile)
            .takeScreenshots({ 
                count: 0,
                filename: `${imageName}.png`,
                timemarks: [ '00:00:00.000', '1' ], 
                size: imageSize ? imageSize : '100%'
            }, destpath)
            .on('filenames', function(filenames) {
                console.log('Will generate ' + filenames.join(', '))
            })
            .on('end', function() {
                console.log('Thumbnail taken');
            })
            .on('error', function(err) {
                console.log('an error happened: ' + err.message);
            });
    } catch (e) {
        console.log(e);
    }
}

function addDir(destpath) {
    if (!fs.existsSync(destpath)) {
        fs.mkdirSync(destpath, 0744);
    }
}

function removeDir(destpath) {
    if(fs.existsSync(destpath) && fs.lstatSync(destpath).isDirectory()) {
        fs.readdirSync(destpath).forEach(function(file,index){
            var curPath = destpath + "/" + file;
            if(fs.lstatSync(curPath).isDirectory()) {
                fs.rmdirSync(destpath);
            } else {
                fs.unlinkSync(curPath);
            }   
        });
        fs.rmdirSync(destpath);
    }
}

function removeFile(destpath) {
    if(fs.existsSync(destpath) && !fs.lstatSync(destpath).isDirectory()) {
        fs.unlinkSync(destpath);
    }
}

function tosplit(request)
{
    var value = request;
    valueArray = value.split("\\");
    return valueArray;
}

function toInvertBar(request)
{
    return request.replace("\\", "/");
}

function extsplit(request)
{
    var value = request;
    nameArray = value.split('.');
    return nameArray;
}

app.listen(4000, () => console.log('VideoFlix Server!'));