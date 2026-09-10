from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage


class MediaStorage(S3Boto3Storage):
    location = "media"
    file_overwrite = False
    default_acl = None
    querystring_auth = False

    access_key = settings.GCS_HMAC_ACCESS_KEY_ID
    secret_key = settings.GCS_HMAC_SECRET_ACCESS_KEY
    bucket_name = settings.GCS_BUCKET_NAME
    endpoint_url = settings.GCS_S3_ENDPOINT_URL
    region_name = settings.GCS_S3_REGION_NAME
    custom_domain = f"storage.googleapis.com/{settings.GCS_BUCKET_NAME}"
