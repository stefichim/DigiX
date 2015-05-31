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
        myId: String,
        relId: String,
        name: String,
        mother: String,
        father: String,
        child: String,
        type: String
    };
    if(selectedOption=="mother") addMother(selectedID,name,tempNode);
    else if(selectedOption=="father") addFather(selectedID,name,tempNode);
    else alert("Oups");

    $.ajax({
        url: '/ajax',
        type: 'post', // performing a POST request
        data : {
            node : tempNode
        },
        dataType: 'json',
        success: function(data)
        {
            // etc...
        }
    });
}

function addMother(myID,name,temp){
    $("#"+myID).append('<div class="node" id="' +String(lastID) +'" onclick="selectThis(event,this)">'+name+' </div>')
    var newNode = document.getElementById(String(lastID));

    newNode.style.top="-50px";
    newNode.style.left="-50px";

    temp.myId=lastID;
    temp.relId=selectedID;
    temp.name=newNode.innerHTML;
    temp.child=myID;
    temp.type="mother";

    lastID++;
    return temp;
}

function addFather(myID,name,temp){
    $("#"+myID).append('<div class="node" id="' +String(lastID) +'" onclick="selectThis(event,this)">'+name+' </div>')
    var newNode = document.getElementById(String(lastID));

    newNode.style.top="-50px";
    newNode.style.left="70px";

    temp.myId=lastID;
    temp.relId=selectedID;
    temp.name=newNode.innerHTML;
    temp.child=myID;
    temp.type="father";

    lastID++;
    return temp;
}


function sendData(){
    var temp=node;
    $.ajax({
        url: '/ajax',
        type: 'post', // performing a POST request
        data : {
            data1 : 'value' // will be accessible in $_POST['data1']
        },
        dataType: 'json',
        success: function(data) {
            console.log(data);
        }
    });
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