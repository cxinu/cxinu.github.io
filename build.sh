#!/usr/bin/env bash

rm -rf public && mkdir -p public/posts
cp -r static/* public/

post_entries=""

for md in content/posts/*.md; do
    if [ -f "$md" ]; then
        slug=$(basename "$md" .md)
        title=$(pandoc "$md" -t json | jq -r '.meta.title.c | map(.c // " ") | join("")' 2>/dev/null)
        date=$(pandoc "$md" -t json | jq -r '.meta.date.c | map(.c // " ") | join("")' 2>/dev/null)

        [[ "$title" == "null" ]] && title=""
        [[ "$date" == "null" ]] && date=""

        # Fallbacks
        [ -z "$title" ] && title="$slug"
        [ -z "$date" ] && date=$(date -r "$md" "+%Y-%m-%d")

        pandoc "$md" \
            --from=gfm \
            --to=html5 \
            --template=templates/post.html \
            --highlight-style=pygments \
            --standalone \
            -o "public/posts/$slug.html"

        post_entries+="$date|$slug|$title"$'\n'
    fi
done

sorted_entries=$(echo -e "$post_entries" | sort -rn)

posts_list="<ul class='post-list'>"
while IFS='|' read -r p_date p_slug p_title; do
    [ -z "$p_slug" ] && continue
    posts_list+="<li><span class='date'>$p_date</span> <a href='/posts/$p_slug.html'>$p_title</a></li>"
done <<<"$sorted_entries"
posts_list+="</ul>"

# Build archive (/posts/)
echo "" | pandoc \
    --from=gfm --to=html5 \
    --template=templates/home.html \
    --variable=posts_list="$posts_list" \
    --variable=title="Archive" \
    -o public/posts/index.html

# Build index
pandoc content/index.md \
    --from=gfm \
    --to=html5 \
    --template=templates/home.html \
    --highlight-style=pygments \
    --standalone \
    --variable=posts_list="$posts_list" \
    -o public/index.html

# Build readme
if [ -f content/readme.md ]; then
    pandoc content/readme.md \
        --from=gfm \
        --to=html5 \
        --template=templates/home.html \
        --highlight-style=pygments \
        --standalone \
        -o public/readme.html
fi

echo "built in ./public"
