"""
SSRF Guard – validates URLs before the audit engine fetches them.

Blocks:
- Non-HTTP/HTTPS schemes
- Private / loopback / link-local / metadata-service IP ranges
- Hostnames that resolve to blocked IPs
"""

from __future__ import annotations

import ipaddress
import socket
from typing import Tuple
from urllib.parse import urlparse

# ---------------------------------------------------------------------------
# Blocked IP ranges (RFC 1918, loopback, link-local, APIPA, IPv6 private)
# ---------------------------------------------------------------------------
BLOCKED_RANGES = [
    ipaddress.ip_network("127.0.0.0/8"),       # IPv4 loopback
    ipaddress.ip_network("10.0.0.0/8"),         # RFC 1918
    ipaddress.ip_network("172.16.0.0/12"),      # RFC 1918
    ipaddress.ip_network("192.168.0.0/16"),     # RFC 1918
    ipaddress.ip_network("169.254.0.0/16"),     # APIPA / AWS metadata
    ipaddress.ip_network("100.64.0.0/10"),      # Shared address space
    ipaddress.ip_network("0.0.0.0/8"),          # This network
    ipaddress.ip_network("::1/128"),            # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),           # IPv6 unique local
    ipaddress.ip_network("fe80::/10"),          # IPv6 link-local
]

# Explicit blocked IPs (e.g. cloud metadata services)
BLOCKED_IPS: set[str] = {
    "169.254.169.254",  # AWS / GCP / Azure metadata
    "metadata.google.internal",
}

ALLOWED_SCHEMES = {"http", "https"}


def _ip_is_blocked(ip_str: str) -> bool:
    """Return True if the IP string falls within any blocked range."""
    try:
        addr = ipaddress.ip_address(ip_str)
        for net in BLOCKED_RANGES:
            if addr in net:
                return True
        return False
    except ValueError:
        # Can't parse as IP → treat as blocked to be safe
        return True


def resolve_and_validate(hostname: str) -> Tuple[bool, str]:
    """
    Resolve *hostname* to IP addresses and verify none are in blocked ranges.
    Returns (is_safe, reason).
    """
    if hostname in BLOCKED_IPS:
        return False, f"Hostname '{hostname}' is explicitly blocked."

    try:
        results = socket.getaddrinfo(hostname, None)
    except socket.gaierror as exc:
        return False, f"DNS resolution failed for '{hostname}': {exc}"

    for family, _type, _proto, _canonname, sockaddr in results:
        ip = sockaddr[0]
        if ip in BLOCKED_IPS:
            return False, f"Resolved IP '{ip}' is explicitly blocked."
        if _ip_is_blocked(ip):
            return False, (
                f"Resolved IP '{ip}' for hostname '{hostname}' "
                "falls within a private/reserved network range."
            )

    return True, "ok"


def validate_url(url: str) -> Tuple[bool, str]:
    """
    Full URL validation:
    1. Must parse correctly.
    2. Scheme must be http or https.
    3. Must have a non-empty hostname.
    4. Hostname / resolved IPs must not be in blocked ranges.

    Returns (is_safe, reason).
    """
    try:
        parsed = urlparse(url)
    except Exception as exc:
        return False, f"URL parse error: {exc}"

    if parsed.scheme.lower() not in ALLOWED_SCHEMES:
        return False, (
            f"Scheme '{parsed.scheme}' is not allowed. "
            "Only http and https are permitted."
        )

    hostname = parsed.hostname
    if not hostname:
        return False, "URL has no hostname."

    # Check raw hostname string against explicit block list
    if hostname in BLOCKED_IPS:
        return False, f"Hostname '{hostname}' is explicitly blocked."

    # If hostname is already an IP address, check it directly
    try:
        addr = ipaddress.ip_address(hostname)
        if _ip_is_blocked(str(addr)):
            return False, (
                f"IP address '{hostname}' is in a private/reserved range."
            )
        # Numeric IP passed; skip DNS resolution
        return True, "ok"
    except ValueError:
        pass  # Not a numeric IP – fall through to DNS check

    return resolve_and_validate(hostname)
