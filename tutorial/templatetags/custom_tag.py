from django import template

register = template.Library()
@register.filter()
def modify_tutorial(value):
    value= value.lower()
    value = value.replace(" ", "-")
    return value
