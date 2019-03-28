// Read input file
function recognizeUploadedImage() {
  var file = document.getElementById("newspaper-upload").files[0];
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
