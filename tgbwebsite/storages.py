from django.conf import settings
from storages.backends.gcloud import GoogleCloudStorage


class MediaStorage(GoogleCloudStorage):
    location = "media"
    file_overwrite = False
    default_acl = None
    querystring_auth = False

    project_id = settings.GS_PROJECT_ID
    bucket_name = settings.GCS_BUCKET_NAME
