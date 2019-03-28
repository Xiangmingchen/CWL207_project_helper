/**
 * Recognize the text in an image 
 *
 * @param {ImageLike} image https://github.com/naptha/tesseract.js#imagelike
 */
function recognizeImage(image) {
  Tesseract.recognize(image)
         .then(function(result) {
            document.getElementById("ocr_results")
                    .innerText = result.text;
         }).progress(function(result) {
            document.getElementById("ocr_status")
                    .innerText = result["status"] + " (" +
                        (result["progress"] * 100) + "%)";
        });
}

/**
 * Load files that user uploaded. Take care of different file types.
 *
 */
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

/**
 * Load pdf and convert it into a image.
 *
 * @param {File} file File that user uploaded
 * @returns {image} Image that's converted from the pdf
 */
function loadPdf(file) {
  var file_url = URL.createObjectURL(file);

  // Load pdf with pdf.js
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'static/js/pdf.worker.js';
  pdfjsLib.getDocument({ url: file_url })
    .then(function(pdf_doc) {
      console.log(pdf_doc.numPages)
    })
}
