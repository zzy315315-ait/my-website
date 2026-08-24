// ============================================================
// 小游戏用户状态加密传递模块
// 用于主站→中转站→小游戏之间安全传递用户登录状态
// ============================================================

var GameAuth = (function() {
  // 简单的加密密钥（纯前端加密，防止普通人直接看到）
  var SECRET_KEY = "cxjw2020class7star";

  // 简单加密：Base64 + 字符异或
  function encrypt(data) {
    try {
      var json = JSON.stringify(data);
      // 异或加密
      var xor = "";
      for (var i = 0; i < json.length; i++) {
        xor += String.fromCharCode(json.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length));
      }
      // Base64编码
      return btoa(unescape(encodeURIComponent(xor)));
    } catch(e) {
      return "";
    }
  }

  // 解密
  function decrypt(encoded) {
    try {
      // Base64解码
      var xor = decodeURIComponent(escape(atob(encoded)));
      // 异或解密
      var json = "";
      for (var i = 0; i < xor.length; i++) {
        json += String.fromCharCode(xor.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length));
      }
      return JSON.parse(json);
    } catch(e) {
      return null;
    }
  }

  // 获取当前登录用户信息
  function getCurrentUser() {
    try {
      var sess = JSON.parse(localStorage.getItem('sb_session') || sessionStorage.getItem('sb_session') || 'null');
      var adm = JSON.parse(localStorage.getItem('sb_admin') || 'null');
      return sess || adm;
    } catch(e) { return null; }
  }

  // 生成带加密用户信息的跳转URL
  function buildRedirectUrl(baseUrl) {
    var user = getCurrentUser();
    if (!user) {
      // 未登录，标记为访客
      var guestData = { is_guest: true, name: "访客", timestamp: Date.now() };
      var encoded = encrypt(guestData);
      return baseUrl + (baseUrl.indexOf('?') >= 0 ? '&' : '?') + "auth=" + encodeURIComponent(encoded);
    }
    // 登录用户，加密传递基本信息（不传递token）
    var userData = {
      is_guest: false,
      uid: user.uid || "",
      name: user.name || "",
      student_id: user.student_id || "",
      email: user.email || "",
      role: user.role || "student",
      timestamp: Date.now()
    };
    var encoded = encrypt(userData);
    return baseUrl + (baseUrl.indexOf('?') >= 0 ? '&' : '?') + "auth=" + encodeURIComponent(encoded);
  }

  // 从URL接收并解密用户信息
  function receiveAuth() {
    try {
      var urlParams = new URLSearchParams(window.location.search);
      var encoded = urlParams.get('auth');
      if (!encoded) {
        // 没有auth参数，检查sessionStorage
        var saved = sessionStorage.getItem('game_user');
        if (saved) {
          return JSON.parse(saved);
        }
        // 都没有，视为访客
        return { is_guest: true, name: "访客" };
      }
      var data = decrypt(encoded);
      if (data) {
        // 保存到sessionStorage，方便后续页面使用
        sessionStorage.setItem('game_user', JSON.stringify(data));
        return data;
      }
      return { is_guest: true, name: "访客" };
    } catch(e) {
      return { is_guest: true, name: "访客" };
    }
  }

  // 设置访客自定义名字
  function setGuestName(name) {
    var user = receiveAuth();
    user.name = name || "访客";
    user.is_guest = true;
    sessionStorage.setItem('game_user', JSON.stringify(user));
    return user;
  }

  // 更新右上角用户信息显示
  function updateUserInfo(elementId) {
    var user = receiveAuth();
    var el = document.getElementById(elementId || 'userInfo');
    if (!el) return;
    if (user.is_guest) {
      el.innerHTML = '👤 ' + escapeHtml(user.name || '访客') + ' <span style="font-size:10px;opacity:0.7">(访客)</span>';
    } else {
      el.innerHTML = '👤 ' + escapeHtml(user.name || '用户');
    }
  }

  // HTML转义
  function escapeHtml(str) {
    if (str == null) return '';
    var div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  // 禁止右键下载（防止右键保存网页、图片等）
  function disableRightClickDownload() {
    // 禁止全局右键菜单
    document.addEventListener('contextmenu', function(e) {
      // 允许特定元素的右键菜单（如下载按钮、输入框等）
      var target = e.target;
      if (target.closest('.allow-contextmenu') ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA') {
        return; // 允许右键
      }
      e.preventDefault();
      return false;
    });

    // 禁止图片拖动
    document.addEventListener('dragstart', function(e) {
      if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
        e.preventDefault();
        return false;
      }
    });

    // 禁止文字选中（可选，防止复制）
    // document.addEventListener('selectstart', function(e) {
    //   if (!e.target.closest('.allow-select')) {
    //     e.preventDefault();
    //     return false;
    //   }
    // });
  }

  // 显示Bug反馈弹窗
  function showBugFeedbackModal() {
    var user = receiveAuth();
    var modal = document.createElement('div');
    modal.id = 'bug-feedback-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
    modal.innerHTML =
      '<div style="background:#1a1a2e;border-radius:16px;padding:24px;max-width:420px;width:90%;border:1px solid rgba(198,107,255,0.3);box-shadow:0 8px 32px rgba(0,0,0,0.5);">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
          '<h3 style="color:#e8b8ff;margin:0;font-size:18px;">Bug反馈</h3>' +
          '<button id="bug-close-btn" style="background:none;border:none;color:#888;font-size:20px;cursor:pointer;">&times;</button>' +
        '</div>' +
        '<div style="margin-bottom:12px;">' +
          '<label style="color:#aaa;font-size:13px;display:block;margin-bottom:4px;">反馈类型</label>' +
          '<select id="bug-category" style="width:100%;padding:8px 12px;border-radius:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#ddd;font-size:14px;">' +
            '<option value="bug">功能Bug</option>' +
            '<option value="suggestion">建议反馈</option>' +
            '<option value="other">其他</option>' +
          '</select>' +
        '</div>' +
        '<div style="margin-bottom:16px;">' +
          '<label style="color:#aaa;font-size:13px;display:block;margin-bottom:4px;">详细描述</label>' +
          '<textarea id="bug-message" rows="4" placeholder="请描述遇到的问题或建议..." style="width:100%;padding:8px 12px;border-radius:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#ddd;font-size:14px;resize:vertical;font-family:inherit;"></textarea>' +
        '</div>' +
        '<button id="bug-submit-btn" style="width:100%;padding:10px;border-radius:8px;background:linear-gradient(135deg,#c66bff,#8b5cf6);color:#fff;border:none;font-size:14px;font-weight:600;cursor:pointer;">提交反馈</button>' +
      '</div>';
    document.body.appendChild(modal);
    document.getElementById('bug-close-btn').addEventListener('click', function() { document.body.removeChild(modal); });
    modal.addEventListener('click', function(e) { if (e.target === modal) document.body.removeChild(modal); });
    document.getElementById('bug-submit-btn').addEventListener('click', function() {
      var category = document.getElementById('bug-category').value;
      var message = document.getElementById('bug-message').value.trim();
      if (!message) { alert('请填写详细描述'); return; }
      var btn = document.getElementById('bug-submit-btn');
      btn.textContent = '提交中...'; btn.disabled = true;
      var url = "https://ekfntkpjqzmkibdimtru.supabase.co/rest/v1/support_tickets";
      var body = JSON.stringify({ user_id: user.uid || null, name: user.name || '访客', student_id: user.student_id || '', category: category, message: message, status: 'pending' });
      var xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);
      xhr.setRequestHeader("apikey", "sb_publishable_Z3wpxD9ZRbXm9-gPPQOGZg_KKhr_yIs");
      xhr.setRequestHeader("Authorization", "Bearer " + "sb_publishable_Z3wpxD9ZRbXm9-gPPQOGZg_KKhr_yIs");
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("Prefer", "return=minimal");
      xhr.onload = function() { btn.textContent = '提交成功！'; setTimeout(function() { document.body.removeChild(modal); }, 1000); };
      xhr.onerror = function() { btn.textContent = '提交失败，请重试'; btn.disabled = false; };
      xhr.send(body);
    });
  }

  return {
    encrypt: encrypt,
    decrypt: decrypt,
    getCurrentUser: getCurrentUser,
    buildRedirectUrl: buildRedirectUrl,
    receiveAuth: receiveAuth,
    setGuestName: setGuestName,
    updateUserInfo: updateUserInfo,
    escapeHtml: escapeHtml,
    disableRightClickDownload: disableRightClickDownload,
    showBugFeedbackModal: showBugFeedbackModal
  };
})();
