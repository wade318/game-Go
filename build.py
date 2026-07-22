#!/usr/bin/env python3
"""把多檔版內嵌打包成單一 HTML 檔（離線可玩、平板/墨水裝置點開即用）。
用法：python3 build.py
輸出：
  澂澂的圍棋時光屋.html        彩色完整版（含特效音效）
  澂澂的圍棋時光屋-墨水版.html   墨水閱讀器版（黑白高對比、無特效）
"""
import re
import base64
import os

COLOR_JS = ['js/engine.js', 'js/render.js', 'js/ai.js',
            'js/fx.js', 'js/vs.js', 'js/practice.js']
EINK_JS = ['js/engine.js', 'js/render.js', 'js/ai.js',
           'js/vs.js', 'js/practice.js']  # 墨水版不載入 fx.js


def build(html_path, css_path, js_order, out, lock_zoom):
    html = open(html_path, encoding='utf-8').read()

    css = open(css_path, encoding='utf-8').read()
    link = '<link rel="stylesheet" href="%s">' % css_path
    assert link in html, '找不到樣式連結: ' + link
    html = html.replace(link, '<style>\n' + css + '\n</style>')

    for js in js_order:
        code = open(js, encoding='utf-8').read()
        tag = '<script src="%s"></script>' % js
        assert tag in html, '找不到 script 標籤: ' + tag
        html = html.replace(tag, '<script>\n' + code + '\n</script>')

    b180 = base64.b64encode(open('icon-180.png', 'rb').read()).decode()
    html = html.replace('href="icon-180.png"',
                        'href="data:image/png;base64,' + b180 + '"')

    # 平板／裝置 meta：彩色版鎖縮放；墨水版允許縮放以利閱讀
    scale = 'maximum-scale=1.0, user-scalable=no' if lock_zoom else 'user-scalable=yes'
    html = html.replace(
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0, '
        + scale + '">\n'
        '  <meta name="apple-mobile-web-app-capable" content="yes">\n'
        '  <meta name="mobile-web-app-capable" content="yes">'
    )

    open(out, 'w', encoding='utf-8').write(html)
    leftover = re.findall(r'(?:href="css|src="js|href="icon)', html)
    assert not leftover, '仍有外部引用: %s' % leftover
    print('✅ %s（%.1f KB，0 外部引用）' % (out, os.path.getsize(out) / 1024))


def main():
    build('index.html', 'css/style.css', COLOR_JS,
          '澂澂的圍棋時光屋.html', lock_zoom=True)
    build('index-eink.html', 'css/style-eink.css', EINK_JS,
          '澂澂的圍棋時光屋-墨水版.html', lock_zoom=False)


if __name__ == '__main__':
    main()
