const {settings} = require('./settings.json');
const fs = require('fs')
const path = require('path');
let express = require('express');
const bodyParser = require('body-parser');
const Media = require('./media');
const {
    writeDatabase,
    readDatabase,
    readSettings,
    writeSettings,
    isDownloading
    } = require('./helpers');
const app = express();
const port = settings.port;

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());

app.use('/', express.static(path.join(__dirname,"../web/dist/")));
app.use('/media/videos', express.static('videos'));
app.use('/media/music', express.static('music'));

const http = require('http');
const httpServer = http.createServer(app);
const io = require('socket.io')(httpServer);
let testSocket;

io.on('connection', (socket) => {
    testSocket = socket;
    let database = null;

    socket.on('getVideos', async () => {
        try{
            database = await readDatabase();

            if(database != null)
                socket.emit('getVideos', database.videos.reverse());

        }
        catch(error){
            console.log(error);
            res.sendStatus(500);
        }
    })
});

app.get('/', function(req,res) {
    res.sendFile('index.html', { root: path.join(__dirname, '../web/dist') });
});

app.get('/items', async (req,res) => {
    try{
        const database = await readDatabase();

        if(database != null){
            res.json(database);
        }
        else{
            res.sendStatus(204);
        }
    }
    catch(error){
        console.log(error);
        res.sendStatus(500);
    }
});

app.get('/items/:id', async (req,res) => {
    try{
        const database = await readDatabase();
        let item = null;
        let found = false;

        if(database != null){
            database.videos.forEach(el => {
                if(el.id === req.params.id){
                    found = true;
                    item = el;
                }
            });
        }

        if(found)
            res.json(item);
        else
            res.sendStatus(404);
    }
    catch(error){
        console.log(error);
        res.sendStatus(500);
    }

});

app.post('/info', async (req,res) => {
    try{
        const info = await Media.GetDownloadInfo(req.body.url);

        if(info != null)
            res.json(info);
    }
    catch(error){
        console.log(error);
        res.sendStatus(500);
    }
});

app.get('/file/:id', async (req,res) => {
    try{
        const db = await readDatabase();
        let file = null;
        let found = false;

        if(db != null){
            db.videos.forEach(async el => {
                if(el.id === req.params.id){
                    file = path.join(__dirname, el.fileLocation, el.fileName);
                    found = fs.existsSync(file);
                }
            });

            if(found)
                res.download(file);
            else
                res.sendStatus(404);
        }
    }
    catch(error){
        console.log('error downloading file');
        res.sendStatus(500);
    }
});

app.post('/download', async (req,res) => {
    try{
        const database = await readDatabase();
        const media = new Media();
        media.socket = testSocket;

        media.url = req.body.url;
        media.options = {
            format: req.body.videoQuality,
            audioFormat: req.body.soundQuality,
            audioOnly: req.body.audioOnly,
            playlist: req.body.playlist
        };

        if(isDownloading(database.downloads)){
            const result = await media.AddToQueue();
            let returnCode = 201;

            if(!result)
                returnCode = 500;

            res.status(returnCode).json({
                code: result.code,
                messages: result.messages
            });

            return;
        }
        else{
            media.Download();
            res.sendStatus(200);
        }



        // switch(result.code){
        //     case 1:
        //         database.videos.push(media.info);
        //         await writeDatabase(database);

        //         res.status(201).send(media.info);
        //         break;
        //     case 2:
        //         res.status(400).json({
        //             code: 2,
        //             messages: "Item already excists"
        //         });
        //         break;
        //     default:
        //         res.sendStatus(500);
        // }
    }
    catch(error){
        console.log(error);
        res.status(500).json(error);
    }
});

app.get('/download/status', async (req,res) => {
    try{
        const database = await readDatabase();

        res.json(database.downloads);
    }
    catch(error){
        console.log(error);
        res.sendStatus(500);
    }

})

app.delete('/items/:id', async (req,res) => {
    try{
        let found = false;
        const database = await readDatabase();

        if(database != null){
            database.videos.forEach(async (el, index) => {
                if(el.id === req.params.id){
                    found = true;
                    console.log(`File: ${el.id} has been deleted`);

                    database.videos.splice(index, 1);
                    fs.unlinkSync(`${el.fileLocation}/${el.fileName}`);
                    await writeDatabase(database);

                }
            });

            if(found)
                res.sendStatus(200);
            else
                res.sendStatus(404);
        }
    }
    catch(error){
        res.sendStatus(500);
    }


});

app.delete('/download/status', async (req,res) => {
    try{
        const database = await readDatabase();

        database.downloads = [];

        await writeDatabase(database);

        res.sendStatus(200);
    }
    catch(error){
        console.log(error);
        res.sendStatus(500);
    }
});

app.get('/settings', async (req,res) => {
    try{
        const data = await readSettings();

        if(data === null)
            res.send(400).json({error: 'Error fetching settings'});

        res.json(data);
    }
    catch(error){
        console.log(error);
        res.sendStatus(500);
    }
});

app.put('/settings', async (req,res) => {
    try{
        const data = await readSettings();

        if(data === null){
            res.send(400).json({error: 'Error fetching settings'});
            return;
        }

        const updates = Object.keys(req.body);
        let changesMade = false;

        updates.forEach((el, index) => {
            console.log(el);
            switch(el){
                case 'port':
                    data.settings.port = req.body.port;
                    changesMade = true;
                    break;
                case 'defaultQuality':
                    data.settings.defaultQuality = req.body.defaultQuality;
                    changesMade = true;
                    break;
            }
        })

        if(changesMade)
            await writeSettings(data);

        res.json(data);
    }
    catch(error){
        console.log(error);
        res.sendStatus(500);
    }
});

httpServer.listen(port, () => {
    console.log(`HTTP Server running on port ${port}`);
});