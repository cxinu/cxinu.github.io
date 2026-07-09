#!/usr/bin/env bash

rm -rf public && mkdir -p public/posts
cp -r static/* public/

frontmatter() {
    python3 -c "
import sys, re
with open(sys.argv[1]) as f:
    m = re.match(r'^---\s*\n(.*?)\n---', f.read(), re.DOTALL)
if not m:
    if len(sys.argv) > 2: print('')
    sys.exit(0)
result = {}
for line in m.group(1).split('\n'):
    line = line.strip()
    if ':' in line:
        key, val = line.split(':', 1)
        result[key.strip()] = val.strip().strip('\"').strip(\"'\")
if len(sys.argv) > 2:
    print(result.get(sys.argv[2], ''))
else:
    print(result)
" "$@"
}

post_entries=""

for md in content/posts/*.md; do
    if [ -f "$md" ]; then
        slug=$(basename "$md" .md)
        title=$(frontmatter "$md" title)
        date=$(frontmatter "$md" date)
        banner=$(frontmatter "$md" banner)
        banner_alt=$(frontmatter "$md" banner-alt)
        tagline=$(frontmatter "$md" tagline)

        [ -z "$title" ] && title="$slug"
        [ -z "$date" ] && date=$(date -r "$md" "+%Y-%m-%d")

        pandoc "$md" \
            --from=gfm \
            --to=html5 \
            --template=templates/post.html \
            --highlight-style=pygments \
            --standalone \
            --variable=banner="$banner" \
            --variable=banner-alt="$banner_alt" \
            --variable=tagline="$tagline" \
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
    --variable=posts_heading="All Posts" \
    --variable=gol="1" \
    -o public/posts/index.html

# Build index
# I do not know What the fuck is this for or why is it here
index_title=$(frontmatter content/index.md title)
index_banner=$(frontmatter content/index.md banner)
index_banner_alt=$(frontmatter content/index.md banner-alt)
index_tagline=$(frontmatter content/index.md tagline)
index_intro=$(frontmatter content/index.md intro)

[ -z "$index_title" ] && index_title="cxinu"

pandoc content/index.md \
    --from=gfm \
    --to=html5 \
    --template=templates/home.html \
    --highlight-style=pygments \
    --standalone \
    --variable=title="$index_title" \
    --variable=banner="$index_banner" \
    --variable=banner-alt="$index_banner_alt" \
    --variable=tagline="$index_tagline" \
    --variable=intro="$index_intro" \
    --variable=posts_list="$posts_list" \
    --variable=posts_heading="Recent Posts" \
    -o public/index.html

# Build readme
if [ -f content/readme.md ]; then
    pandoc content/readme.md \
        --from=gfm \
        --to=html5 \
        --template=templates/home.html \
        --highlight-style=pygments \
        --standalone \
        --variable=title="README" \
        -o public/readme.html
fi

echo "built in ./public"
