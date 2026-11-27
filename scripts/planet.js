'use strict'

/**
 * 知识星球：把 source/_posts 里的文章导出成 /assets/planet/docs.json。
 *
 * 星球页（/assets/planet/planet.js）只从这份 JSON 取节点数据，
 * 所以以后新增 md 文件、重新构建（hexo generate / Vercel）后，
 * 星球上会自动多出一个节点，不需要手改页面。
 *
 * Hexo 8 的 scripts 是裸脚本（hexo 作为参数注入），不能写 module.exports。
 */

// 去掉 HTML 标签，压成一行纯文本，用作没有 description 时的摘要兜底
function toPlainText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<pre[\s\S]*?<\/pre>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#x([0-9a-f]+);/gi, function (m, hex) {
      return String.fromCharCode(parseInt(hex, 16))
    })
    .replace(/&#(\d+);/g, function (m, dec) {
      return String.fromCharCode(parseInt(dec, 10))
    })
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(text, max) {
  const t = String(text || '').trim()
  if (!t) return ''
  return t.length > max ? t.slice(0, max).trimEnd() + '…' : t
}

hexo.extend.generator.register('planet_docs', function (locals) {
  const posts = locals.posts
    .toArray()
    .filter(function (post) {
      return post.published !== false && (post.layout || 'post') === 'post'
    })
    .sort(function (a, b) {
      return b.date.valueOf() - a.date.valueOf()
    })

  const docs = posts.map(function (post) {
    const title = String(post.title || '').trim()
    const summary =
      String(post.description || '').trim() ||
      truncate(toPlainText(post.content), 88)

    return {
      id: post.slug || post.source,
      label: title,
      title: title,
      summary: summary,
      url: '/' + encodeURI(post.path),
      date: post.date.format('YYYY-MM-DD'),
    }
  })

  return {
    path: 'assets/planet/docs.json',
    data: JSON.stringify({ total: docs.length, docs: docs }),
  }
})
