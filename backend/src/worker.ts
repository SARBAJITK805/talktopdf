import { Worker } from 'bullmq';
import "dotenv/config"
import { QdrantVectorStore } from "@langchain/qdrant";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

const getEmbedding = async (text: string): Promise<number[]> => {
    try {
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await model.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.error("Error generating embedding:", error);
        throw error;
    }
}


const worker = new Worker('file-upload-queue', async (job) => {
    const data = JSON.parse(job.data);
    console.log("Job data  : ", job.data);
    //load the pdf
    const loader = new PDFLoader(data.path)
    const docs = await loader.load();
    console.log(docs);
    //chunking text splitter
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 250,
        chunkOverlap: 75
    })
    const texts = await splitter.splitDocuments(docs)
    console.log(texts);
    //generate embeddings
    const result = await model.embedContent(texts);
    //make a vector store
    const vectorStore = await QdrantVectorStore.fromExistingCollection(
        embeddings,
        {
            url: 'http://localhost:6333',
            collectionName: 'pdf-docs',
        }
    );

}, {
    concurrency: 100, connection: {
        host: "localhost",
        port: 6379
    }
});