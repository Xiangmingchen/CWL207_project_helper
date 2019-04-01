/** Selector names **/
const newspaper_input = "#upload-newspaper"
const newspaper_label = "#upload-newspaper-label"
const newspaper_error = "#newspaper-error"
const pdf_canvas = "#pdf-canvas"
const left_side = "#left-side"
const form_container = "#form-container"

/** global variables **/
var __PDF_DOC,
  __CANVAS = $(pdf_canvas).get(0),
  __CANVAS_CTX = __CANVAS.getContext('2d'),
  __IMGAE_URL;


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
    // process the file
    if (file.type === "application/pdf") {
      loadPdf(file)
    } else {
      loadImage(file)
      console.log(file)
      $(newspaper_label).text(file.name)
    }
  }

}

function loadImage(file) {
  var reader = new FileReader();

  reader.onload = (event) => {
    __IMGAE_URL = event.target.result;
  }

  reader.readAsDataURL(file);
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
    .then(function(pdf) {
      // assign global variable
      __PDF_DOC = pdf

      // check page number
      if (__PDF_DOC.numPages !== 1) {
        var errorMsg = "Please upload a pdf with only 1 page"
        displayError(newspaper_error, errorMsg);
        return
      }

      // hide previous error message
      $(newspaper_error).hide();

      // display file name to user
      $(newspaper_label).text(file.name)

      // convert pdf to png
      convertPdfToPng();
    })
}

function convertPdfToPng() {
  // get first page of the pdf
  __PDF_DOC.getPage(1).then((page) => {
    var viewport = page.getViewport(1);
    var renderContext = {
			canvasContext: __CANVAS_CTX,
			viewport: viewport
		};

    __CANVAS.width = viewport.width;
    __CANVAS.height = viewport.height;

    // render the pdf on canvas
    page.render(renderContext).then(() => {
      // then convert canvas to png
      __IMGAE_URL = __CANVAS.toDataURL();
    })
  })
}

/**
 * Display error with given selector and error message
 *
 * @param {string} divSelector the selector for jquery of the div, 
 * include '#' if it's an id
 * @param {string} errorMessage The error message to display
 */
function displayError(divSelector, errorMessage) {
  $(divSelector).text(errorMessage).show();
}

function start() {
  validateInputs();

  // hide the input form
  $(form_container).hide();

  // diaplay image
  $(left_side).css("background-image", `url(${__IMGAE_URL})`)
}

function validateInputs() {

}

/** 
 * This executes when the html loads
 */
$(() => {

})
