let toolForm = document.querySelector(".tool-form")


const handalSubmitForm = (event)=>{
    event.preventDefault();
    let input = document.querySelector("#url-form")
    let submitBtn = document.querySelector(".submit-btn")
    inputValue = input.value
    const url =`/tools/api/broken-links-checker/?url=${inputValue}`

    input.disabled=true

    submitBtn.classList.add('disabled')
    submitBtn.innerHTML = `Analyzing
                      <div class="spinner-border text-light" role="status">
                    <span class="visually-hidden">Loading...</span>
                  </div>`

    

    const showBrokenLinkTable= (linksSupplied)=>
    {
      let brokenLinkTable = document.querySelector('.broken-link-table');
      brokenLinkTable.innerHTML=""
      for(let item of linksSupplied)
      {
        let tableRow = brokenLinkTable.insertRow(-1);
        tableRow.classList.add('table-danger')
        tableRow.innerHTML = `<td>Broken (${item['Status Code']})</td>
                              <td>${item['type']}</td>
                              <td>${item['Link']}</td>`
      }
      document.querySelector('#broken-link-table').style.display="";
    }

    const showWorkingLinkTable= (linksSupplied)=>
    {
      let workingLinkTable = document.querySelector('.working-link-table');
      workingLinkTable.innerHTML =""
      for(let item of linksSupplied)
      {
        let tableRow = workingLinkTable.insertRow(-1);
        tableRow.classList.add('table-success')
        tableRow.innerHTML = `<td>Success(${item['Status Code']})</td>
                              <td>${item['type']}</td>
                              <td>${item['Link']}</td>`
      }
      document.querySelector('#working-link-table').style.display="";
    }

    const  handleApiData= (data)=>{
      document.querySelector('#tested-url-link').innerHTML = inputValue;
      document.querySelector("#tested-time").innerHTML = `Tested on: ${new Date().toLocaleDateString('en-us', { weekday:"short", year:"numeric", month:"short", day:"numeric",hour:"numeric", minute:"numeric"})}`
      submitBtn.innerHTML = `Test Again` 
      submitBtn.classList.remove("disabled")
      input.disabled=false       
      if(data['links'])
      {
        console.log(data)
        document.querySelector("#total-links-found").innerHTML=`Total Links found: ${data['brokenLinks'].length+ data['workingLinks'].length}`
        document.querySelector(".broken-links-title-heading").innerHTML = `Broken Links: ${data['brokenLinks'].length}`
        document.querySelector(".working-links-title-heading").innerHTML = `Working Links: ${data['workingLinks'].length}`

        if(data['brokenLinks'].length>=1)
        {
          showBrokenLinkTable(data['brokenLinks'])
        }
        if(data['workingLinks'].length>=1)
        {
          showWorkingLinkTable(data['workingLinks'])
        }

      }
      else{
        document.querySelector("#total-links-found").innerHTML=`Total Links found: 0`;
        document.querySelector(".broken-links-title-heading").innerHTML =`<h1 class='text-center'>${data['Message']} </h1>`
        document.querySelector('#working-link-table').style.display="none";
        document.querySelector('#broken-link-table').style.display="none";
        document.querySelector(".working-links-title-heading").innerHTML =""
      }
      let resultSection = document.querySelector('.test-result-section');
      resultSection.style.display="block";
    }

    fetch(url).then(res => res.json())
      .then(data => handleApiData(data))
}



toolForm.addEventListener('submit', handalSubmitForm)