/* 汉字学园 · 账号与云端进度（昵称 + 4 位数字密码）
   用法：<script src="…/account.js" data-sync="pinci=hzxy.pinci.v1,qianziwen=hzxy.qianziwen.v1"></script>
   - 不登录照常玩（进度存在本机）；登录/注册后本机进度与云端合并，之后自动同步。
   - 只保存昵称和密码哈希，不收集真实姓名、邮箱、手机号。
   - 后端：Supabase（只调用 public.hzxy_* RPC；这里的 publishable key 本来就是公开的）。 */
(function () {
  'use strict';
  if (window.HZXY_ACCOUNT) return;
  var SB = 'https://ipocnpognxtbslzrdssf.supabase.co';
  var KEY = 'sb_publishable_eu6pEtJfqLcvu_0ILxHadA_wmk8B39I';
  var AKEY = 'hzxy.account';
  var me = document.currentScript;
  var SYNC = {}; /* module -> localStorage key */
  ((me && me.getAttribute('data-sync')) || '').split(',').forEach(function (p) {
    var kv = p.split('='); if (kv[0] && kv[1]) SYNC[kv[0].trim()] = kv[1].trim();
  });
  var BYKEY = {}; Object.keys(SYNC).forEach(function (m) { BYKEY[SYNC[m]] = m; });
  var place = (me && me.getAttribute('data-place')) || 'auto';

  function acct() { try { return JSON.parse(localStorage.getItem(AKEY) || 'null'); } catch (e) { return null; } }
  function setAcct(a) { try { if (a) origSet.call(localStorage, AKEY, JSON.stringify(a)); else localStorage.removeItem(AKEY); } catch (e) {} }
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return String(h) + ':' + s.length; }

  function rpc(fn, body, keep) {
    return fetch(SB + '/rest/v1/rpc/' + fn, {
      method: 'POST', keepalive: !!keep,
      headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.text().then(function (t) {
        var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
        if (!r.ok) { var err = new Error((j && j.message) || ('http_' + r.status)); err.code = err.message; throw err; }
        return j;
      });
    });
  }

  /* ---------- 同步 ---------- */
  var origSet = Storage.prototype.setItem;
  var writing = false, timers = {}, busy = {}, again = {};
  Storage.prototype.setItem = function (k, v) {
    origSet.call(this, k, v);
    if (this === window.localStorage && !writing && BYKEY[k] && acct()) schedule(BYKEY[k]);
  };
  function schedule(m) { clearTimeout(timers[m]); timers[m] = setTimeout(function () { sync(m); }, 4000); }
  function local(m) { try { return localStorage.getItem(SYNC[m]); } catch (e) { return null; } }
  function sync(m, opts) {
    opts = opts || {};
    var a = acct(); if (!a || !a.token) return Promise.resolve();
    if (busy[m]) { again[m] = true; return busy[m]; }
    clearTimeout(timers[m]);
    var raw = local(m), st = (a.mods && a.mods[SYNC[m]]) || {}, data = null;
    if (raw && (opts.force || st.h !== hash(raw))) { try { data = JSON.parse(raw); } catch (e) { data = null; } }
    var base = opts.merge ? null : (st.rev == null ? null : st.rev);
    setStatus('同步中…');
    busy[m] = rpc('hzxy_save_progress', { p_token: a.token, p_module: m, p_data: data, p_base_rev: base }, opts.keep)
      .then(function (r) {
        var cur = acct(); if (!cur || cur.token !== a.token) return;
        var nraw = raw;
        if (r && r.data) {
          nraw = JSON.stringify(r.data);
          if (nraw !== local(m)) {
            writing = true; try { origSet.call(localStorage, SYNC[m], nraw); } catch (e) {} writing = false;
            try { window.dispatchEvent(new CustomEvent('hzxy-progress', { detail: { module: m, key: SYNC[m] } })); } catch (e) {}
          }
        }
        cur.mods = cur.mods || {}; cur.mods[SYNC[m]] = { rev: r ? r.rev : 0, h: nraw ? hash(nraw) : null };
        setAcct(cur); setStatus('已同步');
      })
      .catch(function (e) {
        if (e.code === 'auth') { setAcct(null); render(); toast('登录已过期，请重新登录'); }
        setStatus('同步失败，稍后会再试');
      })
      .then(function () { busy[m] = null; if (again[m]) { again[m] = false; schedule(m); } });
    return busy[m];
  }
  function syncAll(opts) { return Promise.all(Object.keys(SYNC).map(function (m) { return sync(m, opts); })); }
  function flush() {
    var a = acct(); if (!a) return;
    Object.keys(SYNC).forEach(function (m) {
      var raw = local(m), st = (a.mods && a.mods[SYNC[m]]) || {};
      if (timers[m] || (raw && st.h !== hash(raw))) { clearTimeout(timers[m]); timers[m] = null; sync(m, { keep: raw && raw.length < 60000 }); }
    });
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', flush);

  /* ---------- 界面 ---------- */
  var css = document.createElement('style');
  css.textContent =
    '.hzac-chip{display:inline-flex;align-items:center;gap:5px;min-height:36px;max-width:42vw;padding:0 12px;border:1px solid #c9b08a;border-radius:18px;background:#fffaf0;color:#5b3f1f;font:600 14px/1 -apple-system,"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-sizing:border-box;-webkit-tap-highlight-color:transparent}' +
    '.hzac-chip:focus-visible{outline:3px solid #b77f3e;outline-offset:2px}.hzac-chip svg{width:16px;height:16px;flex:none}' +
    '.hzac-chip.in{background:#5b3f1f;color:#fffaf0;border-color:#5b3f1f}' +
    '.hubbar .hzac-chip{margin-left:8px;flex:none}' +
    '#hzac-slot{position:absolute;z-index:5;top:max(8px,env(safe-area-inset-top,0px));right:max(10px,env(safe-area-inset-right,0px))}' +
    '.acslot{display:flex;justify-content:center;flex:1;min-width:0}' +
    '.hzac-float{position:fixed;z-index:9998;right:max(10px,env(safe-area-inset-right,0px));bottom:max(10px,env(safe-area-inset-bottom,0px));box-shadow:0 3px 12px rgba(80,60,30,.2)}' +
    '.hzac-mask{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(40,30,20,.45);box-sizing:border-box}' +
    '.hzac-box{width:min(100%,380px);max-height:calc(100dvh - 32px);overflow:auto;background:#fffaf1;border-radius:18px;padding:18px 18px 16px;box-shadow:0 12px 40px rgba(0,0,0,.25);color:#2b231b;font:16px/1.5 -apple-system,"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif;box-sizing:border-box}' +
    '.hzac-box h2{margin:0 0 10px;font-size:20px}.hzac-tabs{display:flex;gap:6px;margin-bottom:12px}' +
    '.hzac-tabs button{flex:1;min-height:44px;border:1px solid #c9b08a;border-radius:12px;background:#fff;color:#5b3f1f;font:inherit;font-weight:600;cursor:pointer}' +
    '.hzac-tabs button[aria-selected=true]{background:#5b3f1f;color:#fffaf0;border-color:#5b3f1f}' +
    '.hzac-box label{display:block;margin:8px 0 4px;font-size:14px;color:#6b5a45}' +
    '.hzac-box input{width:100%;min-height:46px;padding:8px 12px;border:1px solid #c9b08a;border-radius:12px;background:#fff;font:18px/1.2 inherit;box-sizing:border-box}' +
    '.hzac-box input.pin{letter-spacing:.5em;font-size:22px}' +
    '.hzac-box input:focus{outline:3px solid #e2c48f;border-color:#b77f3e}' +
    '.hzac-note{margin:10px 0 0;font-size:13px;color:#7a6650}.hzac-warn{margin:10px 0 0;padding:8px 10px;border-radius:10px;background:#fdf0d8;color:#7a4b12;font-size:14px}' +
    '.hzac-err{min-height:1.4em;margin:8px 0 0;color:#b3261e;font-size:14px}' +
    '.hzac-acts{display:flex;gap:8px;margin-top:12px}.hzac-acts button{flex:1;min-height:46px;border-radius:12px;border:1px solid #5b3f1f;font:inherit;font-weight:700;cursor:pointer}' +
    '.hzac-acts .pri{background:#5b3f1f;color:#fffaf0}.hzac-acts .sec{background:#fff;color:#5b3f1f}.hzac-acts button:disabled{opacity:.6}' +
    '.hzac-toast{position:fixed;z-index:10001;left:50%;top:calc(64px + env(safe-area-inset-top,0px));transform:translateX(-50%);max-width:90vw;padding:9px 16px;border-radius:20px;background:rgba(43,35,27,.92);color:#fff;font:15px/1.4 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;pointer-events:none}';
  document.head.appendChild(css);

  var chip = null, statusText = '';
  var ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function setStatus(s) { statusText = s; var e = document.querySelector('.hzac-status'); if (e) e.textContent = s; }
  function toast(t) { var d = document.createElement('div'); d.className = 'hzac-toast'; d.setAttribute('role', 'status'); d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 2600); }
  function render() {
    if (!chip) return; var a = acct();
    chip.classList.toggle('in', !!a);
    chip.innerHTML = ICON + '<span>' + (a ? esc(a.nickname) : '登录') + '</span>';
    chip.setAttribute('aria-label', a ? ('已登录：' + a.nickname + '，打开账号') : '登录或注册，保存进度');
  }
  function mount() {
    if (chip) return;
    chip = document.createElement('button'); chip.type = 'button'; chip.className = 'hzac-chip';
    chip.addEventListener('click', function () { openModal(); });
    var bar = document.querySelector('.hubbar'), slot = place.charAt(0) === '#' ? document.querySelector(place) : null;
    if (bar && place !== 'float') { var t = bar.querySelector('.hubbar-title'); if (t && t.nextSibling) bar.insertBefore(chip, t.nextSibling); else bar.appendChild(chip); inBar = true; }
    else if (slot) slot.appendChild(chip);
    else if (place === 'auto' || place === 'float') { chip.className += ' hzac-float'; document.body.appendChild(chip); }
    render();
  }
  var inBar = false;
  /* 游戏页（无顶栏时）把按钮放进自己的位置：HZXY_ACCOUNT.mountIn(元素) */
  function mountIn(el) { if (!el) return; if (!chip) mount(); if (inBar) return; chip.classList.remove('hzac-float'); el.appendChild(chip); render(); }
  var ERR = {
    nick_taken: '昵称已被使用，换一个吧', nick_invalid: '昵称要 2–16 个字，不能有特殊符号', nick_blocked: '这个昵称不合适，换一个吧',
    pin_invalid: '密码必须是 4 位数字', bad_login: '昵称或密码不对', busy: '注册的人太多了，请过一分钟再试', auth: '登录已过期，请重新登录'
  };
  function errText(e, left) {
    var c = (e && (e.code || e.message)) || ''; var m = /^locked:(\d+)/.exec(c);
    if (m) return '密码错误次数太多，请 ' + Math.max(1, Math.ceil(+m[1] / 60)) + ' 分钟后再试';
    if (c === 'bad_login' && left != null) return left > 0 ? '昵称或密码不对（再错 ' + left + ' 次要等 10 分钟）' : '密码错误次数太多，请 10 分钟后再试';
    return ERR[c] || '网络好像不通，请稍后再试';
  }
  var mask = null, lastFocus = null;
  function close() { if (mask) { mask.remove(); mask = null; document.removeEventListener('keydown', onKey); if (lastFocus) try { lastFocus.focus(); } catch (e) {} } }
  function onKey(e) { if (e.key === 'Escape') close(); }
  function openModal(tab) {
    close(); lastFocus = document.activeElement;
    mask = document.createElement('div'); mask.className = 'hzac-mask';
    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
    document.addEventListener('keydown', onKey);
    var a = acct(), box = document.createElement('div'); box.className = 'hzac-box';
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', '汉字学园账号');
    if (a) {
      box.innerHTML = '<h2>你好，' + esc(a.nickname) + '</h2>' +
        '<p class="hzac-note">你的进度会自动保存到云端，换手机、换平板登录同一个昵称就能接着玩。</p>' +
        '<p class="hzac-note">状态：<span class="hzac-status">' + esc(statusText || '已登录') + '</span></p>' +
        '<div class="hzac-acts"><button type="button" class="sec" data-a="sync">立即同步</button><button type="button" class="pri" data-a="out">退出登录</button></div>' +
        '<div class="hzac-acts"><button type="button" class="sec" data-a="close">关闭</button></div>';
      box.querySelector('[data-a=sync]').onclick = function () { syncAll({ force: true }).then(function () { toast('已同步'); }); };
      box.querySelector('[data-a=close]').onclick = close;
      box.querySelector('[data-a=out]').onclick = function () {
        flush(); var t = a.token; setAcct(null); render(); close(); toast('已退出登录（本机进度保留）');
        rpc('hzxy_logout', { p_token: t }).catch(function () {});
      };
    } else {
      var reg = tab === 'reg';
      box.innerHTML = '<h2>保存我的进度</h2>' +
        '<div class="hzac-tabs" role="tablist"><button type="button" role="tab" data-t="login" aria-selected="' + !reg + '">登录</button><button type="button" role="tab" data-t="reg" aria-selected="' + reg + '">注册</button></div>' +
        '<form novalidate><label for="hzac-nick">昵称</label><input id="hzac-nick" name="nick" autocomplete="username" maxlength="16" placeholder="2–16 个字，不要用真名" autocapitalize="off" spellcheck="false">' +
        '<label for="hzac-pin">4 位数字密码</label><input id="hzac-pin" class="pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="' + (reg ? 'new-password' : 'current-password') + '" placeholder="••••">' +
        (reg ? '<label for="hzac-pin2">再输一次密码</label><input id="hzac-pin2" class="pin" name="pin2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="new-password" placeholder="••••">' +
          '<p class="hzac-warn">请记住你的 4 位数字密码，忘了就找不回来了。</p>' : '') +
        '<p class="hzac-err" role="alert"></p>' +
        '<div class="hzac-acts"><button type="button" class="sec" data-a="close">以后再说</button><button type="submit" class="pri">' + (reg ? '注册' : '登录') + '</button></div>' +
        '<p class="hzac-note">只需要一个昵称，不收集真实姓名、邮箱或手机号。不登录也能玩，进度存在这台设备上；登录后会和这台设备上的进度合并。</p></form>';
      [].forEach.call(box.querySelectorAll('[data-t]'), function (b) { b.onclick = function () { var n = box.querySelector('#hzac-nick').value; openModal(b.getAttribute('data-t')); var i = document.getElementById('hzac-nick'); if (i) i.value = n; }; });
      box.querySelector('[data-a=close]').onclick = close;
      [].forEach.call(box.querySelectorAll('input.pin'), function (i) { i.addEventListener('input', function () { i.value = i.value.replace(/\D/g, '').slice(0, 4); }); });
      var form = box.querySelector('form'), errEl = box.querySelector('.hzac-err'), btn = box.querySelector('button[type=submit]');
      form.onsubmit = function (ev) {
        ev.preventDefault(); errEl.textContent = '';
        var nick = form.nick.value.replace(/\s+/g, ' ').trim(), pin = form.pin.value;
        if (nick.length < 2 || nick.length > 16) { errEl.textContent = ERR.nick_invalid; form.nick.focus(); return; }
        if (!/^\d{4}$/.test(pin)) { errEl.textContent = ERR.pin_invalid; form.pin.focus(); return; }
        if (reg && form.pin2.value !== pin) { errEl.textContent = '两次输入的密码不一样'; form.pin2.focus(); return; }
        btn.disabled = true; btn.textContent = reg ? '注册中…' : '登录中…';
        rpc(reg ? 'hzxy_register' : 'hzxy_login', { p_nick: nick, p_pin: pin }).then(function (r) {
          if (!r || r.error || !r.token) { var e = new Error((r && r.error) || 'x'); e.code = e.message; e.left = r && r.left; throw e; }
          setAcct({ token: r.token, nickname: r.nickname, mods: {} }); render(); close();
          toast(reg ? '注册成功！欢迎你，' + r.nickname : '欢迎回来，' + r.nickname);
          return syncAll({ merge: true, force: true }).then(function () { toast('进度已同步到云端'); });
        }).catch(function (e) {
          if (!mask) return; errEl.textContent = errText(e, e.left); btn.disabled = false; btn.textContent = reg ? '注册' : '登录';
        });
      };
      setTimeout(function () { var i = document.getElementById('hzac-nick'); if (i) i.focus(); }, 30);
    }
    mask.appendChild(box); document.body.appendChild(mask);
  }

  window.HZXY_ACCOUNT = { open: openModal, mountIn: mountIn, sync: syncAll, flush: flush, account: function () { var a = acct(); return a ? { nickname: a.nickname } : null; } };
  function start() {
    mount();
    var a = acct();
    if (a && a.token) {
      var t0 = 0; try { t0 = +sessionStorage.getItem('hzxy.ping') || 0; } catch (e) {}
      if (Date.now() - t0 > 30 * 60 * 1000) {
        try { sessionStorage.setItem('hzxy.ping', String(Date.now())); } catch (e) {}
        rpc('hzxy_ping', { p_token: a.token }).catch(function (e) { if (e.code === 'auth') { setAcct(null); render(); } });
      }
      syncAll();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
