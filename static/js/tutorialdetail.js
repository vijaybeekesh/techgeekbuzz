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



function tutoriallistAccord(allaccordance)
{
    if(allaccordance.length>=1)
    {
        let flag=0;
        for (a of allaccordance)
        {
            if(a.href==window.location.href)
            {
                a.parentElement.parentElement.parentElement.parentElement.classList.add("show");
                a.parentElement.parentElement.parentElement.parentElement.previousElementSibling.children[0].classList.remove("collapsed")
                flag=1;
                break;
            }
        }
        if(flag==0)
        {
            allaccordance[0].parentElement.parentElement.parentElement.parentElement.classList.add("show");
            allaccordance[0].parentElement.parentElement.parentElement.parentElement.previousElementSibling.children[0].classList.remove("collapsed")
        }
    }
}

allaccordance = document.querySelectorAll("#tutorialTable a")

tutoriallistAccord(allaccordance)


let featured_image=document.querySelector("article>img.featured-image")
if(featured_image)
{
    first_p = document.querySelector("article>p")
    first_p.appendChild(featured_image)
    featured_image.style.display= "block"
}




function responsiveImages()
{
    allimages = document.querySelectorAll('article img')

    for(image of allimages)
    {
        image.classList.add('img-fluid')
        if (image.src.includes('wp-content'))
        {
            image.src = image.src.replace('https://www.techgeekbuzz.com/wp-content/', 
                                            '/media/post_images/')
        }
    }
}
responsiveImages()