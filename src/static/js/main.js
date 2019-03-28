// Read input file
function recognizeUploadedImage() {
  var file = document.getElementById("upload").files[0];
  console.log(file)
  Tesseract.recognize(file)
         .then(function(result) {
            document.getElementById("ocr_results")
                    .innerText = result.text;
         }).progress(function(result) {
            document.getElementById("ocr_status")
                    .innerText = result["status"] + " (" +
                        (result["progress"] * 100) + "%)";
        });
}

// Upload file
function uploadFile() {
  var file = document.getElementById("upload").files[0];
  
  // load the file according to its type
  if (!file) {
    return
  } else if (file.type === "application/pdf") {
    loadPdf(file)
  } else {
    console.log(file.type)
  }

}

// Load pdf
function loadPdf(file) {
  var file_url = URL.createObjectURL(file);

  // Load pdf with pdf.js
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'static/js/pdf.worker.js';
  pdfjsLib.getDocument({ url: file_url })
    .then(function(pdf_doc) {
      console.log(pdf_doc.numPages)
    })
}
