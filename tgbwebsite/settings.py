"""
Django settings for tgbwebsite project.
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from tgbwebsite.logging import LOGGING
from tgbwebsite.ckeditor import CKEDITOR_CONFIGS
from django.core.exceptions import ImproperlyConfigured
from tgbwebsite.jazzmins import JAZZMIN_SETTINGS, JAZZMIN_UI_TWEAKS

load_dotenv()
BASE_DIR = Path(__file__).resolve().parent.parent

# ------------------------------------------------------------------------------
# Environment Helpers
# ------------------------------------------------------------------------------

def get_env(key: str, default=None, required=False):
    """
    Read environment variables safely.
    """
    value = os.getenv(key, default)
    if required and not value:
        raise ImproperlyConfigured(
            f"Required environment variable '{key}' is missing."
        )
    return value

# ------------------------------------------------------------------------------
# Security
# ------------------------------------------------------------------------------

SECRET_KEY = get_env("SECRET_KEY", required=True)
TECH_PROD = get_env("TECH_PROD", "no").lower() == "yes"
DEBUG = not TECH_PROD
ALLOWED_HOSTS = ["*"]

if TECH_PROD:
    CSRF_TRUSTED_ORIGINS = [
        "https://techgeekbuzz.com",
        "https://www.techgeekbuzz.com",
    ]
    # SECURE_SSL_REDIRECT = True

# ------------------------------------------------------------------------------
# Installed Apps
# ------------------------------------------------------------------------------

INSTALLED_APPS = [
    "jazzmin",
    "storages",
    # Django Apps
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sitemaps",
    # Project Apps
    "blog",
    "tutorial",
    "users",
    "adsmanager",
    "roadmap",
    "tool",
    "webstories",
    # Third Party
    "tinymce",
    "ckeditor",
    "ckeditor_uploader",
    "crispy_forms",
    "crispy_bootstrap5",
]

# ------------------------------------------------------------------------------
# Middleware
# ------------------------------------------------------------------------------

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "tgbwebsite.urls"
WSGI_APPLICATION = "tgbwebsite.wsgi.application"
APPEND_SLASH = True

# ------------------------------------------------------------------------------
# Templates
# ------------------------------------------------------------------------------

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "blog.blog_preprocessor.popularpost",
                "tutorial.tutorial_preprocessor.alltutorials",
            ]
        },
    }
]

# ------------------------------------------------------------------------------
# Database
# ------------------------------------------------------------------------------

if TECH_PROD:
    DATABASES = {
        "default": {
            "ENGINE": get_env("DATABASE_ENGINE", required=True),
            "NAME": get_env("DATABASE_NAME", required=True),
            "USER": get_env("DATABASE_USER", required=True),
            "PASSWORD": get_env("DATABASE_PASSWORD", required=True),
            "HOST": get_env("DATABASE_HOST", required=True),
            "PORT": get_env("DATABASE_PORT", "3306"),
            "OPTIONS": {
                "charset": "utf8mb4",
            },
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# ------------------------------------------------------------------------------
# Password Validation
# ------------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"
    },
]

# ------------------------------------------------------------------------------
# Internationalization
# ------------------------------------------------------------------------------

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ------------------------------------------------------------------------------
# Crispy Forms
# ------------------------------------------------------------------------------

CRISPY_ALLOWED_TEMPLATE_PACKS = "bootstrap5"
CRISPY_TEMPLATE_PACK = "bootstrap5"

# ------------------------------------------------------------------------------
# CKEditor
# ------------------------------------------------------------------------------

CKEDITOR_UPLOAD_PATH = "uploads/"
CKEDITOR_BASEPATH = "/static/ckeditor/ckeditor/"

CKEDITOR_CONFIGS = CKEDITOR_CONFIGS
CKEDITOR_IMAGE_BACKEND = "pillow"
CKEDITOR_THUMBNAIL_SIZE = (50, 50)
CKEDITOR_FORCE_JPEG_COMPRESSION = True
CKEDITOR_IMAGE_QUALITY = 30
CKEDITOR_RESTRICT_BY_USER = True
CKEDITOR_ALLOW_NONIMAGE_FILES = False

# ------------------------------------------------------------------------------
# Jazzmin
# ------------------------------------------------------------------------------

JAZZMIN_SETTINGS = JAZZMIN_SETTINGS
JAZZMIN_UI_TWEAKS = JAZZMIN_UI_TWEAKS

# ------------------------------------------------------------------------------
# Logging
# ------------------------------------------------------------------------------

LOGGING = LOGGING

# ------------------------------------------------------------------------------
# Default PK
# ------------------------------------------------------------------------------

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ------------------------------------------------------------------------------
# Static / Media
# ------------------------------------------------------------------------------

AWS_ACCESS_KEY_ID = get_env("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = get_env("AWS_SECRET_ACCESS_KEY")
AWS_STORAGE_BUCKET_NAME = get_env("AWS_STORAGE_BUCKET_NAME")
AWS_S3_REGION_NAME = get_env("AWS_S3_REGION_NAME")


AWS_S3_SIGNATURE_VERSION = "s3v4"
AWS_S3_FILE_OVERWRITE = False
AWS_DEFAULT_ACL = None
AWS_QUERYSTRING_AUTH = False
AWS_S3_VERIFY = True

# STORAGES = {
#     "default": {
#         "BACKEND": "tgbwebsite.storages.MediaStorage",
#     },
#     "staticfiles": {
#         "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
#     },
# }
DEFAULT_FILE_STORAGE = "tgbwebsite.storages.MediaStorage"

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]
# MEDIA_URL = "/media/"
# MEDIA_ROOT = BASE_DIR / "media"
# AWS_LOCATION = "media"
AWS_S3_CUSTOM_DOMAIN = (
    f"{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_S3_REGION_NAME}.amazonaws.com"
)
MEDIA_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/media/"