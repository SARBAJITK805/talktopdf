"use client"

import axios from "axios";

export default function FileUpload() {
  function handleFileUploadButtonClik() {
    const element = document.createElement("input");
    element.setAttribute("type", "file");
    element.setAttribute("accept", "application/pdf");
    element.addEventListener("change", async (e) => {
      if (element.files && element.files.length > 0) {
        const file = element.files.item(0);
        const formData = new FormData();
        if (file) {
          formData.append("pdf", file);
          const resp = await axios.post("http://localhost:3001/upload/pdf", formData);

          console.log(resp.data.msg);
        }
      }
    });
    element.click();
  }

  return (
    <div
      onClick={handleFileUploadButtonClik}
      className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg shadow transition duration-200 text-center w-fit mx-auto"
    >
      Upload Your PDF
    </div>
  );
}
