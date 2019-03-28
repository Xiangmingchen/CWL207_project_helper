/** Selector names **/
const newspaper_input = "#upload-newspaper"
const newspaper_label = "#upload-newspaper-label"
const newspaper_error = "#newspaper-error"



/**
 * Recognize the text in an image 
 *
 * @param {ImageLike} image https://github.com/naptha/tesseract.js#imagelike
 */
function recognizeImage(image) {
  Tesseract.recognize(image)
         .then(function(result) {
            $("#ocr_results").text(result.text)
         }).progress(function(result) {
            $("#ocr_status").text( result["status"] + " (" +
                        (result["progress"] * 100) + "%)")
        });
}

/**
 * Load files that user uploaded. Take care of different file types.
 *
 */
function uploadFile() {
  var file = $(newspaper_input)[0].files[0];
  
  // load the file according to its type
  if (!file) { // if canceled
    return
  } else {
    // hide the error msg div
    $(newspaper_error).addClass("d-none")

    // process the file
    if (file.type === "application/pdf") {
      loadPdf(file)
    } else {
      console.log(file.type)
      $(newspaper_label).text(file.name)
    }
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
      // check page number
      if (pdf_doc.numPages !== 1) {
        var errorMsg = "Please upload a pdf with only 1 page"
        displayError(newspaper_error, errorMsg);
        return
      }

      console.log(`${file.name} has ${pdf_doc.numPages} pages`)
      $(newspaper_label).text(file.name)
    })
}

function displayError(divSelector, errorMessage) {
  $(divSelector).text(errorMessage)
      .removeClass("d-none")
}

