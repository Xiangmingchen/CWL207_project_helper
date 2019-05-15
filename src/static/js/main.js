/** global variables **/
var date_picker;

/** 
 * This executes when the html loads
 */
$(() => {
  date_picker = datepicker(document.querySelector("#date-input"), {
    formatter: (el, date, instance) => {
      el.value = date.toISOString().split('T')[0];
    },
    dateSelected: new Date(1970, 2, 1),
  })
})
