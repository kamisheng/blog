/*!
 * 留言板（/comments/）运行时代码 · 信箱与信纸
 * - 由 scripts/comment-injector.js 在 swup 切页后调用 window.__kamiWallInit()
 * - 只操作 #commentsPage 内部；监听统一挂在 AbortController 上，重复 init 自动解绑
 * - 数据接口：GET /api/comments?path=/comments，POST /api/comments，DELETE /api/comments/{id}
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

    var MAX_TRIES = 3;
    var edgeFailure = function (code) {
      return code === 502 || code === 503 || code === 504 || (code >= 520 && code <= 525);
    };
    var canRetry = method === 'GET';
    var attempt = 0;
    function send() {
      return fetch(apiBase() + path, {
        method: method,
        headers: headers,
        body: options.body == null ? undefined : JSON.stringify(options.body)
      }).then(function (res) {
        if ((canRetry ? res.status >= 500 : edgeFailure(res.status)) && attempt < MAX_TRIES - 1) {
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
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function displayName(user) {
    return (user && (user.nickname || user.username)) || '匿名用户';
  }
  function isAdmin(user) {
    return Boolean(user && user.role === 'ADMIN');
  }

  function parseDate(value) {
    if (!value) return null;
    var d;
    if (Array.isArray(value)) {
      d = new Date(value[0], (value[1] || 1) - 1, value[2] || 1, value[3] || 0, value[4] || 0, value[5] || 0);
    } else {
      d = new Date(value);
    }
    return isNaN(d.getTime()) ? null : d;
  }

  function timeAgo(value) {
    var d = parseDate(value);
    if (!d) return '';
    var diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
    if (diff < 604800) return Math.floor(diff / 86400) + ' 天前';
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function stampOf(value) {
    var d = parseDate(value);
    if (!d) return '';
    return pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  function todayStamp() {
    var d = new Date();
    return pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function excerpt(text, len) {
    var t = (text || '').replace(/\s+/g, ' ').trim();
    return t.length > len ? t.slice(0, len) + '…' : t;
  }

  function loginHref() {
    return '/login/?redirect=' + encodeURIComponent('/comments/');
  }

  function markInto(node, text, q) {
    node.textContent = '';
    if (!q) { node.textContent = text; return; }
    var lower = text.toLowerCase(), ql = q.toLowerCase(), i = 0, idx;
    while ((idx = lower.indexOf(ql, i)) !== -1) {
      if (idx > i) node.appendChild(document.createTextNode(text.slice(i, idx)));
      var m = document.createElement('mark');
      m.textContent = text.slice(idx, idx + ql.length);
      node.appendChild(m);
      i = idx + ql.length;
    }
    if (i < text.length) node.appendChild(document.createTextNode(text.slice(i)));
    if (!node.childNodes.length) node.textContent = text;
  }

  /* ---------- 主逻辑 ---------- */
  function init() {
    var root = document.getElementById('commentsPage');
    if (!root) return;

    var stack = document.getElementById('kmStack');
    var stackCount = document.getElementById('kmStackCount');
    var stackHint = document.getElementById('kmStackHint');
    var bhCount = document.getElementById('kmBhCount');
    var cpNum = document.getElementById('kmCpNum');
    var countPlate = document.getElementById('kmCountPlate');
    var who = document.getElementById('kmWho');
    var sign = document.getElementById('kmSign');
    var tray = document.getElementById('kmTray');
    var trayLetter = document.getElementById('kmTrayLetter');
    var slotMark = document.getElementById('kmSlotMark');
    var compose = document.getElementById('kmCompose');
    var draft = document.getElementById('kmDraft');
    var counter = document.getElementById('kmCounter');
    var sendBtn = document.getElementById('kmSend');
    var draftWho = document.getElementById('kmDraftWho');
    var toastEl = document.getElementById('kmToast');
    var sortBar = document.getElementById('kmSort');
    var searchInput = document.getElementById('kmSearch');
    var reader = document.getElementById('kmReader');
    var sheet = document.getElementById('kmSheet');
    var rName = document.getElementById('kmRName');
    var rTime = document.getElementById('kmRTime');
    var rNo = document.getElementById('kmRNo');
    var rBody = document.getElementById('kmRBody');
    var stampDate = document.getElementById('kmStampDate');
    var repliesToggle = document.getElementById('kmRepliesToggle');
    var repliesNone = document.getElementById('kmRepliesNone');
    var replyList = document.getElementById('kmReplyList');
    var replyForm = document.getElementById('kmReplyForm');
    var rfTo = document.getElementById('kmRfTo');
    var rfText = document.getElementById('kmRfText');
    var rfCounter = document.getElementById('kmRfCounter');
    var replyBtn = document.getElementById('kmReplyBtn');
    var delBtn = document.getElementById('kmDelBtn');
    var closeBtn = document.getElementById('kmCloseBtn');

    if (!stack) return;

    if (window.__kamiWallAbort) {
      try { window.__kamiWallAbort.abort(); } catch (e) {}
    }
    var ac = new AbortController();
    window.__kamiWallAbort = ac;
    var on = function (node, type, fn) {
      if (node) node.addEventListener(type, fn, { signal: ac.signal });
    };

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var state = {
      comments: [],
      sort: 'latest',
      query: '',
      expanded: Object.create(null),
      openId: null,
      replyToId: null,
      formOpen: false,
      me: getUser(),
      loggedIn: Boolean(getToken()),
      loading: true,
      error: '',
      confirmDel: false,
      flying: false,
      freshId: null
    };
    var delTimer = null;
    var toastTimer = null;

    /* ---------- 数据视图 ---------- */
    function tops() {
      return state.comments.filter(function (c) { return !c.parentId; });
    }
    function childrenOf(id) {
      return state.comments.filter(function (c) { return c.parentId === id; });
    }
    function byId(id) {
      for (var i = 0; i < state.comments.length; i++) {
        if (String(state.comments[i].id) === String(id)) return state.comments[i];
      }
      return null;
    }
    function numberOf(comment) {
      var ordered = tops().slice().sort(function (a, b) {
        var ta = parseDate(a.createdAt), tb = parseDate(b.createdAt);
        return (ta ? ta.getTime() : 0) - (tb ? tb.getTime() : 0);
      });
      for (var i = 0; i < ordered.length; i++) {
        if (String(ordered[i].id) === String(comment.id)) return i + 1;
      }
      return 1;
    }
    function replyToName(comment) {
      if (!comment || !comment.replyToId) return '';
      var target = byId(comment.replyToId);
      return target ? displayName(target.user) : '';
    }
    function canDelete(comment) {
      if (!state.me) return false;
      if (isAdmin(state.me)) return true;
      return Boolean(comment.user && String(comment.user.id) === String(state.me.id));
    }
    function matches(comment) {
      if (!state.query) return true;
      var q = state.query.toLowerCase();
      return displayName(comment.user).toLowerCase().indexOf(q) >= 0 ||
        (comment.content || '').toLowerCase().indexOf(q) >= 0;
    }

    /* ---------- 提示 ---------- */
    function toast(message, bad) {
      if (!toastEl) return;
      toastEl.textContent = message;
      toastEl.classList.toggle('is-bad', Boolean(bad));
      toastEl.classList.add('is-on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2800);
    }
    function swingSign() {
      if (!sign) return;
      sign.classList.remove('is-shake');
      void sign.offsetWidth;
      sign.classList.add('is-shake');
      setTimeout(function () { sign.classList.remove('is-shake'); }, 520);
    }
    function requireLogin() {
      toast('登录之后才能写信、回信。');
      swingSign();
      setTimeout(function () { window.location.href = loginHref(); }, 900);
    }

    /* ---------- 登录态 ---------- */
    function syncAuthUI() {
      var name = displayName(state.me);
      root.classList.toggle('is-guest', !state.loggedIn);
      if (who) {
        who.textContent = state.loggedIn ? '已登录 · ' + name : '只看信';
        who.classList.toggle('is-on', state.loggedIn);
      }
      if (draftWho) draftWho.textContent = state.loggedIn ? name : '我';
    }

    /* ---------- 计数 ---------- */
    function updateCounts(popText) {
      var n = tops().length;
      if (cpNum) cpNum.textContent = String(n);
      if (bhCount) bhCount.textContent = '已收 ' + n + ' 封';
      if (stackCount) stackCount.textContent = n + ' 封';
      if (countPlate && popText) {
        countPlate.classList.remove('is-bump');
        void countPlate.offsetWidth;
        countPlate.classList.add('is-bump');
        var pop = el('span', 'km-count-pop', popText);
        countPlate.appendChild(pop);
        setTimeout(function () { if (pop.parentNode) pop.parentNode.removeChild(pop); }, 1100);
      }
    }

    /* ---------- 信堆 ---------- */
    function renderStack() {
      var list = tops().filter(function (c) {
        return matches(c) || childrenOf(c.id).some(matches);
      });
      list.sort(function (a, b) {
        if (state.sort === 'hot') {
          var d = childrenOf(b.id).length - childrenOf(a.id).length;
          if (d) return d;
        }
        var ta = parseDate(a.createdAt), tb = parseDate(b.createdAt);
        return (tb ? tb.getTime() : 0) - (ta ? ta.getTime() : 0);
      });

      stack.textContent = '';

      if (state.loading) {
        var loading = el('div', 'km-stack-empty');
        loading.appendChild(el('b', null, '正在拆信…'));
        loading.appendChild(document.createTextNode('稍等一下'));
        stack.appendChild(loading);
        if (stackCount) stackCount.textContent = '…';
        return;
      }
      if (state.error) {
        var errBox = el('div', 'km-stack-empty');
        errBox.appendChild(el('b', null, '信件没取回来'));
        errBox.appendChild(document.createTextNode(state.error));
        var retry = el('button', 'km-send small', '重试');
        retry.type = 'button';
        retry.style.marginTop = '14px';
        on(retry, 'click', load);
        errBox.appendChild(document.createElement('br'));
        errBox.appendChild(retry);
        stack.appendChild(errBox);
        if (stackCount) stackCount.textContent = '—';
        return;
      }

      if (!list.length) {
        var empty = el('div', 'km-stack-empty');
        empty.appendChild(el('b', null, state.query ? '没有这个人的信' : '信箱还是空的'));
        empty.appendChild(document.createTextNode(state.query ? '换个词试试，或者清空搜索' : '来做第一个写信的人吧'));
        stack.appendChild(empty);
      } else {
        var frag = document.createDocumentFragment();
        list.forEach(function (c, i) { frag.appendChild(letterNode(c, i)); });
        stack.appendChild(frag);
      }

      if (stackCount) stackCount.textContent = tops().length + ' 封';
      if (stackHint) {
        stackHint.textContent = state.query
          ? '「' + state.query + '」命中 ' + list.length + ' 封'
          : '点一封，抽出来看';
      }
    }

    function letterNode(c, i) {
      var b = el('button', 'km-letter' + (String(c.id) === String(state.freshId) ? ' is-new' : ''));
      b.type = 'button';
      b.setAttribute('data-id', String(c.id));
      b.style.setProperty('--tilt', ['-0.35deg', '0.28deg', '-0.12deg'][i % 3]);
      b.style.setProperty('--d', (i * 40) + 'ms');

      var head = el('span', 'km-l-head');
      var name = el('span', 'km-l-name');
      markInto(name, displayName(c.user), state.query);
      if (isAdmin(c.user)) name.appendChild(el('em', null, '博主'));
      head.appendChild(name);
      head.appendChild(el('span', 'km-l-time', timeAgo(c.createdAt)));

      var text = el('span', 'km-l-text');
      markInto(text, excerpt(c.content, 76), state.query);

      var replies = childrenOf(c.id).length;
      var foot = el('span', 'km-l-foot');
      foot.appendChild(el('span', 'km-l-reply' + (replies ? ' has' : ''), replies ? '回信 ' + replies : '还没有回信'));
      foot.appendChild(el('span', 'km-l-open', '抽出来看'));

      b.appendChild(head);
      b.appendChild(text);
      b.appendChild(foot);
      on(b, 'click', function () { openLetter(c.id, b); });

      if (String(c.id) === String(state.freshId)) {
        setTimeout(function () { b.classList.remove('is-new'); }, 2400);
      }
      return b;
    }

    /* ---------- 读信 ---------- */
    function openLetter(id, fromEl) {
      var c = byId(id);
      if (!c) return;
      state.openId = c.id;
      state.replyToId = null;
      state.formOpen = false;
      resetDelete();
      fillSheet(c);

      reader.classList.add('is-open');
      reader.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      var pulled = stack.querySelector('.km-letter.is-pulled');
      if (pulled) pulled.classList.remove('is-pulled');
      if (fromEl) {
        fromEl.classList.add('is-pulled');
        if (!reduce) flipFrom(fromEl);
      }
    }

    function flipFrom(fromEl) {
      var r = fromEl.getBoundingClientRect();
      var s = sheet.getBoundingClientRect();
      if (!s.width) return;
      var dx = (r.left + r.width / 2) - (s.left + s.width / 2);
      var dy = r.top - s.top + 6;
      var sc = Math.max(0.3, Math.min(1, r.width / s.width));
      sheet.style.transition = 'none';
      sheet.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + sc.toFixed(3) + ') rotate(-0.9deg)';
      sheet.style.opacity = '0.75';
      void sheet.offsetWidth;
      requestAnimationFrame(function () {
        sheet.style.transition = '';
        sheet.style.transform = '';
        sheet.style.opacity = '';
      });
    }

    function fillSheet(c) {
      rName.textContent = displayName(c.user);
      rTime.textContent = stampOf(c.createdAt);
      rNo.textContent = '第 ' + pad2(numberOf(c)) + ' 封';
      rBody.textContent = c.content || '';
      stampDate.textContent = stampOf(c.createdAt).slice(0, 5).replace('-', '.');
      if (delBtn) delBtn.hidden = !canDelete(c);
      renderReplies(c);
      renderReplyForm(c);
      sheet.scrollTop = 0;
    }

    function renderReplies(c) {
      var replies = childrenOf(c.id);
      var open = !!state.expanded[String(c.id)];
      var n = replies.length;

      repliesToggle.hidden = n === 0;
      repliesNone.hidden = n !== 0;
      repliesToggle.textContent = (open ? '收起 ' : '展开 ') + n + ' 条回信';
      repliesToggle.setAttribute('aria-expanded', open ? 'true' : 'false');

      replyList.textContent = '';
      replyList.hidden = !(n && open);
      if (!n || !open) return;

      replies.forEach(function (rp) {
        var li = el('li', 'km-reply');
        var head = el('div', 'km-reply-head');
        head.appendChild(el('span', 'km-rh-name', displayName(rp.user)));
        if (isAdmin(rp.user)) head.appendChild(el('span', 'km-rh-to', '博主'));
        var to = replyToName(rp);
        if (to) head.appendChild(el('span', 'km-rh-to', '回复 @' + to));
        head.appendChild(el('span', 'km-rh-time', stampOf(rp.createdAt)));

        var btn = el('button', 'km-rh-btn', '回');
        btn.type = 'button';
        btn.setAttribute('aria-label', '回复 ' + displayName(rp.user));
        head.appendChild(btn);

        li.appendChild(head);
        li.appendChild(el('p', 'km-reply-body', rp.content || ''));
        replyList.appendChild(li);

        on(btn, 'click', function () {
          state.replyToId = rp.id;
          state.formOpen = true;
          renderReplyForm(byId(state.openId));
          focusReply();
        });
      });
    }

    function renderReplyForm(c) {
      if (!c) return;
      replyForm.hidden = !state.formOpen;
      sheet.classList.toggle('has-reply', state.formOpen);
      var target = state.replyToId ? byId(state.replyToId) : null;
      rfTo.textContent = target ? displayName(target.user) : displayName(c.user);
      rfCounter.textContent = rfText.value.length + ' / ' + MAX_LEN;
      rfCounter.classList.toggle('is-warn', rfText.value.length > MAX_LEN - 60);
    }

    function focusReply() {
      setTimeout(function () {
        sheet.scrollTo({ top: sheet.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
        try { rfText.focus({ preventScroll: true }); } catch (e) { rfText.focus(); }
      }, 120);
    }

    function closeReader() {
      if (!reader.classList.contains('is-open')) return;
      var item = state.openId != null ? stack.querySelector('.km-letter[data-id="' + state.openId + '"]') : null;

      if (!reduce && item) {
        var r = item.getBoundingClientRect();
        var s = sheet.getBoundingClientRect();
        var dx = (r.left + r.width / 2) - (s.left + s.width / 2);
        var dy = r.top - s.top;
        sheet.style.transition = 'transform 0.46s cubic-bezier(.2,.7,.2,1), opacity 0.36s cubic-bezier(.2,.7,.2,1)';
        sheet.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(0.3) rotate(-1deg)';
        sheet.style.opacity = '0';
      }

      reader.classList.remove('is-open');
      reader.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';

      setTimeout(function () {
        if (reader.classList.contains('is-open')) return;
        sheet.style.transition = '';
        sheet.style.transform = '';
        sheet.style.opacity = '';
        sheet.classList.remove('is-torn', 'has-reply');
        replyForm.hidden = true;
        rfText.value = '';
        var pulled = stack.querySelector('.km-letter.is-pulled');
        if (pulled) pulled.classList.remove('is-pulled');
        state.openId = null;
        state.formOpen = false;
        state.replyToId = null;
        resetDelete();
      }, reduce ? 0 : 470);
    }

    /* ---------- 写与回 ---------- */
    function submitComment(content, parentId, replyToId, button, isLetter) {
      if (!content) {
        toast(isLetter ? '信纸还是空的，写两句再投。' : '批注还没写呢。', true);
        return;
      }
      if (content.length > MAX_LEN) {
        toast('内容不能超过 ' + MAX_LEN + ' 字', true);
        return;
      }
      var before = Object.create(null);
      state.comments.forEach(function (c) { before[String(c.id)] = true; });

      if (button) button.disabled = true;
      request('/api/comments', {
        method: 'POST',
        body: { path: PATH, content: content, parentId: parentId || null, replyToId: replyToId || null }
      })
        .then(function () {
          state.replyToId = null;
          state.formOpen = false;
          if (parentId) state.expanded[String(parentId)] = true;
          return load({ silent: true });
        })
        .then(function () {
          var newOne = null;
          for (var i = 0; i < state.comments.length; i++) {
            if (!before[String(state.comments[i].id)]) { newOne = state.comments[i]; break; }
          }
          if (isLetter) {
            state.sort = 'latest';
            syncTabs();
            state.freshId = newOne ? newOne.id : null;
            renderStack();
            updateCounts('+1');
            if (draft) { draft.value = ''; growDraft(); updateCounter(); }
            if (newOne && tray && trayLetter) {
              trayLetter.setAttribute('data-id', String(newOne.id));
              tray.classList.remove('is-drop');
              void tray.offsetWidth;
              tray.classList.add('is-on', 'is-drop');
              tray.setAttribute('aria-hidden', 'false');
            }
            toast('投进去了，等我回信。');
          } else {
            if (newOne) state.freshId = newOne.id;
            renderStack();
            var opened = state.openId != null ? byId(state.openId) : null;
            if (opened) { renderReplies(opened); renderReplyForm(opened); }
            toast('写在这张纸上了。');
          }
        })
        .catch(function (err) {
          if (err.status === 401) {
            clearAuth();
            state.me = null;
            state.loggedIn = false;
            syncAuthUI();
            toast('登录已过期，请重新登录后再操作', true);
          } else {
            toast(err.message || '投递失败，请稍后重试', true);
          }
        })
        .then(function () {
          if (button && button.isConnected) button.disabled = false;
        });
    }

    function sendLetter() {
      if (!state.loggedIn) { requireLogin(); return; }
      if (state.flying) return;
      var text = (draft.value || '').trim();
      if (!text) { toast('信纸还是空的，写两句再投。', true); draft.focus(); return; }

      state.flying = true;
      sendBtn.disabled = true;
      function done() {
        state.flying = false;
        sendBtn.disabled = false;
        submitComment(text, null, null, null, true);
      }
      if (reduce) done();
      else flyToSlot(text, done);
    }

    function sendReply() {
      if (!state.loggedIn) { requireLogin(); return; }
      var c = state.openId != null ? byId(state.openId) : null;
      if (!c) return;
      var text = (rfText.value || '').trim();
      if (!text) { toast('批注还没写呢。', true); rfText.focus(); return; }
      var parentId = c.parentId || c.id;
      var replyToId = state.replyToId || null;
      if (state.replyToId) {
        var target = byId(state.replyToId);
        replyToId = target ? target.id : null;
      }
      submitComment(text, parentId, replyToId, document.getElementById('kmRfSend'), false);
      rfText.value = '';
    }

    /* ---------- 投递动画 ---------- */
    function flyToSlot(text, done) {
      var paper = compose.querySelector('.km-compose-paper');
      if (!paper) { done(); return; }
      var r = paper.getBoundingClientRect();
      var s = slotMark.getBoundingClientRect();
      var fly = el('div', 'km-fly', excerpt(text, 44));
      var h = Math.min(r.height, 150);
      fly.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + h + 'px;';
      var dx = (s.left + s.width / 2) - (r.left + r.width / 2);
      var dy = (s.top + s.height / 2) - (r.top + h / 2);
      fly.style.setProperty('--dx', dx.toFixed(0) + 'px');
      fly.style.setProperty('--dy', dy.toFixed(0) + 'px');
      document.body.appendChild(fly);
      requestAnimationFrame(function () { fly.classList.add('is-flying'); });
      setTimeout(function () {
        if (fly.parentNode) fly.parentNode.removeChild(fly);
        done();
      }, 640);
    }

    /* ---------- 删除 ---------- */
    function resetDelete() {
      state.confirmDel = false;
      clearTimeout(delTimer);
      if (delBtn) {
        delBtn.textContent = '撕掉这封';
        delBtn.classList.remove('is-armed');
      }
    }

    function tearThenRemove(c) {
      var rect = sheet.getBoundingClientRect();

      function finish() {
        state.openId = null;
        state.expanded[String(c.id)] = false;
        sheet.classList.remove('is-torn', 'has-reply');
        reader.classList.remove('is-open');
        reader.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        sheet.style.transition = '';
        sheet.style.transform = '';
        sheet.style.opacity = '';
        replyForm.hidden = true;
        resetDelete();
        load({ silent: true });
        updateCounts('-1');
        toast('信撕掉了，纸屑扫走了。');
      }

      if (reduce || !rect.width) { finish(); return; }

      var wrap = el('div', 'km-tear');
      wrap.style.cssText = 'left:' + rect.left + 'px;top:' + rect.top + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;';
      var copy = sheet.cloneNode(true);
      copy.removeAttribute('id');
      copy.removeAttribute('aria-hidden');
      Array.prototype.forEach.call(copy.querySelectorAll('[id]'), function (n) { n.removeAttribute('id'); });
      copy.style.cssText = 'position:absolute;left:0;width:' + rect.width + 'px;height:' + rect.height + 'px;';

      ['top', 'bottom'].forEach(function (side) {
        var half = el('div', 'km-tear-half ' + side);
        var c2 = copy.cloneNode(true);
        c2.style.top = (side === 'bottom' ? -rect.height / 2 : 0) + 'px';
        half.appendChild(c2);
        wrap.appendChild(half);
      });
      document.body.appendChild(wrap);
      sheet.classList.add('is-torn');

      requestAnimationFrame(function () {
        var top = wrap.querySelector('.km-tear-half.top');
        var bottom = wrap.querySelector('.km-tear-half.bottom');
        if (top) { top.style.transform = 'translate(-22px, 46vh) rotate(-9deg)'; top.style.opacity = '0'; }
        if (bottom) { bottom.style.transform = 'translate(18px, 54vh) rotate(8deg)'; bottom.style.opacity = '0'; }
      });

      setTimeout(function () {
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
        finish();
      }, 700);
    }

    function deleteComment(c) {
      request('/api/comments/' + c.id, { method: 'DELETE' })
        .then(function () { tearThenRemove(c); })
        .catch(function (err) {
          if (err.status === 401) {
            clearAuth();
            state.loggedIn = false;
            state.me = null;
            syncAuthUI();
            toast('登录已过期，请重新登录后再操作', true);
          } else {
            toast(err.message || '删除失败，请稍后重试', true);
          }
          resetDelete();
        });
    }

    /* ---------- 数据加载 ---------- */
    function load(opts) {
      opts = opts || {};
      if (!opts.silent) { state.loading = true; state.error = ''; renderStack(); }
      return request('/api/comments?path=' + encodeURIComponent(PATH))
        .then(function (payload) {
          state.comments = Array.isArray(payload.data) ? payload.data : [];
          state.loading = false;
          state.error = '';
          renderStack();
          updateCounts();
        })
        .catch(function (err) {
          state.loading = false;
          state.error = err.message || '信件没取回来';
          renderStack();
        });
    }

    function refreshMe() {
      if (!getToken()) {
        state.me = null;
        state.loggedIn = false;
        syncAuthUI();
        return;
      }
      request('/api/auth/me')
        .then(function (payload) {
          state.me = payload.data || null;
          state.loggedIn = true;
          if (state.me) localStorage.setItem('user', JSON.stringify(state.me));
          syncAuthUI();
        })
        .catch(function (err) {
          if (err.status === 401) {
            clearAuth();
            state.me = null;
            state.loggedIn = false;
          }
          syncAuthUI();
        });
    }

    /* ---------- 输入框 ---------- */
    function growDraft() {
      draft.style.height = 'auto';
      draft.style.height = Math.min(324, Math.max(126, draft.scrollHeight)) + 'px';
    }
    function updateCounter() {
      var n = (draft.value || '').length;
      counter.textContent = n + ' / ' + MAX_LEN;
      counter.classList.toggle('is-warn', n > MAX_LEN - 60);
    }

    /* ---------- 排序 ---------- */
    function syncTabs() {
      if (!sortBar) return;
      Array.prototype.forEach.call(sortBar.querySelectorAll('[data-sort]'), function (t) {
        var active = t.getAttribute('data-sort') === state.sort;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }

    /* ---------- 事件 ---------- */
    if (sortBar) {
      on(sortBar, 'click', function (e) {
        var btn = e.target.closest('[data-sort]');
        if (!btn) return;
        state.sort = btn.getAttribute('data-sort') || 'latest';
        syncTabs();
        renderStack();
      });
    }

    if (searchInput) {
      var searchTimer = null;
      on(searchInput, 'input', function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () {
          state.query = searchInput.value.trim();
          renderStack();
        }, 180);
      });
    }

    on(draft, 'input', function () { growDraft(); updateCounter(); });
    on(sendBtn, 'click', sendLetter);

    var slotHot = document.getElementById('kmSlotHot');
    on(slotHot, 'click', function () {
      if (!state.loggedIn) { toast('需登录才能投信。', true); swingSign(); return; }
      compose.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      setTimeout(function () {
        try { draft.focus({ preventScroll: true }); } catch (e) { draft.focus(); }
      }, 220);
    });

    on(trayLetter, 'click', function () {
      var id = trayLetter.getAttribute('data-id');
      if (id) openLetter(id, null);
    });

    on(document.getElementById('kmReaderBack'), 'click', closeReader);
    on(closeBtn, 'click', closeReader);

    on(repliesToggle, 'click', function () {
      var c = state.openId != null ? byId(state.openId) : null;
      if (!c) return;
      state.expanded[String(c.id)] = !state.expanded[String(c.id)];
      renderReplies(c);
    });

    on(replyBtn, 'click', function () {
      if (!state.loggedIn) { requireLogin(); return; }
      var c = state.openId != null ? byId(state.openId) : null;
      if (!c) return;
      state.replyToId = null;
      state.formOpen = true;
      renderReplyForm(c);
      focusReply();
    });

    on(document.getElementById('kmRfCancel'), 'click', function () {
      state.formOpen = false;
      state.replyToId = null;
      replyForm.hidden = true;
      sheet.classList.remove('has-reply');
    });

    on(document.getElementById('kmRfSend'), 'click', sendReply);
    on(rfText, 'input', function () {
      var n = rfText.value.length;
      rfCounter.textContent = n + ' / ' + MAX_LEN;
      rfCounter.classList.toggle('is-warn', n > MAX_LEN - 60);
    });

    on(delBtn, 'click', function () {
      var c = state.openId != null ? byId(state.openId) : null;
      if (!c) return;
      if (!state.confirmDel) {
        state.confirmDel = true;
        delBtn.textContent = '确认撕掉？';
        delBtn.classList.add('is-armed');
        clearTimeout(delTimer);
        delTimer = setTimeout(resetDelete, 3200);
        return;
      }
      resetDelete();
      deleteComment(c);
    });

    on(document, 'keydown', function (e) {
      if (e.key === 'Escape' && reader.classList.contains('is-open')) closeReader();
    });

    on(window, 'storage', function (e) {
      if (e.key === 'token' || e.key === 'user') {
        state.loggedIn = Boolean(getToken());
        state.me = getUser();
        syncAuthUI();
        renderStack();
        if (state.openId != null) {
          var c = byId(state.openId);
          if (c) { if (delBtn) delBtn.hidden = !canDelete(c); }
        }
      }
    });

    /* ---------- 启动 ---------- */
    document.getElementById('kmToday').textContent = todayStamp();
    var signLogin = document.getElementById('kmSignLogin');
    if (signLogin) signLogin.setAttribute('href', loginHref());
    var guestLogin = compose.querySelector('.km-compose-guest a.km-send');
    if (guestLogin) guestLogin.setAttribute('href', loginHref());

    growDraft();
    updateCounter();
    syncAuthUI();
    syncTabs();
    renderStack();
    updateCounts();
    refreshMe();
    load();
  }

  window.__kamiWallInit = init;
})();
