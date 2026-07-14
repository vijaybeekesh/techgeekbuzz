from storages.backends.s3 import S3Storage

class MediaStorage(S3Storage):
    location = "media"
    file_overwrite = False
    default_acl = None