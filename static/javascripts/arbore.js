/**
 * Created by Pava on 5/30/2015.
 */
var lastID=0;
var selectedID="";



function addParent(form){
    if(selectedID=="") return;
    var select= document.getElementById("parentSelect");
    var name=document.getElementById("parentText").value;
    var selectedOption = select.options[select.selectedIndex].value;
    var tempNode={
        type: String,
        name: String,
        fromID: String,
        myID: String
    };
    if(selectedOption=="mother") addMother(selectedID,name,tempNode);
    else if(selectedOption=="father") addFather(selectedID,name,tempNode);
    else alert("Oups");

    $.ajax({
        url: '/get/father',
        type: 'get',
        data : {
            myID: "23"
        },
        dataType: 'json',
        success: function(data) {

        }
    });
}

function addMother(myID,name,temp){
    $("#"+myID).append('<div class="node" id="' +String(lastID) +'" onclick="selectThis(event,this)">'+name+' </div>')
    var newNode = document.getElementById(String(lastID));

    newNode.style.top="-50px";
    newNode.style.left="-50px";

    temp.type="mother";
    temp.myID=lastID;
    temp.fromID=selectedID;
    temp.name=newNode.innerHTML;

    lastID++;
    return temp;
}

function addFather(myID,name,temp){
    $("#"+myID).append('<div class="node" id="' +String(lastID) +'" onclick="selectThis(event,this)">'+name+' </div>')
    var newNode = document.getElementById(String(lastID));

    newNode.style.top="-50px";
    newNode.style.left="70px";

    temp.type="father";
    temp.myID=lastID;
    temp.fromID=selectedID;
    temp.name=newNode.innerHTML;

    lastID++;
    return temp;
}


function selectThis(e,node){

    e.cancelBubble = true;
    if (e.stopPropagation) e.stopPropagation();

    selectedID=node.id;
    var elem = document.getElementsByClassName("active");
    var myClassArray=node.className.split(" ");
    var myClass=myClassArray[0];

    for(i=0;i<elem.length;i++){
        if(elem[i].className=="") continue;
        var myClassArray=elem[i].className.split(" ");
        var myClass=myClassArray[0];
        elem[i].setAttribute("class",myClass);
    }
    node.setAttribute("class", node.className + " active");
}