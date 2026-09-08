#!/usr/bin/env bash
# Generate WireGuard server + N client configs for BuyMeAShake staging.
# Usage (as root on the VPS):
#   bash generate-wireguard-peers.sh
#   PEER_COUNT=7 VPN_SUBNET=10.10.0 SERVER_ENDPOINT=207.38.88.6 bash generate-wireguard-peers.sh
#
# Outputs:
#   /etc/wireguard/wg0.conf          — server (enables with systemctl)
#   /root/wg-clients/peer1.conf …    — import these in WireGuard apps
#   /root/wg-clients/peers.zip       — optional zip to download via scp
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root" >&2
  exit 1
fi

PEER_COUNT="${PEER_COUNT:-7}"
VPN_SUBNET="${VPN_SUBNET:-10.10.0}"          # results in 10.10.0.0/24
SERVER_IP="${SERVER_IP:-${VPN_SUBNET}.1}"
LISTEN_PORT="${LISTEN_PORT:-51820}"
SERVER_ENDPOINT="${SERVER_ENDPOINT:-}"       # e.g. 207.38.88.6 — auto-detect if empty
CLIENT_DIR="${CLIENT_DIR:-/root/wg-clients}"
WG_DIR=/etc/wireguard

if [[ -z "${SERVER_ENDPOINT}" ]]; then
  SERVER_ENDPOINT="$(curl -4 -s --max-time 5 ifconfig.me || true)"
fi
if [[ -z "${SERVER_ENDPOINT}" ]]; then
  echo "Set SERVER_ENDPOINT=your.public.ip" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y wireguard wireguard-tools zip curl

umask 077
mkdir -p "${WG_DIR}" "${CLIENT_DIR}"
chmod 700 "${WG_DIR}" "${CLIENT_DIR}"

# Fresh server keys (backup old wg0 if present)
if [[ -f "${WG_DIR}/wg0.conf" ]]; then
  cp -a "${WG_DIR}/wg0.conf" "${WG_DIR}/wg0.conf.bak.$(date +%s)"
fi

SERVER_PRIV="$(wg genkey)"
SERVER_PUB="$(printf '%s' "${SERVER_PRIV}" | wg pubkey)"

{
  echo "[Interface]"
  echo "Address = ${SERVER_IP}/24"
  echo "ListenPort = ${LISTEN_PORT}"
  echo "PrivateKey = ${SERVER_PRIV}"
  echo "# Generated $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
} > "${WG_DIR}/wg0.conf"

echo "Server public key: ${SERVER_PUB}"
echo "Endpoint: ${SERVER_ENDPOINT}:${LISTEN_PORT}"
echo "Generating ${PEER_COUNT} client configs in ${CLIENT_DIR}"
echo

rm -f "${CLIENT_DIR}"/peer*.conf "${CLIENT_DIR}/peers.zip" "${CLIENT_DIR}/README.txt"

for i in $(seq 1 "${PEER_COUNT}"); do
  CLIENT_IP="${VPN_SUBNET}.$((i + 1))"   # .2 … .8 for 7 peers
  PRIV="$(wg genkey)"
  PUB="$(printf '%s' "${PRIV}" | wg pubkey)"

  {
    echo "[Peer]"
    echo "# peer${i} — ${CLIENT_IP}"
    echo "PublicKey = ${PUB}"
    echo "AllowedIPs = ${CLIENT_IP}/32"
    echo
  } >> "${WG_DIR}/wg0.conf"

  CONF="${CLIENT_DIR}/peer${i}.conf"
  {
    echo "[Interface]"
    echo "PrivateKey = ${PRIV}"
    echo "Address = ${CLIENT_IP}/24"
    echo "DNS = 1.1.1.1"
    echo
    echo "[Peer]"
    echo "PublicKey = ${SERVER_PUB}"
    echo "Endpoint = ${SERVER_ENDPOINT}:${LISTEN_PORT}"
    echo "AllowedIPs = ${VPN_SUBNET}.0/24"
    echo "PersistentKeepalive = 25"
  } > "${CONF}"

  echo "  peer${i}.conf  →  ${CLIENT_IP}"
done

cat > "${CLIENT_DIR}/README.txt" <<EOF
BuyMeAShake WireGuard clients (${PEER_COUNT})
Server: ${SERVER_ENDPOINT}:${LISTEN_PORT}
VPN:    ${VPN_SUBNET}.0/24 (server ${SERVER_IP})

Each person imports ONE file (peer1.conf … peer${PEER_COUNT}.conf) in the WireGuard app.
Do not share the same file between people.
Do not commit these files to git.

MySQL from VPN example:
  HOST=${SERVER_IP}
  PORT_DB=3306
EOF

( cd "${CLIENT_DIR}" && zip -q peers.zip peer*.conf README.txt )

ufw allow "${LISTEN_PORT}/udp" || true
systemctl enable wg-quick@wg0
systemctl restart wg-quick@wg0
wg show

echo
echo "Done."
echo "  Server conf: ${WG_DIR}/wg0.conf"
echo "  Clients:     ${CLIENT_DIR}/peer1.conf … peer${PEER_COUNT}.conf"
echo "  Zip:         ${CLIENT_DIR}/peers.zip"
echo
echo "Download from your PC:"
echo "  scp root@${SERVER_ENDPOINT}:${CLIENT_DIR}/peer1.conf ."
echo "  scp root@${SERVER_ENDPOINT}:${CLIENT_DIR}/peers.zip ."
echo
echo "MySQL: grant users from ${VPN_SUBNET}.% and bind MySQL to ${SERVER_IP} (or allow 3306 only from VPN)."
