/** Selector names **/
const newspaper_input = "#upload-newspaper"
const newspaper_label = "#upload-newspaper-label"
const newspaper_error = "#newspaper-error"
const newspaper_loading = "#newspaper-loading"
const template_input = "#upload-template"
const template_label = "#upload-template-label"
const template_error = "#template-error"
const pdf_canvas = "#pdf-canvas"
const left_side = "#left-side"
const form_container = "#form-container"
const date_input = "#date-input"

/** global variables **/
var __PDF_DOC,
  __CANVAS = $(pdf_canvas).get(0),
  __CANVAS_CTX = __CANVAS.getContext('2d'),
  __IMGAE_URL,
  __EXCEL, 
  __DATE;

var month_picker;

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
function uploadNewspaper() {
  var file = $(newspaper_input)[0].files[0];
  
  // load the file according to its type
  if (!file) { // if canceled
    return
  } else {
    // hide previous error message
    $(newspaper_error).hide();

    // process the file
    if (file.type === "application/pdf") {
      loadPdf(file)
    } else {
      loadImage(file)
    }
  }

}

function uploadTemplate() {
  var file = $(template_input)[0].files[0];

  if (!file) {
    return
  }

  $(template_error).hide();
  $(template_label).text(file.name);
  __EXCEL = file;
}

function loadImage(file) {
  // display loading
  $(newspaper_loading).show();
  // display file name
  $(newspaper_label).text(file.name)

  // read the image
  var reader = new FileReader();

  reader.onload = (event) => {
    // set image url
    __IMGAE_URL = event.target.result;

    // hide loading
    $(newspaper_loading).hide();
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

      // display loading
      $(newspaper_loading).show();

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

      // hide loading
      $(newspaper_loading).hide();
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

/**
 * When start button is clicked
 */
function start() {
  if (!validateInputs()) {
    return
  }

  // hide the input form
  $(form_container).hide();

  // diaplay image
  $(left_side).css("background-image", `url(${__IMGAE_URL})`)
}

function validateInputs() {
  var valid = true;
  if (!__IMGAE_URL) {
    displayError(newspaper_error, "Please select a file")
    valid = false;
  }

  if (!__EXCEL) {
    displayError(template_error, "Please select a file")
    valid = false;
  }

  __DATE = $(date_input).val();
  if (!__DATE) {
    $(date_input).addClass("text-danger");
    valid = false;
  }

  return valid;
}

/** 
 * This executes when the html loads
 */
$(() => {
  month_picker = datepicker(document.querySelector(date_input), {
    formatter: (el, date, instance) => {
      el.value = date.toISOString().split('T')[0].slice(0, -3);
    },
    dateSelected: new Date(1970, 2, 1),
  })

  $("#upload-template").change(uploadTemplate)
})
