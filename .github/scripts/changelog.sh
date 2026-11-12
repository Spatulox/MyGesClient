#!/usr/bin/env bash
# Affiche la section de CHANGELOG.md correspondant à un tag.
#
#   changelog.sh <tag> [CHANGELOG.md]
#
# Cherche un titre "## <tag>" (ex. "## v1.2.0_beta", "## [v1.2.0_beta] - 2026-11-12"),
# puis, à défaut, "## v1.2.0" ou "## 1.2.0". Renvoie le code 1 si rien n'est trouvé.
set -euo pipefail

tag="${1:?usage: changelog.sh <tag> [CHANGELOG.md]}"
file="${2:-CHANGELOG.md}"

[ -f "$file" ] || { echo "Fichier introuvable : $file" >&2; exit 1; }

extract() {
  awk -v want="$1" '
    /^## / {
      if (found) exit
      key = $2
      gsub(/[][]/, "", key)
      if (key == want) { found = 1; next }
    }
    found {
      lines[++n] = $0
      if ($0 ~ /[^[:space:]]/) { if (!first) first = n; last = n }
    }
    END {
      for (i = first; first && i <= last; i++) print lines[i]
      exit !found
    }
  ' "$file"
}

version="${tag%%_*}"   # v1.2.0_beta -> v1.2.0
version="${version#v}" # v1.2.0      -> 1.2.0

for key in "$tag" "v$version" "$version"; do
  if extract "$key"; then
    exit 0
  fi
done

echo "Pas d'entrée CHANGELOG pour $tag" >&2
exit 1
