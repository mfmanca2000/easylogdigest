"""
Log simulator: pushes realistic multi-app, multi-env error logs to Loki every INTERVAL_SECONDS.
Deliberately reuses the same error templates across runs so EasyLogDigest's "recurring vs new"
fingerprinting can be exercised from the first digest.
"""

import json
import os
import random
import time
import uuid
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.error import URLError

LOKI_URL = os.environ.get("LOKI_URL", "http://loki:3100")
INTERVAL = int(os.environ.get("INTERVAL_SECONDS", "30"))

APPS = ["payments-service", "auth-service", "api-gateway", "notification-service"]
ENVS = ["production", "staging"]

# Error templates — use {uuid}, {ip}, {id}, {ms} as dynamic placeholders
ERROR_TEMPLATES = [
    "ERROR connection refused to database at {ip}:5432 after {ms}ms",
    "ERROR NullPointerException at com.example.PaymentProcessor.process(PaymentProcessor.java:{id})",
    "ERROR timeout waiting for response from upstream service after {ms}ms",
    "ERROR java.lang.OutOfMemoryError: Java heap space at com.example.Worker.run(Worker.java:{id})",
    "ERROR invalid JWT token: token expired at {uuid}",
    "ERROR HTTP 500 Internal Server Error from downstream /api/v1/orders/{id}",
    "ERROR failed to connect to Redis at {ip}:6379: connection refused",
    "ERROR database deadlock detected on transaction {uuid}",
    "ERROR SSL certificate verification failed for host {ip}: certificate has expired",
    "ERROR rate limit exceeded: 429 Too Many Requests from {ip}",
    "ERROR failed to parse JSON response: unexpected token at position {id}",
    "ERROR disk quota exceeded: no space left on device (used {id}MB of {id}MB)",
    "ERROR authentication failed for user with session {uuid}: invalid credentials",
    "ERROR unhandled exception in worker thread-{id}: IndexOutOfBoundsException",
    "ERROR failed to send email notification to {id} recipients: SMTP connection refused",
]

# Info and warn templates to fill out realistic volume
INFO_TEMPLATES = [
    "INFO request processed in {ms}ms status=200",
    "INFO user {uuid} logged in from {ip}",
    "INFO database connection pool: {id}/{id} connections active",
    "INFO cache hit ratio: {id}%",
    "INFO processed {id} messages from queue",
]

WARN_TEMPLATES = [
    "WARN slow query detected: {ms}ms for SELECT * FROM orders",
    "WARN retry attempt {id}/3 for external API call",
    "WARN memory usage at {id}% of limit",
    "WARN deprecated API endpoint /v1/legacy called by {ip}",
]


def rand(template: str) -> str:
    """Fill in dynamic placeholders with random values."""
    return (
        template
        .replace("{uuid}", str(uuid.uuid4()))
        .replace("{ip}", f"{random.randint(10,192)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}")
        .replace("{id}", str(random.randint(100, 99999)))
        .replace("{ms}", str(random.randint(1000, 30000)))
    )


def ns_now() -> str:
    """Current time as nanosecond unix timestamp string."""
    return str(int(datetime.now(timezone.utc).timestamp() * 1_000_000_000))


def build_streams() -> list:
    streams = []
    for app in APPS:
        for env in ENVS:
            values = []
            n_info = random.randint(20, 60)
            n_warn = random.randint(3, 10)
            # Pick 3-7 error templates (repeating the same base templates so fingerprinting works)
            error_templates = random.choices(ERROR_TEMPLATES, k=random.randint(3, 7))

            for _ in range(n_info):
                values.append([ns_now(), rand(random.choice(INFO_TEMPLATES))])
                time.sleep(0.001)  # ensure unique nanosecond timestamps

            for _ in range(n_warn):
                values.append([ns_now(), rand(random.choice(WARN_TEMPLATES))])
                time.sleep(0.001)

            for tmpl in error_templates:
                count = random.randint(1, 8)
                for _ in range(count):
                    values.append([ns_now(), rand(tmpl)])
                    time.sleep(0.001)

            streams.append({
                "stream": {"app": app, "env": env, "level": "mixed"},
                "values": values,
            })
    return streams


def push_to_loki(streams: list) -> None:
    payload = json.dumps({"streams": streams}).encode()
    req = Request(
        f"{LOKI_URL}/loki/api/v1/push",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(req, timeout=10) as resp:
            print(f"[simulator] pushed {sum(len(s['values']) for s in streams)} log lines → HTTP {resp.status}")
    except URLError as e:
        print(f"[simulator] push failed: {e}")


def main():
    print(f"[simulator] starting — pushing logs every {INTERVAL}s to {LOKI_URL}")
    while True:
        try:
            streams = build_streams()
            push_to_loki(streams)
        except Exception as e:
            print(f"[simulator] error: {e}")
        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
