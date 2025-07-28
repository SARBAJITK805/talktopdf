import express from 'express';
import cors from 'cors'
import dotenv from "dotenv"
import multer from "multer"
import { Queue } from 'bullmq';
import { QdrantVectorStore } from '@langchain/qdrant';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config()

const app = express();
app.use(express.json());

if (!process.env.GEMINI_API_KEY) {
    throw new Error();
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

app.get('/chat', async (req, res) => {
    const userQuery = 'sensor'
    const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GEMINI_API_KEY,
        model: "text-embedding-004",
    });
    const vectorStore = await QdrantVectorStore.fromExistingCollection(
        embeddings,
        {
            url: 'http://localhost:6333',
            collectionName: 'pdf-docs',
        }
    );
    const ret = vectorStore.asRetriever({
        k: 2
    })
    const result = await ret.invoke(userQuery);

    const context = result.map((doc, index) => {
        return `Document ${index + 1}:\n${doc.pageContent}`;
    }).join('\n\n');

    const SYSTEM_PROMPT = `You are a helpful AI assistant that answers questions based on the provided document context. 

        INSTRUCTIONS:
        - Answer the user's question using ONLY the information provided in the context below
        - If the context doesn't contain enough information to answer the question, say so clearly
        - Be concise but comprehensive in your response
        - If you mention specific information, try to indicate which document it came from
        - Do not make up information that isn't in the context

        CONTEXT:
        ${context}

        USER QUESTION: ${userQuery}

        Please provide a helpful answer based on the context above.`;

    const selectModel = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
            temperature: 0.3,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 2048,
        }
    });

    const output = await selectModel.generateContent(SYSTEM_PROMPT)

    return res.json({
        answer: output.response.text
    })

})

app.listen(3001, () => {
    console.log("http://localhost:3001");
})