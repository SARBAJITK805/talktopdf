"use client"

import { Upload, Send, File, MessageCircle, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRef, useState } from 'react';
import axios from "axios";

interface Message {
  id: string,
  sender: string,
  text: string,
  timestamp: string
}

export default function PDFChatApp() {

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'ideal' | 'uploading' | 'success' | 'error'>('ideal');
  const [uploadedFile, setUploadedFile] = useState<string | null>();
  const messagesEndRef = useRef(null);

  async function handleSendMessage() {
    if (!inputMessage) return;
    const userMessage = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true)

    try {
      const response = await axios.get(`http://localhost:3001/chat?message=${encodeURIComponent(inputMessage)}`);

      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: response.data.message,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I encountered an error while processing your question. Please try again.",
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleFileUpload() {
    const element = document.createElement('input')
    element.setAttribute("type", "file")
    element.setAttribute("accept", "application/pdf")
    element.addEventListener("change", async (e) => {
      if (element.files && element.files.length > 0) {
        const file = element.files.item(0);
        setUploadStatus('uploading')
        try {
          const formData = new FormData()
          formData.append("pdf", file)
          const resp = await axios.post("http://localhost:3001/upload/pdf", formData);
          setUploadedFile(file?.name);
          setUploadStatus('success');
        } catch (error) {
          setUploadStatus('error');
          setTimeout(() => setUploadStatus("ideal"), 3000);
        }
      }
    })
    element.click();
  }

  const handleKeyPress = (e: any) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">PDF Chat Assistant</h1>
          <p className="text-slate-600">Upload your PDF and ask questions about its content</p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <File className="w-5 h-5" />
              Document Upload
            </h2>
            {uploadedFile && (
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                <CheckCircle className="w-4 h-4 text-green-500" />
                {uploadedFile}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleFileUpload}
              disabled={uploadStatus === 'uploading'}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-3 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              {uploadStatus === 'uploading' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload PDF
                </>
              )}
            </button>

            {uploadStatus === 'success' && (
              <Alert className="flex-1 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  PDF uploaded successfully! You can now ask questions about the document.
                </AlertDescription>
              </Alert>
            )}

            {uploadStatus === 'error' && (
              <Alert className="flex-1 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  Upload failed. Please try again.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        {/* Chat Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Chat Header */}
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Chat with your document
            </h2>
          </div>

          {/* Messages */}
          <div className="h-96 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-slate-500 mt-20">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-lg mb-2">No messages yet</p>
                <p className="text-sm">Upload a PDF and start asking questions about its content</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-3 ${message.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-slate-100 text-slate-800 rounded-bl-md'
                      }`}
                  >
                    <p className="text-sm leading-relaxed">{message.text}</p>
                    <p
                      className={`text-xs mt-2 ${message.sender === 'user' ? 'text-blue-100' : 'text-slate-500'
                        }`}
                    >
                      {/* {message.timestamp} */}
                    </p>
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3 max-w-[70%]">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                    <p className="text-sm text-slate-600">Thinking...</p>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 p-4">
            <div className="flex gap-3">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask a question about your PDF..."
                className="flex-1 resize-none border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                rows={1}
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white p-3 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-500">
          <p>Upload a PDF document and ask questions to get AI-powered answers based on the content.</p>
        </div>
      </div>
    </div>
  );
}