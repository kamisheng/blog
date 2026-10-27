/*!
 * 留言板（/comments/）运行时代码
 * - 由 scripts/comment-injector.js 在 swup 切页后调用 window.__kamiWallInit()
 * - 只操作 #commentsPage 内部；所有监听都挂在一个 AbortController 上，重复 init 会自动解绑旧监听
 * - 颜色一律走主题 CSS 变量 / hsl 计算，不写死明暗色
 */
(function () {
  'use strict';

  var PATH = '/comments';
  var MAX_LEN = 1000;
  var REMOTE = 'https://api.kamisheng.xyz';

  function apiBase() {
    if (window.__BLOG_API_BASE__) return window.__BLOG_API_BASE__;
    var h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:8080';
    return REMOTE;
  }

  function getToken() {
    return localStorage.getItem('token') || '';
  }

  function clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch (e) {
      return null;
    }
  }

  function request(path, options) {
    options = options || {};
    var method = options.method || 'GET';
    var headers = { 'Content-Type': 'application/json' };
    var token = getToken();
    if (token) headers.Authorization = 'Bearer ' + token;

    // CF→源站偶发 525/5xx（跨境隧道抖动），GET 幂等，重试一次；POST/DELETE 不重试
    var MAX_TRIES = 3;
    var canRetry = method === 'GET';
    var attempt = 0;
    function send() {
      return fetch(apiBase() + path, {
        method: method,
        headers: headers,
        body: options.body == null ? undefined : JSON.stringify(options.body)
      }).then(function (res) {
        if (canRetry && attempt < MAX_TRIES - 1 && res.status >= 500) {
          attempt++;
          return new Promise(function (resolve) { setTimeout(resolve, attempt > 1 ? 900 : 400); }).then(send);
        }
        return res;
      }, function (err) {
        if (canRetry && attempt < MAX_TRIES - 1) {
          attempt++;
          return new Promise(function (resolve) { setTimeout(resolve, attempt > 1 ? 900 : 400); }).then(send);
        }
        throw err;
      });
    }
    return send().then(
      function (res) {
        return res.text().then(function (text) {
          var payload = {};
          try {
            payload = text ? JSON.parse(text) : {};
          } catch (e) {
            payload = {};
          }
          if (res.status === 401) {
            var e401 = new Error(payload.message || '登录已过期，请重新登录');
            e401.status = 401;
            throw e401;
          }
          if (!res.ok || payload.code !== 200) {
            throw new Error(payload.message || '请求失败（HTTP ' + res.status + '）');
          }
          return payload;
        });
      },
      function () {
        throw new Error('网络连接失败，请检查网络后重试');
      }
    );
  }

  /* ---------- 工具 ---------- */
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function displayName(user) {
    return (user && (user.nickname || user.username)) || '匿名用户';
  }

  function initialOf(user) {
    return displayName(user).slice(0, 1).toUpperCase();
  }

  function hueOf(user) {
    var name = displayName(user);
    var hash = 0;
    for (var i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 360;
    return hash;
  }

  function timeAgo(value) {
    if (!value) return '';
    var d;
    if (Array.isArray(value)) {
      d = new Date(value[0], (value[1] || 1) - 1, value[2] || 1, value[3] || 0, value[4] || 0, value[5] || 0);
    } else {
      d = new Date(value);
    }
    if (isNaN(d.getTime())) return '';
    var diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
    if (diff < 604800) return Math.floor(diff / 86400) + ' 天前';
    var pad = function (n) {
      return String(n).length < 2 ? '0' + n : String(n);
    };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function loginHref() {
    return '/login/?redirect=' + encodeURIComponent('/comments/');
  }

  /* ---------- 主逻辑 ---------- */
  function init() {
    var root = document.getElementById('commentsPage');
    if (!root) return;
    var list = document.getElementById('gbList');
    var editorSlot = document.getElementById('gbEditor');
    var sortBar = document.getElementById('gbSort');
    var searchInput = document.getElementById('gbSearch');
    var countEl = document.getElementById('gbCount');
    var moreEl = document.getElementById('gbMore');
    if (!list || !editorSlot) return;

    // 统一解绑上一轮监听
    if (window.__kamiWallAbort) {
      try {
        window.__kamiWallAbort.abort();
      } catch (e) {}
    }
    var ac = new AbortController();
    window.__kamiWallAbort = ac;
    var on = function (node, type, fn) {
      if (node) node.addEventListener(type, fn, { signal: ac.signal });
    };

    var state = {
      comments: [],
      sort: 'latest',
      query: '',
      expanded: Object.create(null),
      replyTo: null,
      me: getUser(),
      loggedIn: Boolean(getToken()),
      loading: true,
      error: '',
      editorOpen: false
    };

    function tops() {
      return state.comments.filter(function (c) {
        return !c.parentId;
      });
    }

    function childrenOf(id) {
      return state.comments.filter(function (c) {
        return c.parentId === id;
      });
    }

    function replyToName(comment) {
      if (!comment || !comment.replyToId) return '';
      var target = null;
      for (var i = 0; i < state.comments.length; i++) {
        if (state.comments[i].id === comment.replyToId) {
          target = state.comments[i];
          break;
        }
      }
      return target ? displayName(target.user) : '已删除';
    }

    function canDelete(comment) {
      if (!state.me) return false;
      if (state.me.role === 'ADMIN') return true;
      return Boolean(comment.user && comment.user.id === state.me.id);
    }

    function matchesQuery(comment) {
      if (!state.query) return true;
      var q = state.query.toLowerCase();
      var name = displayName(comment.user).toLowerCase();
      var content = (comment.content || '').toLowerCase();
      return name.indexOf(q) >= 0 || content.indexOf(q) >= 0;
    }

    /* ---------- 渲染：编辑器 ---------- */
    function renderEditor() {
      editorSlot.textContent = '';

      if (!state.loggedIn) {
        var guest = el('div', 'gb-guest');
        var tip = el('div', 'gb-guest-tip');
        tip.appendChild(document.createTextNode('登录后就能留言了'));
        var sub = el('div');
        sub.style.cssText = 'margin-top:4px;font-size:13px;';
        sub.appendChild(document.createTextNode('还没账号？登录页可以直接注册。'));
        tip.appendChild(sub);
        guest.appendChild(tip);

        var loginBtn = el('a', 'gb-btn primary', '去登录');
        loginBtn.href = loginHref();
        guest.appendChild(loginBtn);
        editorSlot.appendChild(guest);
        return;
      }

      var me = state.me || { username: '我' };

      if (!state.editorOpen) {
        var entry = el('button', 'gb-new');
        entry.type = 'button';
        entry.appendChild(buildAvatar(me, false));
        entry.appendChild(el('span', 'gb-new-tip', '以 ' + displayName(me) + ' 的身份留一句…'));
        on(entry, 'click', function () {
          state.editorOpen = true;
          renderEditor();
          var ta = editorSlot.querySelector('textarea');
          if (ta) ta.focus();
        });
        editorSlot.appendChild(entry);
        return;
      }

      var editor = el('div', 'gb-editor');
      var identity = el('div', 'gb-identity');
      identity.appendChild(buildAvatar(me, true));
      var idText = el('span');
      idText.appendChild(document.createTextNode('以 '));
      var strong = el('b', null, displayName(me));
      idText.appendChild(strong);
      idText.appendChild(document.createTextNode(' 的身份留言'));
      identity.appendChild(idText);
      editor.appendChild(identity);

      var ta = document.createElement('textarea');
      ta.placeholder = '说点什么吧…（支持换行，最多 ' + MAX_LEN + ' 字）';
      ta.maxLength = MAX_LEN + 200;
      editor.appendChild(ta);

      var foot = el('div', 'gb-editor-foot');
      var counter = el('span', 'gb-counter', '0 / ' + MAX_LEN);
      foot.appendChild(counter);
      var cancel = el('button', 'gb-btn ghost small', '收起');
      cancel.type = 'button';
      foot.appendChild(cancel);
      var submit = el('button', 'gb-btn primary small', '发送');
      submit.type = 'button';
      foot.appendChild(submit);
      editor.appendChild(foot);
      editorSlot.appendChild(editor);

      on(ta, 'input', function () {
        var len = ta.value.length;
        counter.textContent = len + ' / ' + MAX_LEN;
        counter.classList.toggle('is-warn', len > MAX_LEN);
      });
      on(cancel, 'click', function () {
        state.editorOpen = false;
        renderEditor();
      });
      on(submit, 'click', function () {
        submitComment(ta.value.trim(), null, null, submit);
      });
    }

    /* ---------- 渲染：头像 ---------- */
    function buildAvatar(user, small) {
      var av = el('div', 'gb-avatar' + (small ? ' sm' : ''));
      var avatarUrl = user && user.avatar;
      if (avatarUrl) {
        var img = document.createElement('img');
        img.src = avatarUrl;
        img.alt = displayName(user);
        img.className = 'not-markdown';
        img.loading = 'lazy';
        img.onerror = function () {
          img.remove();
          av.textContent = initialOf(user);
          av.style.background = 'hsl(' + hueOf(user) + ',62%,55%)';
        };
        av.appendChild(img);
      } else {
        av.textContent = initialOf(user);
        av.style.background = 'hsl(' + hueOf(user) + ',62%,55%)';
      }
      return av;
    }

    /* ---------- 渲染：单条留言 ---------- */
    function buildCommentItem(comment, opts) {
      opts = opts || {};
      var item = el('div', 'gb-item');

      item.appendChild(buildAvatar(comment.user, opts.small));

      var body = el('div', 'gb-body');
      body.style.cssText = 'flex:1;min-width:0;';

      var meta = el('div', 'gb-meta');
      meta.appendChild(el('span', 'gb-name', displayName(comment.user)));
      if (comment.user && comment.user.role === 'ADMIN') meta.appendChild(el('span', 'gb-badge', '博主'));
      meta.appendChild(el('span', 'gb-time', timeAgo(comment.createdAt)));

      var to = replyToName(comment);
      if (to && opts.small) {
        var replyTo = el('span', 'gb-replyto');
        replyTo.appendChild(document.createTextNode('回复 '));
        replyTo.appendChild(el('b', null, '@' + to));
        meta.appendChild(replyTo);
      }
      body.appendChild(meta);

      body.appendChild(el('p', 'gb-content', comment.content || ''));

      var actions = el('div', 'gb-actions');
      if (state.loggedIn) {
        var replyLink = el('button', 'gb-link', '回复');
        replyLink.type = 'button';
        on(replyLink, 'click', function () {
          state.replyTo = state.replyTo === comment.id ? null : comment.id;
          if (state.replyTo) state.expanded[comment.parentId || comment.id] = true;
          renderList();
        });
        actions.appendChild(replyLink);
      }
      if (canDelete(comment)) {
        var delLink = el('button', 'gb-link danger', '删除');
        delLink.type = 'button';
        on(delLink, 'click', function () {
          removeComment(comment);
        });
        actions.appendChild(delLink);
      }
      if (actions.childNodes.length) body.appendChild(actions);

      // 回复编辑器
      if (state.replyTo === comment.id) {
        body.appendChild(buildReplyEditor(comment));
      }

      item.appendChild(body);
      return item;
    }

    function buildReplyEditor(comment) {
      var box = el('div', 'gb-reply');
      var head = el('div', 'gb-reply-head');
      head.appendChild(document.createTextNode('回复 '));
      head.appendChild(el('b', null, '@' + displayName(comment.user)));
      box.appendChild(head);

      var ta = document.createElement('textarea');
      ta.placeholder = '写下你的回复…';
      ta.maxLength = MAX_LEN + 200;
      box.appendChild(ta);

      var foot = el('div', 'gb-reply-foot');
      var counter = el('span', 'gb-counter', '0 / ' + MAX_LEN);
      foot.appendChild(counter);
      var cancel = el('button', 'gb-btn ghost small', '取消');
      cancel.type = 'button';
      foot.appendChild(cancel);
      var send = el('button', 'gb-btn primary small', '回复');
      send.type = 'button';
      foot.appendChild(send);
      box.appendChild(foot);

      on(ta, 'input', function () {
        var len = ta.value.length;
        counter.textContent = len + ' / ' + MAX_LEN;
        counter.classList.toggle('is-warn', len > MAX_LEN);
      });
      on(cancel, 'click', function () {
        state.replyTo = null;
        renderList();
      });
      on(send, 'click', function () {
        var parentId = comment.parentId || comment.id;
        var replyToId = comment.parentId ? comment.id : null;
        submitComment(ta.value.trim(), parentId, replyToId, send);
      });

      setTimeout(function () {
        if (ta.isConnected) ta.focus();
      }, 0);
      return box;
    }

    /* ---------- 渲染：列表 ---------- */
    function renderList() {
      list.textContent = '';
      moreEl.textContent = '';

      if (state.loading) {
        list.appendChild(el('div', 'gb-state', '正在加载留言…'));
        countEl.textContent = '加载中';
        return;
      }
      if (state.error) {
        var errBox = el('div', 'gb-state');
        errBox.appendChild(el('b', null, '留言加载失败'));
        errBox.appendChild(document.createTextNode(state.error));
        var retry = el('button', 'gb-btn ghost small', '重试');
        retry.type = 'button';
        on(retry, 'click', function () {
          load();
        });
        errBox.appendChild(retry);
        list.appendChild(errBox);
        countEl.textContent = '—';
        return;
      }

      var all = tops();
      var shown = all.filter(function (c) {
        if (matchesQuery(c)) return true;
        return childrenOf(c.id).some(matchesQuery);
      });
      shown.sort(function (a, b) {
        var ta = new Date(a.createdAt).getTime() || 0;
        var tb = new Date(b.createdAt).getTime() || 0;
        return state.sort === 'oldest' ? ta - tb : tb - ta;
      });

      countEl.textContent = state.query
        ? shown.length + ' / ' + all.length + ' 条'
        : all.length + ' 条';

      if (!shown.length) {
        var empty = el('div', 'gb-state');
        empty.appendChild(el('b', null, state.query ? '没有匹配的留言' : '还没有留言'));
        empty.appendChild(document.createTextNode(state.query ? '换个关键词试试。' : '来做第一个留言的人吧。'));
        list.appendChild(empty);
        return;
      }

      shown.forEach(function (comment, index) {
        var thread = el('div', 'gb-thread gb-enter');
        thread.style.setProperty('--u-color', 'hsl(' + hueOf(comment.user) + ',62%,55%)');
        thread.style.setProperty('--gb-delay', Math.min(index, 8) * 45 + 'ms');

        thread.appendChild(buildCommentItem(comment, { small: false }));

        var replies = childrenOf(comment.id);
        if (replies.length) {
          var expanded = Boolean(state.expanded[comment.id]);
          var toggle = el('button', 'gb-replies-toggle');
          toggle.type = 'button';
          toggle.appendChild(
            document.createTextNode(expanded ? '收起 ' + replies.length + ' 条回复' : '查看 ' + replies.length + ' 条回复')
          );
          on(toggle, 'click', function () {
            state.expanded[comment.id] = !expanded;
            renderList();
          });
          thread.appendChild(toggle);

          if (expanded) {
            var wrap = el('ul', 'gb-replies');
            replies
              .filter(function (r) {
                return matchesQuery(r) || matchesQuery(comment);
              })
              .forEach(function (reply) {
                var li = document.createElement('li');
                li.appendChild(buildCommentItem(reply, { small: true }));
                wrap.appendChild(li);
              });
            thread.appendChild(wrap);
          }
        }

        list.appendChild(thread);
      });

      if (shown.length) list.appendChild(el('div', 'gb-end', '已经到底啦 · 共 ' + all.length + ' 条留言'));
    }

    function renderAll() {
      renderEditor();
      renderList();
    }

    /* ---------- 数据 ---------- */
    function load() {
      state.loading = true;
      state.error = '';
      renderAll();
      request('/api/comments?path=' + encodeURIComponent(PATH))
        .then(function (payload) {
          state.comments = Array.isArray(payload.data) ? payload.data : [];
          state.loading = false;
          renderAll();
        })
        .catch(function (err) {
          state.loading = false;
          state.error = err.message || '留言加载失败';
          renderAll();
        });
    }

    function refreshMe() {
      if (!getToken()) {
        state.me = null;
        state.loggedIn = false;
        renderAll();
        return;
      }
      request('/api/auth/me')
        .then(function (payload) {
          state.me = payload.data || null;
          state.loggedIn = true;
          if (state.me) localStorage.setItem('user', JSON.stringify(state.me));
          renderEditor();
        })
        .catch(function (err) {
          if (err.status === 401) {
            clearAuth();
            state.me = null;
            state.loggedIn = false;
          }
          renderEditor();
        });
    }

    function toast(message, ok) {
      var old = editorSlot.parentNode && editorSlot.parentNode.querySelector('.gb-toast');
      if (old) old.remove();
      var line = el('div', 'gb-toast' + (ok ? ' is-ok' : ''), message);
      editorSlot.insertAdjacentElement('afterend', line);
      setTimeout(function () {
        if (line.isConnected) line.remove();
      }, 4200);
    }

    function submitComment(content, parentId, replyToId, button) {
      if (!content) {
        toast('内容不能为空');
        return;
      }
      if (content.length > MAX_LEN) {
        toast('内容不能超过 ' + MAX_LEN + ' 字');
        return;
      }
      if (button) button.disabled = true;
      request('/api/comments', {
        method: 'POST',
        body: { path: PATH, content: content, parentId: parentId || null, replyToId: replyToId || null }
      })
        .then(function () {
          state.replyTo = null;
          state.editorOpen = false;
          if (parentId) state.expanded[parentId] = true;
          return load();
        })
        .then(function () {
          toast('发布成功', true);
        })
        .catch(function (err) {
          if (err.status === 401) {
            clearAuth();
            state.me = null;
            state.loggedIn = false;
            toast('登录已过期，请重新登录后再操作');
            renderEditor();
          } else {
            toast(err.message || '发布失败，请稍后重试');
          }
        })
        .then(function () {
          if (button && button.isConnected) button.disabled = false;
        });
    }

    function removeComment(comment) {
      var hasChildren = childrenOf(comment.id).length > 0;
      var tip = hasChildren ? '确定删除这条留言？它下面的回复也会一起删除。' : '确定删除这条留言？';
      if (!window.confirm(tip)) return;
      request('/api/comments/' + comment.id, { method: 'DELETE' })
        .then(function () {
          toast('已删除', true);
          return load();
        })
        .catch(function (err) {
          if (err.status === 401) {
            clearAuth();
            state.loggedIn = false;
            state.me = null;
            renderEditor();
            toast('登录已过期，请重新登录后再操作');
          } else {
            toast(err.message || '删除失败，请稍后重试');
          }
        });
    }

    /* ---------- 事件绑定 ---------- */
    if (sortBar) {
      on(sortBar, 'click', function (event) {
        var btn = event.target.closest('[data-sort]');
        if (!btn) return;
        state.sort = btn.getAttribute('data-sort') || 'latest';
        Array.prototype.forEach.call(sortBar.querySelectorAll('[data-sort]'), function (node) {
          node.classList.toggle('is-active', node === btn);
        });
        renderList();
      });
    }

    if (searchInput) {
      var timer = null;
      on(searchInput, 'input', function () {
        if (timer) clearTimeout(timer);
        timer = setTimeout(function () {
          state.query = searchInput.value.trim();
          renderList();
        }, 180);
      });
    }

    // 其它页面已登录、但本页还没同步过 user 的情况
    window.addEventListener(
      'storage',
      function (event) {
        if (event.key === 'token' || event.key === 'user') {
          state.loggedIn = Boolean(getToken());
          state.me = getUser();
          renderAll();
        }
      },
      { signal: ac.signal }
    );

    renderAll();
    refreshMe();
    load();
  }

  window.__kamiWallInit = init;
})();
