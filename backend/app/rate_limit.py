from slowapi import Limiter
from slowapi.util import get_remote_address

# In-memory, per-process limiter — fine for this app's single-instance
# deployment. Protects login (brute force) and the two email-sending auth
# endpoints (forgot-password/resend-verification) from being used to spam a
# victim's inbox or exhaust the app's real Gmail SMTP sender.
limiter = Limiter(key_func=get_remote_address)
