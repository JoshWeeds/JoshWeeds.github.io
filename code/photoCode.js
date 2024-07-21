let animationId, interval = 1000;
let images = [];
let i = 0;
let startNum, endNum;

/*Additional event handling, in addition to just pressin the buttons*/
function main(){
    loadLocal();
    document.getElementById("imageElement").onclick = nextPhoto;
    document.getElementById("localStart").onchange = validateNums;
    document.getElementById("localEnd").onchange = validateNums;
    /*LAMBDA*/ //IF A LAMBDA FUNC IS BEING GRADED USE THIS ONE
    document.getElementById("redo").onclick = () =>{
        document.querySelector("#imageElement").src = "InitialImage.jpg";
        document.querySelector("#urlName").value = "InitialImage.jpg";
        document.querySelector("#pvs").innerHTML = '';
        images = [];
        i = 0;
    };
}

/*Ensures start and end numbers are within a valid range. Additional functionality
Than what's required, but imo this looks nicer*/
function validateNums(){
    let start = document.querySelector("#localStart").value;
    let end = document.querySelector("#localEnd").value;
    if (start > end){
        document.querySelector("#pvs").innerHTML = 'Error: Invalid Range';
        return false;
    }else if(images.length > 0){
        document.querySelector("#pvs").innerHTML = 'Photo Viewer System';
        return true;
    }else{
        document.querySelector("#pvs").innerHTML = '';
        return true;
    }
}

/*helper function that simply updates the displayed url*/
function editURL(){
    document.querySelector("#urlName").value = images[i];
}

/*Loads the local photos by adding the URL's to the array 'images', then
resets i to 0 and loads first img in array*/
function loadLocal(){
    images = [];
    let folder = document.querySelector("#photoFolder").value;
    let name = document.querySelector("#photoName").value;
    startNum = document.querySelector("#localStart").value;
    endNum = document.querySelector("#localEnd").value;

    if (!validateNums()){
        return;
    }

    let imgLoc = String(folder) + String(name);
    i = Number(startNum);
    //Go through all numbers, append them to the end. After, reset i to 
    while (i <= endNum){
        tmp = imgLoc.concat(" (" + i +")").concat(".jpg");
        images.push(tmp)
        i += 1;
    }

    //Initializes i back to 0 (the first image)
    i = 0;

    let imageElement = document.querySelector("#imageElement");
    imageElement.src = images[i];
    document.querySelector("#pvs").innerHTML = 'Photo Viewer System';
    editURL();
}

/*Loads the next (ith + 1) photo, updates elements appropriately*/
function nextPhoto(){
    if (images.length == 0){
        document.querySelector("#pvs").innerHTML = 'Error: Must Load Images';
        return;
    }
    let imageElement = document.querySelector("#imageElement");
    if (i >= images.length-1){
        i = 0;
        imageElement.src = images[i];
        editURL();
        return;
    }
    i += 1;
    imageElement.src = images[i];
    editURL();
}

/*Opposite of nextPhoto()*/
function prevPhoto(){
    if (images.length == 0){
        document.querySelector("#pvs").innerHTML = 'Error: Must Load Images';
        return;
    }
    let imageElement = document.querySelector("#imageElement");
    if (i <= 0){
        i = images.length;
        imageElement.src = images[i]
    }
    i -= 1;
    imageElement.src = images[i];
    editURL();
}

/*Hard coded to default back to the first photo, resets i to 0*/
function firstPhoto(){
    if (images.length == 0){
        document.querySelector("#pvs").innerHTML = 'Error: Must Load Images';
        return;
    }
    let imageElement = document.querySelector("#imageElement");
    i = 0;
    imageElement.src = images[i];
    editURL();
}

/*Opposite of firstPhoto(), same purpose just reversed*/
function lastPhoto(){
    if (images.length == 0){
        document.querySelector("#pvs").innerHTML = 'Error: Must Load Images';
        return;
    }
    let imagesElement = document.querySelector("#imageElement");
    i = images.length - 1;
    imageElement.src = images[i];
    editURL();
}


/*The animation functions simply begin or end the animation process. All that
is happening is nextPhoto() gets called at each given interval, in one way or another*/
function beginAnimate(){
    animationId = setInterval("nextPhoto()", interval);
}

function stopAnimate(){
    clearInterval(animationId);
}

function randomAnimate(){
    animationId = setInterval("randomizeNextImage()", interval);
}

//Pretty sure randomizes slows the animation to less than once every second since it's so slow
function randomizeNextImage(){
    i = Math.floor(Math.random() * images.length);
    nextPhoto();
}

/*Retrieves json file from url, processed in processObject()*/
function loadJSON(){
    let url = document.querySelector("#jsonload").value;
    i=0;
    /*LAMBDA*/
    fetch(url)
        .then((response) => response.json())
        .then((json) => processObject(json))
        .catch((error) => console.log("Error: " + error));
}

/*Maps the URL's to the images array, then updates appropriate elements*/
function processObject(json){
    /*LAMBDA*/
    images = json.images.map(image => image.imageURL);
    let imageElement = document.querySelector("#imageElement");
    imageElement.src = images[i];
    document.querySelector("#pvs").innerHTML = 'Photo Viewer System'
    editURL();
    console.log(images);
}