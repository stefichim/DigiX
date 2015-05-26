var status=0;
var display="all";
function first3(){
	document.getElementById("allPictures").innerHTML+=
		'<a href="images/scroll/EDIT_0193.jpg"><img src="images/scroll/EDIT_0193.jpg" height=200px></a>';
		document.getElementById("allPictures").innerHTML+=
		'<a href="images/scroll/EDIT_0280.jpg"> <img src="images/scroll/EDIT_0280.jpg" height=200px></a>';
		document.getElementById("allPictures").innerHTML+=
		'<a href="images/scroll/EDIT_0459.jpg"> <img src="images/scroll/EDIT_0459.jpg" height=200px></a>';
		status=1;
}

function last3(){
	document.getElementById("allPictures").innerHTML+=
		'<a href="images/scroll/EDIT_0607.jpg"> <img src="images/scroll/EDIT_0607.jpg" height=200px></a>';
		document.getElementById("allPictures").innerHTML+=
		'<a href="images/scroll/EDIT_0622.jpg"> <img src="images/scroll/EDIT_0622.jpg" height=200px></a>';
		document.getElementById("allPictures").innerHTML+=
		'<a href="images/scroll/EDIT_0650.jpg"> <img src="images/scroll/EDIT_0650.jpg" height=200px></a>';
		status=0;
}


$(document).ready(function(){
	$("#paginated").css('display','none');
	$("#allPictures").css('display','block');
	console.log("ready");
});

$(window).scroll(function()
{
	if(display!="all") return;
    if($(window).scrollTop() < $(document).height() - $(window).height())
    {
    	if(status==1) last3();
    	else first3();
    }
});

$( "#prev" ).click(function() {


  $("#visible").attr('id','temp');
  $("#invisible").attr('id','visible');
  $("#temp").attr('id','invisible');


});
$( "#next" ).click(function() {
	$("#visible").attr('id','temp');
	$("#invisible").attr('id','visible');
	$("#temp").attr('id','invisible');
});

$( "#all" ).click(function() {
	$("#paginated").css('display','none');
	$("#allPictures").css('display','block');
	$("paginated").hide();
	$("#allPictures").show();
	display="all";
	console.log("all");

});

$( "#pages" ).click(function() {
	$("#allPictures").css('display','none');
	$("#paginated").css('display','block');
	$("#allPictures").hide();
	$("paginated").show();
	display="page";
	console.log("pages");

});