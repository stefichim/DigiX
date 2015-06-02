$(document).ready(function() {
    $("#toggle").click(function () {
        $("#panel").animate({
            left: "+=350"
        }, 450, function () {
            // Animation complete.
        });
    });
});