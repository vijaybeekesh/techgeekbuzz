function closehellobar(event)
{
    event.target.parentElement.style.display="none";
    sessionStorage.setItem("close-hello-bar", true);
}

if(!sessionStorage.getItem('close-hello-bar')){
    let helloclose = document.querySelector(".hello-bar-button")
    if(helloclose){
        helloclose.addEventListener('click', closehellobar)
    }
}
else{
    let helloBarDiv = document.querySelector('.hello-bar');
    helloBarDiv.style.display="none"
    let headerMarging = document.querySelector('.header');
    headerMarging.style.marginBottom = "0px";    
}


function closetosthandler()
{
    let tostmessage = document.querySelector(".the-message-tost")
    tostmessage.classList.toggle("show");

}

let closetost= document.querySelector('.tost-message-close')
if (closetost){
    closetost.addEventListener("click", closetosthandler)}


function handalmobiletutorialbtn(event)
{
    tutoriallist =document.querySelector(".tutorial-dropdown-list");
    tutoriallist.classList.toggle("tutorial-dropdown-show")
    this.querySelector('button').classList.toggle('rotate-btn');
}

let mobiletutorialbtn = document.querySelector('.tutorial-dropdown')
if (mobiletutorialbtn)
{
    mobiletutorialbtn.addEventListener('click', handalmobiletutorialbtn)
}



// Ads section
function adswithparagrap()
{
    allparas = articleChild.querySelectorAll('p');
    console.log(allparas)
}




window.addEventListener("scroll", ()=>{
    let header = document.querySelector("nav");
    header.classList.toggle("fixed-top", window.scrollY>0)
})


// let articleChild = document.querySelector('article')



// // for paragrap nodes 
// let articlePara = articleChild.querySelector('p')

// if(articlePara)
// {
//     adswithparagrap()
// }
