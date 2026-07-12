from django import template

register = template.Library()

def modify_space(value):
    string_modify = ""
    for i in value:
        if i ==" ":
            string_modify += "&nbsp;"
        elif i=="\n":
            string_modify += "<br/>"
        else:
            string_modify += i    
    return string_modify
    
register.filter('modify_space', modify_space)