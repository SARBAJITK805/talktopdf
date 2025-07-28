import { Worker } from 'bullmq';
import "dotenv/config"
import { QdrantVectorStore } from "@langchain/qdrant";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

if(!process.env.GEMINI_API_KEY){
    throw new Error("GEMINI_API_KEY is required")
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    model: "text-embedding-004",
});

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
    try {
        const data = JSON.parse(job.data);
        console.log("Job data:", job.data);
        
        // Load the PDF
        const loader = new PDFLoader(data.path);
        const docs = await loader.load();
        
        // Chunking text splitter
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 250,
            chunkOverlap: 75
        });
        const texts = await splitter.splitDocuments(docs);
        console.log(`Split into ${texts.length} chunks`);
        
        // Generate embeddings for each chunk manually
        const documentsWithEmbeddings = [];
        for (let i = 0; i < texts.length; i++) {
            const chunk = texts[i];
            console.log(`Processing chunk ${i + 1}/${texts.length}`);
            
            const embedding = await getEmbedding(chunk.pageContent);
            documentsWithEmbeddings.push({
                ...chunk,
                embedding
            });
            
            // Add small delay to avoid rate limiting
            if (i < texts.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        // Create vector store
        const vectorStore = await QdrantVectorStore.fromExistingCollection(
            embeddings,
            {
                url: 'http://localhost:6333',
                collectionName: 'pdf-docs',
            }
        );
        
        // Add documents to vector store
        await vectorStore.addDocuments(texts);
        
        console.log(`Successfully processed and stored ${texts.length} document chunks`);
        
        return { success: true, chunksProcessed: texts.length };
        
    } catch (error) {
        console.error("Error processing job:", error);
        throw error;
    }
}, {
    concurrency: 10, 
    connection: {
        host: "localhost",
        port: 6379
    }
});

worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
});

export { worker };