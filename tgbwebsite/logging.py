from pathlib import Path
from datetime import datetime
BASE_DIR = Path(__file__).resolve().parent.parent
log_file = "log_%s.log" %(datetime.now().date().strftime("%Y_%m_%d"))
LOGGING = {
   'version': 1,
   'disable_existing_loggers': False,
   'formatters': {
       'verbose': {
           'format': '{asctime} - {levelname} - {pathname}:{lineno} - {message}',
           'style': '{',
       },
       'simple': {
           'format': '{levelname} {message}',
           'style': '{',
       },
   },
   'filters': {
       'require_debug_true': {
           '()': 'django.utils.log.RequireDebugTrue',
       },
   },
   'handlers': {
       'console': {
           'level': 'INFO',
           'filters': ['require_debug_true'],
           'class': 'logging.StreamHandler',
           'formatter': 'simple'
       },
       'file': {
           'level': 'INFO',
           'class': 'logging.FileHandler',
           'formatter': 'verbose',
           'filename': str(BASE_DIR) + "/logs/apps/" + log_file
       },
       'mail_log': {
           'level':'DEBUG',
           'class':'logging.handlers.RotatingFileHandler',
           'filename': str(BASE_DIR) + "/logs/apps/" + "mail_log.log",
           'maxBytes': 1024 * 1024 * 1, #Max 10MB
           'backupCount': 9,
           'formatter': 'verbose',
       },
   },
   'loggers': {
       'email_log': {
           'level': 'INFO',
           'handlers': ['mail_log'],
           'propagate': True,
       },
       'django': {
           'handlers': ['file','console'],
           'propagate': True,
       },
   },
}