


function generateRandomPassowrd(){

    let totalRange = document.querySelector('#totallength').value;
    let totallength = document.querySelector('#length').value;
    let length = totallength; 

    let includeupper = document.querySelector('#includeupper').checked;
    let includelower = document.querySelector('#includelower').checked;
    let includespecial = document.querySelector('#includespecial').checked;
    let includenumbers = document.querySelector('#includenumbers').checked;
    
    let chars ="";
    if(includelower){
        chars+= "abcdefghijklmnopqrstuvwxyz"
    }
    if(includeupper)
    {
        chars+="ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    }
    if(includenumbers)
    {
        chars+="0123456789"
    }
    if(includespecial)
    {
        chars+="!@#$%^&*()"
    }

    if(!(includelower||includenumbers||includespecial||includeupper))
    {
        chars = "abcdefghijklmopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()"
    }


    let password ="";

    const array =  new Uint32Array(length);
    window.crypto.getRandomValues(array);
    for(i=0;i<length;i++)
    {
        password += chars[array[i]%chars.length];
    }

    document.querySelector('.password').value = password;

    console.log(password)
}

generateRandomPassowrd()


function handalChange()
{
    if(this.name=="length")
    {
        numberinput.value = this.value;
    }

    if(this.name =="totallength")
    {
        if(this.value>50)
        {
            this.value=50;
        }
        if(this.value<1)
        {
            this.value=1;
        }
        rangeinput.value= this.value;
    }
    generateRandomPassowrd()
}

let numberinput = document.querySelector('#totallength')
let rangeinput  = document.querySelector('#length')
let includeupperinput = document.querySelector('#includeupper')
let includelowerinput = document.querySelector('#includelower')
let includespecialinput = document.querySelector('#includespecial')
let includenumberinput = document.querySelector('#includenumbers')

numberinput.addEventListener('change', handalChange)
rangeinput.addEventListener('change', handalChange)
includeupperinput.addEventListener('change', handalChange)
includelowerinput.addEventListener('change', handalChange)
includespecialinput.addEventListener('change', handalChange)
includenumberinput.addEventListener('change', handalChange)



function copyPassword()
{
    var copyText =  document.querySelector('.password');

    // Select the text field
    copyText.select();
    copyText.setSelectionRange(0, 99999); // For mobile devices

    // Copy the text inside the text field
    navigator.clipboard.writeText(copyText.value);

    let copyMessage = document.querySelector('.copy-password-message');
    copyMessage.innerHTML = `Copied Password "${copyText.value}"`
    copyMessage.style.visibility = "visible";
}

let copypassimg = document.querySelector('.copy-password-img')
let copypassbtn = document.querySelector('.copy-password-btn')

copypassbtn.addEventListener('click', copyPassword)
copypassimg.addEventListener('click', copyPassword)


function refreshPassword()
{
    this.classList.add('refresh-password');
    setTimeout(()=>{
        document.querySelector('.rf-password').classList.remove('refresh-password')
    },500)
    generateRandomPassowrd()
}

let refreshpasswordbtn = document.querySelector('.rf-password')

refreshpasswordbtn.addEventListener('click', refreshPassword)
