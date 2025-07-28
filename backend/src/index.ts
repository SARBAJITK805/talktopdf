import express from 'express';
import cors from 'cors'
import multer from "multer"
import { Queue } from 'bullmq';

const app = express();
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + '-' + file.originalname)
    }
})

const upload = multer({ storage: storage })

const queue = new Queue('file-upload-queue', {
    connection: {
        host: "localhost",
        port: 6379
    }
})

app.use(cors())

app.post('/upload/pdf', upload.single('pdf'), (req, res) => {
    queue.add("file-ready", JSON.stringify({
        filename: req.file?.originalname,
        source: req.file?.destination,
        path: req.file?.path
    }))
    return res.json({
        msg: "uploaded"
    })
})

app.listen(3001, () => {
    console.log("http://localhost:3001");
})