
JAZZMIN_UI_TWEAKS = {
    "navbar_small_text": False,
    "footer_small_text": False,
    "body_small_text": False,
    "brand_small_text": False,
    "brand_colour": "navbar-navy",
    "accent": "accent-pink",
    "navbar": "navbar-primary navbar-dark",
    "no_navbar_border": False,
    "navbar_fixed": True,
    "layout_boxed": False,
    "footer_fixed": False,
    "sidebar_fixed": True,
    "sidebar": "sidebar-dark-navy",
    "sidebar_nav_small_text": False,
    "sidebar_disable_expand": False,
    "sidebar_nav_child_indent": False,
    "sidebar_nav_compact_style": False,
    "sidebar_nav_legacy_style": False,
    "sidebar_nav_flat_style": False,
    "theme": "default",
    "dark_mode_theme": None,
    "button_classes": {
        "primary": "btn-outline-primary",
        "secondary": "btn-outline-secondary",
        "info": "btn-outline-info",
        "warning": "btn-outline-warning",
        "danger": "btn-outline-danger",
        "success": "btn-outline-success"
    },
    "actions_sticky_top": True
}
JAZZMIN_SETTINGS = {
    # title of the window (Will default to current_admin_site.site_title if absent or None)
    "site_title": "TechGeekBuzz Admin",

    # Title on the login screen (19 chars max) (defaults to current_admin_site.site_header if absent or None)
    "site_header": "TechgeekBuzz",

    # Title on the brand (19 chars max) (defaults to current_admin_site.site_header if absent or None)
    "site_brand": "TechgeekBuzz",

    # Logo to use for your site, must be present in static files, used for brand on top left
    "site_logo": "images\cropped-Techgeekbuzz-Final-Logo-e1611249305805.png",

    # CSS classes that are applied to the logo above
    "site_logo_classes": "img-circle",

    # Relative path to a favicon for your site, will default to site_logo if absent (ideally 32x32 px)
    "site_icon": "images\cropped-Techgeekbuzz-Final-Logo-e1611249305805.png",

    # Welcome text on the login screen
    "welcome_sign": "Welcome to the Techgeekbuzz",

    # Copyright on the footer
    "copyright": "TEchgeekbuzz Library Ltd",

    # The model admin to search from the search bar, search bar omitted if excluded
    "search_model": "blog.post" ,

    # Field name on user model that contains avatar ImageField/URLField/Charfield or a callable that receives the user
    # "user_avatar": lambda u: u.profile.profile_picture.url if u.profile else "",

    ############
    # Top Menu #
    ############

    # Links to put along the top menu
    "topmenu_links": [

        # Url that gets reversed (Permissions can be added)
        {"name": "Visit Website",  "url": "index","new_window": True},
        {"name": "Home",  "url": "admin:index", "permissions": ["auth.view_user"]},
         {"app": "blog"},
          {"app": "tutorial"},

        # external url that opens in a new window (Permissions can be added)
        # {"name": "Support", "url": "https://github.com/farridav/django-jazzmin/issues", "new_window": True},

        # model admin to link to (Permissions checked against model)
        {"model": "auth.User"},

        # App with dropdown menu to all its models pages (Permissions checked against models)
      
    ],

    #############
    # User Menu #
    #############

    # Additional links to include in the user menu on the top right ("app" url type is not allowed)
    "usermenu_links": [
        # {"name": "Support", "url": "https://github.com/farridav/django-jazzmin/issues", "new_window": True},
        {"model": "auth.user"}
    ],

    #############
    # Side Menu #
    #############

    # Whether to display the side menu
    "show_sidebar": True,

    # Whether to aut expand the menu
    "navigation_expanded": True,

    # Hide these apps when generating side menu e.g (auth)
    "hide_apps": [],

    # Hide these models when generating side menu (e.g auth.user)
    "hide_models": [],

    # List of apps (and/or models) to base side menu ordering off of (does not need to contain all apps/models)
    "order_with_respect_to": ["auth","users","users.userprofile" ,"blog", "blog.post", "blog.category",
                             'tutorial', 'tutorial.tutorial', 'tutorial.tutorialarticle',
                              "adsmanager", "adsmanager.insideads",
                              "roadmap", "roadmap.roadmap", "roadmap.roadmaplist",
                              "webstories","webstories.webstory", ""
                              ],

    # Custom links to append to app groups, keyed on app name
    # "custom_links": {
    #     "blog": [{
    #         "name": "Make Messages", 
    #         "url": "blog.comment", 
    #         "icon": "fas fa-comments",
    #         "permissions": ["blog.view_book"]
    #     }]
    # },

    # Custom icons for side menu apps/models See https://fontawesome.com/icons?d=gallery&m=free&v=5.0.0,5.0.1,5.0.10,5.0.11,5.0.12,5.0.13,5.0.2,5.0.3,5.0.4,5.0.5,5.0.6,5.0.7,5.0.8,5.0.9,5.1.0,5.1.1,5.2.0,5.3.0,5.3.1,5.4.0,5.4.1,5.4.2,5.13.0,5.12.0,5.11.2,5.11.1,5.10.0,5.9.0,5.8.2,5.8.1,5.7.2,5.7.1,5.7.0,5.6.3,5.5.0,5.4.2
    # for the full list of 5.13.0 free icon classes
    "icons": {
        "auth": "fas fa-users-cog",
        "auth.user": "fas fa-user",
        "users.userprofile": "fas fa-image",
        "users.subscriber": "fas fa-plus",
        "auth.Group": "fas fa-users",
        'blog.post':"fas fa-book-open",
        'blog.category':"fas fa-list",
        'blog.comment':"fas fa-comments",
        'blog.postimage':"fas fa-camera",
        'tutorial.tutorial': "fas fa-chalkboard",
        'tutorial.tutorialarticle': "fas fa-book",
        "adsmanager.insideads": "fas fa-plus",
        "roadmap.roadmap": "fas fa-road",
        "roadmap.roadmaplist": "fas fa-list",
        "webstories.webstory":"fas fa-globe",


    },
    # Icons that are used when one is not manually specified
    "default_icon_parents": "fas fa-chevron-circle-right",
    "default_icon_children": "fas fa-circle",

    #################
    # Related Modal #
    #################
    # Use modals instead of popups
    "related_modal_active": False,

    #############
    # UI Tweaks #
    #############
    # Relative paths to custom CSS/JS scripts (must be present in static files)
    "custom_css": None,
    "custom_js": None,
    # Whether to show the UI customizer on the sidebar
    "show_ui_builder": False,

    ###############
    # Change view #
    ###############
    # Render out the change view as a single form, or in tabs, current options are
    # - single
    # - horizontal_tabs (default)
    # - vertical_tabs
    # - collapsible
    # - carousel
    "changeform_format": "horizontal_tabs",
    # override change forms on a per modeladmin basis
    # "changeform_format_overrides": {"auth.user": "collapsible", "auth.group": "vertical_tabs"},
    # Add a language dropdown into the admin
    # "language_chooser": True,
}

# JAZZMIN_SETTINGS["show_ui_builder"] = True