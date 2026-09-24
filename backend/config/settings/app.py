ZARINPAL = {
    "MERCHANT_ID": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",  
    "REQUEST_URL": "https://sandbox.zarinpal.com/pg/v4/payment/request.json",
    "START_PAY_URL": "https://sandbox.zarinpal.com/pg/StartPay/",
    "VERIFY_URL": "https://sandbox.zarinpal.com/pg/v4/payment/verify.json",
    "CALLBACK_URL": "http://localhost:3000/profile/subscription/callback/",
}

OTP_SETTINGS = {
    "OTP_REDIS_KEY": "otp:{}",
    "OTP_ATTEMPT_REDIS_KEY": "otp:attempt:{}",
    "OTP_BLACKLISTED_REDIS_KEY": "otp:blacklisted:{}",
    "PASS_ATTEMPT_REDIS_KEY": "pass:attempt:{}",
    "PASS_BLACKLISTED_REDIS_KEY": "pass:blacklisted:{}",
    "OTP_DEFAULT_LENGTH" : 5,
    "OTP_TTL" : 120,
    "ATTEMPT_TTL" : 300,
    "BLACKLIST_TTL" : 180,
    "MAX_ATTEMPTS" : 3,
}

MANHWA_REDIS_KEYS = {
    "MANHWA_VIEWERS_ID": "manhwa:{}:viewers_id", 
    "MANHWA_RATING_DATA": 'manhwa:{}:rating_data',
    "VIEWED_MANHWAS_ID": "viewed:manhwas_id",
}