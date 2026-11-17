import time
from urllib.request import urlopen
# Compile the exercised development routes before timing browser interactions.
urls = ['http://127.0.0.1:5100/ready'] + [
    'http://127.0.0.1:3000' + path
    for path in ['/', '/teams', '/matches', '/predictions', '/analytics', '/demo']
]
for url in urls:
    for attempt in range(90):
        try:
            with urlopen(url, timeout=2) as response:
                if response.status == 200:
                    break
        except OSError:
            pass
        time.sleep(1)
    else:
        raise RuntimeError('Isolated service failed readiness: ' + url)
