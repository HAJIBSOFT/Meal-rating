const API = {
  async get(params = {}) {
    const url = new URL(APP_CONFIG.SCRIPT_URL);
    Object.keys(params).forEach((key) => url.searchParams.append(key, params[key]));

    const response = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow"
    });

    if (!response.ok) {
      throw new Error("فشل الاتصال بالخادم");
    }
    return response.json();
  },

  async post(payload = {}) {
    // نستخدم text/plain لتجنب مشكلة CORS Preflight مع Google Apps Script
    const response = await fetch(APP_CONFIG.SCRIPT_URL, {
      method: "POST",
      redirect: "follow",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("فشل إرسال البيانات للخادم");
    }
    return response.json();
  }
};

function showToast(message, type = "default") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = "toast " + (type !== "default" ? type : "");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 3500);
}