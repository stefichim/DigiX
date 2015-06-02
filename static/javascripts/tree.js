/*$(document).ready(function() {
    $("#toggle").click(function () {
        $("#panel").animate({
            left: "+="+String(offset)
        }, 450, function () {
            // Animation complete.
           offset=offset*(-1);
        });
    });

});*/

function movePanel(offset){
    $(".left-panel").animate({
            left: "="+offset
       }, 450, function () {
            // Animation complete.
        });
}