
function wrap(element) {
    // create wrapper container
    var wrapper = document.createElement('div');
    wrapper.className = 'hscroll'
    element.parentNode.insertBefore(wrapper, element);
    wrapper.appendChild(element);

}
alltables = document.querySelectorAll('article table')
for (i = 0; i < alltables.length; i++) {
    wrap(alltables[i]);
}

function tableofcontent() {
    article = document.querySelector('article');
    articlenodes = article.children;

    tablelist = document.querySelector('.tbclist');

    heading = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
    let counter = 1;
    for (i = 0; i <= articlenodes.length; i++) {
        if (articlenodes[i]) {
            if (heading.includes(articlenodes[i].nodeName)) {
                articlenodes[i].id = `goto ${articlenodes[i].textContent.toLowerCase()
                    .trim()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/[\s_-]+/g, '-')
                    .replace(/^-+|-+$/g, '')}`;
                newlist = document.createElement('li');
                newlist.classList.add(`i-${articlenodes[i].nodeName}`)
                if(articlenodes[i].textContent!='\n'){
                    newlist.innerHTML = `<a href='#goto ${articlenodes[i].textContent.toLowerCase()
                        .trim()
                        .replace(/[^\w\s-]/g, '')
                        .replace(/[\s_-]+/g, '-')
                        .replace(/^-+|-+$/g, '')}'>${articlenodes[i].textContent}</a>`
                    tablelist.appendChild(newlist)
                    counter += 1
                }
            }
        }
    }
}

tableofcontent()

function removeFrom(event){
    console.log(event.target)

    event.preventDefault();
    reply_form = document.querySelector(".reply-form")
    if(document.querySelector(".reply-form"))
    {
        reply_form.remove()
    }
}


function replyForm(event){
    event.preventDefault();
    reply_form = document.querySelector(".reply-form")
    if(document.querySelector(".reply-form"))
    {
        reply_form.remove()
    }
    

    let mainNode = event.target.parentElement.parentElement;
    let form = document.querySelector('.comment-form');
    let clone = form.cloneNode(true);
    clone.className ="reply-form"

    let cancel_btn = document.createElement('button')
    cancel_btn.className = 'btn btn-danger mt-2 w-100 cancel-form'
    cancel_btn.innerHTML = "Cancel" 
    clone.appendChild(cancel_btn)

    parentComment = clone.querySelector('.reply-input')
    mainNode.appendChild(clone)
    parentComment.type='hidden'
    parentComment.value = `${event.target.parentElement.firstChild.id}`;
    parentComment.name= "replying"
    parentComment.id = event.target.parentElement.firstChild.id

    let cancelbutton = document.querySelector('.cancel-form')
    cancelbutton.addEventListener('click', removeFrom)
}

replybtn = document.querySelectorAll('.reply');

for(reply of replybtn){
    reply.addEventListener('click', replyForm)
}



function responsiveImagesandanchor()
{
    allimages = document.querySelectorAll('article img');
    allanchors = document.querySelectorAll('article a')

    for(anchor of allanchors)
    {
        if(!anchor.href.includes("https://www.techgeekbuzz.com") && !anchor.href.includes("#goto"))
        {
            anchor.target ="_blank";
        }
    }

    for(image of allimages)
    {
        image.classList.add('img-fluid');
        image.classList.add('img-center');
        if (image.src.includes('wp-content'))
        {
            image.src = image.src.replace('https://www.techgeekbuzz.com/wp-content/', 
                                            '/media/post_images/')
        }
    }
}
responsiveImagesandanchor()




// modal 