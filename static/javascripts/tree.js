$(document).ready(function() {
    var offset=350;
    $("#toggle").click(function () {
        $("#panel").animate({
            left: "+="+String(offset)
        }, 450, function () {
            // Animation complete.
           offset=offset*(-1);
        });
    });

});