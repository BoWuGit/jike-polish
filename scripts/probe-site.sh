#!/usr/bin/env bash
set -eu

if (( $# > 2 )); then
  printf 'Usage: bash scripts/probe-site.sh [rounds] [candidate-origin]\n' >&2
  exit 2
fi

rounds=${1:-3}
if [[ ! $rounds =~ ^[1-9][0-9]?$ ]]; then
  printf 'Rounds must be an integer from 1 to 99.\n' >&2
  exit 2
fi

origins=(https://jikepolish.com)
if [[ -n ${2:-} ]]; then
  candidate=${2%/}
  if [[ ! $candidate =~ ^https://[a-zA-Z0-9.-]+(:[0-9]+)?$ ]]; then
    printf 'Provide a candidate HTTPS origin without a path.\n' >&2
    exit 2
  fi
  origins+=("$candidate")
fi

paths=(/ /privacy/ /styles.css /assets/plugin-effect.png /assets/lightbox-multi-zoom.png)
timings='%{http_code}\t%{time_namelookup}\t%{time_connect}\t%{time_appconnect}\t%{time_starttransfer}\t%{time_total}\t%{size_download}'
if command -v sha256sum >/dev/null; then
  hash_command=(sha256sum)
else
  hash_command=(shasum -a 256)
fi
body=$(mktemp)
trap 'rm -f "$body"' EXIT

failed=0
printf 'utc\tround\torigin\tpath\thttp\tdns_s\ttcp_s\ttls_s\tttfb_s\ttotal_s\tbytes\tcurl_exit\tbody_sha256\n'

for ((round = 1; round <= rounds; round++)); do
  first=$(( (round - 1) % ${#origins[@]} ))
  for path in "${paths[@]}"; do
    for ((offset = 0; offset < ${#origins[@]}; offset++)); do
      origin=${origins[(first + offset) % ${#origins[@]}]}
      timestamp=$(date -u +%FT%TZ)
      curl_exit=0
      result=$(curl -q --noproxy '*' --silent --show-error --compressed \
        --connect-timeout 5 --max-time 12 --output "$body" \
        --write-out "$timings" "$origin$path") || curl_exit=$?
      digest=-
      if (( curl_exit == 0 )) && [[ ${result%%$'\t'*} == 200 ]]; then
        checksum=$("${hash_command[@]}" < "$body")
        digest=${checksum%% *}
      else
        failed=1
      fi
      printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$timestamp" "$round" "$origin" "$path" "$result" "$curl_exit" "$digest"
    done
  done
done

exit "$failed"
