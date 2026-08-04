from multiprocessing import context
from django.shortcuts import render, get_object_or_404
from .models import *
# Create your views here.

def tools(request):
    return render(request, 'tool/tools.html')

def brokenlinkschecker(request):
    if request.method == "GET":
        return render(request, "tool/brokenlinkschecker.html")

def passwordgenerator(request):
    return render(request, 'tool/passwordgenerator.html')

def xmltojson(request):
    return render(request, "tool/xmltojson.html")

def gstcalculator(request):
    return render(request, 'tool/gstcalculator.html')

def markdowntohtml(request):
    return render(request, 'tool/markdowntohtml.html')

def ppfcalculator(request):
    return render(request, 'tool/ppfcalculator.html')

def seotitlegenerator(request):
    return render(request, 'tool/seotitlegenerator.html')