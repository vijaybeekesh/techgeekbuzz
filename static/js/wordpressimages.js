function responsiveImages()
{
    allimages = document.querySelectorAll('iframe img')

    for(image of allimages)
    {
        image.classList.add('img-fluid')
        console.log(image)
        if (image.src.includes('wp-content'))
        {
            image.src = image.src.replace('https://www.techgeekbuzz.com/wp-content/', 
                                            '/media/post_images/')
        }
    }
}
responsiveImages()