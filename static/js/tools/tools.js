if(screen.width<=983)
{
    let selectToolbtn = document.querySelector(".tools-categories>h4");
    let subCategories = document.querySelector(".tool-category");

    const toogleSubcategories = ()=>{
        subCategories.classList.toggle("hide-category")

    }

    selectToolbtn.addEventListener('click', toogleSubcategories)
}


let filterBySearch = ()=>{
    let name = inputForm.value.toLowerCase()

    for(let item of allToolsItems)
    {
        let toolName = item.querySelector(".tool-title")
        if(toolName.textContent.toLowerCase().includes(name))
        {
            item.style.display ="block"
        }
        else{
            item.style.display = "none"
        }
    }
}


let allToolsItems = document.querySelectorAll(".tool-item-container");

let inputForm = document.querySelector(".search-form-input")

inputForm.addEventListener("input",filterBySearch)


const filterByClick = (event)=>{

    for(let item of allToolsItems)
    {
        
        if(item.dataset.parent == event.target.textContent || event.target.textContent=="All")
        {
            item.style.display ="block"
        }
        else{
            item.style.display = "none"
        }
    }

    
}


let categoryItembtn = document.querySelectorAll(".tool-category-item")


for(let item of categoryItembtn){
    item.addEventListener('click', filterByClick);
    }

