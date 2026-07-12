
from urllib.parse import urlparse
from django.http import JsonResponse
import requests
from bs4 import BeautifulSoup
import concurrent.futures
from datetime import datetime

def checkLinkType(link, domain):
    if domain in link:
        return "Internal"
    else:
        return "External"

def brokenlinkschecker_api(request, *arg, **kwarg):

    brokenLinks =[]
    workingLinks = []

    def updateLinks(link):
        try:
            if link.get('href').startswith('/'):
                linkurl = "https://"+domain+link.get('href')
            else:
                linkurl = link.get('href')
            response = requests.get(linkurl)
            if response.status_code  in range(200, 300):
                workingLinks.append({
                    'Link':f'''{linkurl}''',
                    'Status Code': response.status_code,
                    'type':checkLinkType(linkurl, domain)
                })
            elif response.status_code  in range(400, 600):
                brokenLinks.append({
                    'Link':linkurl,
                    'Status Code': response.status_code,
                    'type':checkLinkType(linkurl, domain)
                })
        except:
            pass
        print(linkurl,"Testing", f"{datetime.now()}")

    if request.method=="GET":
        url = request.GET.get('url')
        try:
            response = requests.get(url)
            domain = urlparse(url).netloc

            if "techgeekbuzz.com" in domain:
                return JsonResponse({'links':False,'Message':f'Sorry! cannot fetch data for this site{url}'})


            if response.status_code in range(200, 300):
                #if the response is parseble
                try:
                    soup = BeautifulSoup(response.text, 'html.parser')
                    # extract all links
                    allLinks = soup.find_all('a')

                    # loop through all the links
                    if allLinks:
                        # using threading
                        with concurrent.futures.ThreadPoolExecutor() as executor:
                            executor.map(updateLinks,allLinks)
                    else:
                        return JsonResponse({'links':False,'Message':f'Failed to connect{url}'})
                except: 
                    return JsonResponse({'links':False,"Message":f"Failed to connect{url}"})
            return JsonResponse({'links':True, 'brokenLinks':brokenLinks, 'workingLinks':workingLinks})
        except:
            return JsonResponse({'links':False,'Message':f'Failed to connect {url}'})

    return JsonResponse({'links':False,"Message":"No Result Found for {url}"})