#!/usr/bin/env python3
"""把多檔版（index.html + css/ + js/ + icon）內嵌打包成單一 HTML 檔。
用法：python3 build.py
輸出：澂澂的圍棋時光屋.html（可離線、平板點開即玩）
"""
import re
import base64
import os

OUT = '澂澂的圍棋時光屋.html'
JS_ORDER = [
    'js/engine.js', 'js/render.js', 'js/ai.js',
    'js/fx.js', 'js/vs.js', 'js/practice.js'
]


def main():
    html = open('index.html', encoding='utf-8').read()

    # 內嵌 CSS
    css = open('css/style.css', encoding='utf-8').read()
    html = html.replace(
        '<link rel="stylesheet" href="css/style.css">',
        '<style>\n' + css + '\n</style>'
    )

    # 內嵌 JS（依載入順序）
    for js in JS_ORDER:
        code = open(js, encoding='utf-8').read()
        tag = '<script src="%s"></script>' % js
        assert tag in html, '找不到 script 標籤: ' + tag
        html = html.replace(tag, '<script>\n' + code + '\n</script>')

    # 內嵌圖示為 data URI
    b180 = base64.b64encode(open('icon-180.png', 'rb').read()).decode()
    html = html.replace('href="icon-180.png"',
                        'href="data:image/png;base64,' + b180 + '"')

    # 平板優化 meta
    html = html.replace(
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0, '
        'maximum-scale=1.0, user-scalable=no">\n'
        '  <meta name="apple-mobile-web-app-capable" content="yes">\n'
        '  <meta name="mobile-web-app-capable" content="yes">'
    )

    open(OUT, 'w', encoding='utf-8').write(html)

    leftover = re.findall(r'(?:href="css|src="js|href="icon)', html)
    assert not leftover, '仍有外部引用: %s' % leftover
    print('✅ 打包完成 %s（%.1f KB，0 外部引用）'
          % (OUT, os.path.getsize(OUT) / 1024))


if __name__ == '__main__':
    main()
