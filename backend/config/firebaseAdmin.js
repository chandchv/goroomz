const admin = require('firebase-admin');

const serviceAccount = {
  "type": "service_account",
  "project_id": "goroomz-4ac3c",
  "private_key_id": "e6778afe5174984f716d0e883ff6cecd41c2e1d1",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCwvB1pvBI1BDZP\n/hfrLSyEnvcguKyfGv4VBlwgKp+kPiDJLmUZNBzKsBESdXdytNqTT0MrxAf/xfJd\nAISz1cV6rdsSgdxY6+5LUIOQhfLYagl3b8VRIyuFsg4UfYwdw1/TrfvzuisZ4exf\nn1KXhZarlk/PYHce3WCx5xUuzCMeMWZtGy8IrG4OphwZeg1jjnr6uQIUedV8iiKI\nN5qd1vKnsXQ4cTPQzQHXjAPzzzSkwcKOIi4Kx3OFfmqLcOnTKLIwuXKqQTKcyBJW\nmL7i2Lrar3zBgmsjT/PvuT1aU/IPdkKOS1tE0xYUu4IHRw+OMCn3X5oSwtKfHwx+\ny5n8x1plAgMBAAECggEAHwXmY9kPmR7UKdaAfFfBqMX+u0+vfX5Pe4FSSpMw0rPV\nLXtnY7UyGKIvXP4hqZD1jUYslFIk1VD56jldEfREZfR+sBD7jOBdQ/suHQBmUHbM\nkpqcGFIEIcPPlOk030ScXZv8zhuv1StDQsXEybQ5boVEHTLhthlGD/RwU3ah83qN\nhsjlvVScbEdpmGGSZ6ehaQkiK5ScjMmGW7G8EbIaLtHT37K9QfPE1DKWGScjs5sg\nJEeQnq51W8dwq86J5l29l05EzKwiwQeR2dEsl4n+8OhVsKW0PPg2VJtLFPLg8uuz\nkmqQQ8lq7/pBJ1JaYjy0Mg/OX8ALin9EeehVDeneAQKBgQDmThr1kaNkceGf2j/y\nVFC8nWyyYO42xsO0Dzr/i3OvHLkaJdeKprfARYybmqSBklguIazeDzruNxyure+d\nXSO6fNo98g8K2Lt0dtQe+kGd5LnRtLDEMGTwcQolomtq4vpyMaugR6bsZlvtjdWj\nxn/IAg2A7p+FpqWul/ojDRKOGQKBgQDEc/QyNJRkYqVg1fGWZ1F7DmBbWJoJfnPC\nBzoHlzwwptSv2MXg9biIPzqjjCS3diHuKVludsNDNYeN3M+AsPQlKiwzDUVlEctl\nOzSjRnDfHxl7ftuDSM4ZpAh32LXWcaHETEmBs5xY06Sg5qwhnpXkTNHpFZM0hkwr\n2bcj1nNgLQKBgQDMvICg8HC1ubufVPFmJ2iC1Nwtk5gRoA+YgbWsObeE4972DNAZ\nlW5jAjEmn4pBGe1ETXGVEysLXHkmHMCYP5WkkpudWBPhS50RwxV92HH+wLgkYiKG\ntpL1YThpDoO5yMBmRhvR6ADPxYtRmrZi2vL7xj9k8D1mHijKFpcrE9L7+QKBgHDB\n3Tez1jiIJkQeiDu7sZjf9452nHM2kVqcq0IQHAwQtaL42Rr17qTFJfMZTTnAJFl+\ngkZVBF5fKx7RzogfCQML4bKru1j3jbbc9KmClOZ8AzRO68++yg0NiY7AZB5humfh\nIY/Ad8zELYns3H+vdnlDXnhaWdOcAbxpiiSXwkFBAoGAd4Qf6fIxOCm0V/3nBJ3I\nOvr0LLuoV5/pKY9qcixxq2jhyrCTkx8BHSgLDJBzBLUhKGvDlA+mmimVPGmAZVpA\nHFovJ6UHgW+R4ywspo7Sd+2v1RE+fvLujLO6bhlZY+vGGMf1YHixm2TMEe1sdRgk\nWro++G7Y1ROowhcuFvZCB9E=\n-----END PRIVATE KEY-----\n".replace(/\\n/g, '\n'),
  "client_email": "firebase-adminsdk-fbsvc@goroomz-4ac3c.iam.gserviceaccount.com",
  "client_id": "105863748418526919397",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40goroomz-4ac3c.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;
