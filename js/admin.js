document.addEventListener("DOMContentLoaded", () => {
  const loginOverlay = document.getElementById("loginOverlay");
  const pinForm = document.getElementById("pinForm");
  const adminPinInput = document.getElementById("adminPinInput");
  const loginError = document.getElementById("loginError");
  const loginBtn = document.getElementById("loginBtn");
  const adminDashboard = document.getElementById("adminDashboard");

  const refreshAdminBtn = document.getElementById("refreshAdminBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  // التبويبات
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  // الفلاتر والإحصائيات
  const filterMealSelect = document.getElementById("filterMealSelect");
  const filterProjectSelect = document.getElementById("filterProjectSelect");
  const exportCsvBtn = document.getElementById("exportCsvBtn");
  const statAvgRating = document.getElementById("statAvgRating");
  const statAvgStars = document.getElementById("statAvgStars");
  const statTotalCount = document.getElementById("statTotalCount");
  const statRepeatRate = document.getElementById("statRepeatRate");
  const ratingDistribution = document.getElementById("ratingDistribution");
  const repeatDistribution = document.getElementById("repeatDistribution");
  const evaluationsBody = document.getElementById("evaluationsBody");
  const evaluationsEmpty = document.getElementById("evaluationsEmpty");

  // وجبة اليوم
  const todayDateDisplay = document.getElementById("todayDateDisplay");
  const todayStatusBadge = document.getElementById("todayStatusBadge");
  const toggleStatusBtn = document.getElementById("toggleStatusBtn");
  const deleteMealBtn = document.getElementById("deleteMealBtn");
  const mealForm = document.getElementById("mealForm");
  const mealNameInput = document.getElementById("mealNameInput");
  const mealDescInput = document.getElementById("mealDescInput");
  const mealImageInput = document.getElementById("mealImageInput");
  const imagePreviewWrapper = document.getElementById("imagePreviewWrapper");
  const imagePreview = document.getElementById("imagePreview");
  const removeImageBtn = document.getElementById("removeImageBtn");
  const saveMealBtn = document.getElementById("saveMealBtn");

  // المشاريع
  const addProjectForm = document.getElementById("addProjectForm");
  const newProjectName = document.getElementById("newProjectName");
  const addProjectBtn = document.getElementById("addProjectBtn");
  const projectsList = document.getElementById("projectsList");

  let adminPin = sessionStorage.getItem("meal_admin_pin") || "";
  let state = {
    today: "",
    meals: [],
    evaluations: [],
    projects: [],
    todayMeal: null
  };
  let imageAction = "keep"; // keep | upload | remove
  let compressedImageBase64 = "";

  // ==================== التبويبات ====================
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
    });
  });

  // ==================== تسجيل الدخول ====================
  if (adminPin) {
    loadDashboardData(true);
  }

  pinForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pin = adminPinInput.value.trim();
    if (!pin) return;

    loginError.classList.add("hidden");
    loginBtn.disabled = true;
    loginBtn.textContent = "جاري التحقق...";

    try {
      const res = await API.get({ action: "verifyPin", pin });
      if (res.success) {
        adminPin = pin;
        sessionStorage.setItem("meal_admin_pin", pin);
        await loadDashboardData();
      } else {
        loginError.classList.remove("hidden");
      }
    } catch (err) {
      showToast("تعذر الاتصال بالخادم", "error");
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "دخول";
    }
  });

  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("meal_admin_pin");
    adminPin = "";
    adminDashboard.classList.add("hidden");
    loginOverlay.classList.remove("hidden");
    adminPinInput.value = "";
  });

  refreshAdminBtn.addEventListener("click", () => loadDashboardData());

  // ==================== جلب بيانات الإدارة ====================
  async function loadDashboardData(isAutoLogin = false) {
    try {
      const res = await API.get({ action: "getAdminData", pin: adminPin });
      if (!res.success) {
        if (isAutoLogin) {
          sessionStorage.removeItem("meal_admin_pin");
          adminPin = "";
        } else {
          showToast(res.error || "فشل جلب البيانات", "error");
        }
        return;
      }

      state.today = res.today;
      state.meals = res.meals || [];
      state.evaluations = res.evaluations || [];
      state.projects = res.projects || [];
      state.todayMeal = state.meals.find((m) => m.date === state.today) || null;

      loginOverlay.classList.add("hidden");
      adminDashboard.classList.remove("hidden");

      renderFilters();
      renderAnalytics();
      renderTodayMealPanel();
      renderProjects();
    } catch (err) {
      showToast("حدث خطأ أثناء تحميل البيانات", "error");
    }
  }

  // ==================== الفلاتر والإحصائيات ====================
  function renderFilters() {
    const prevMeal = filterMealSelect.value;
    const prevProj = filterProjectSelect.value;

    filterMealSelect.innerHTML = '<option value="ALL">جميع الوجبات</option>';
    state.meals.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.mealId;
      opt.textContent = `${m.date} — ${m.name}`;
      filterMealSelect.appendChild(opt);
    });

    if (prevMeal && [...filterMealSelect.options].some((o) => o.value === prevMeal)) {
      filterMealSelect.value = prevMeal;
    } else if (state.todayMeal) {
      filterMealSelect.value = state.todayMeal.mealId;
    }

    filterProjectSelect.innerHTML = '<option value="ALL">جميع المشاريع</option>';
    state.projects.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.name;
      opt.textContent = p.name;
      filterProjectSelect.appendChild(opt);
    });
    if (prevProj && [...filterProjectSelect.options].some((o) => o.value === prevProj)) {
      filterProjectSelect.value = prevProj;
    }
  }

  filterMealSelect.addEventListener("change", renderAnalytics);
  filterProjectSelect.addEventListener("change", renderAnalytics);

  function getFilteredEvaluations() {
    const mealId = filterMealSelect.value;
    const project = filterProjectSelect.value;

    return state.evaluations.filter((ev) => {
      const matchMeal = mealId === "ALL" || ev.mealId === mealId;
      const matchProj = project === "ALL" || ev.project === project;
      return matchMeal && matchProj;
    });
  }

  function renderAnalytics() {
    const list = getFilteredEvaluations();
    const total = list.length;

    statTotalCount.textContent = total;

    if (total === 0) {
      statAvgRating.textContent = "0.0";
      statAvgStars.textContent = "☆☆☆☆☆";
      statRepeatRate.textContent = "0%";
    } else {
      const sum = list.reduce((acc, item) => acc + item.rating, 0);
      const avg = sum / total;
      statAvgRating.textContent = avg.toFixed(1);
      const fullStars = Math.round(avg);
      statAvgStars.textContent = "★".repeat(fullStars) + "☆".repeat(5 - fullStars);

      const yesCount = list.filter((item) => item.repeatChoice === "نعم").length;
      statRepeatRate.textContent = Math.round((yesCount / total) * 100) + "%";
    }

    // توزيع النجوم
    ratingDistribution.innerHTML = "";
    for (let s = 5; s >= 1; s--) {
      const count = list.filter((i) => i.rating === s).length;
      const pct = total ? Math.round((count / total) * 100) : 0;
      ratingDistribution.innerHTML += `
        <div class="dist-item">
          <span>${s} نجوم</span>
          <div class="dist-bar-bg"><div class="dist-bar-fill" style="width:${pct}%"></div></div>
          <span>${count}</span>
        </div>
      `;
    }

    // توزيع التكرار
    repeatDistribution.innerHTML = "";
    ["نعم", "ربما", "لا"].forEach((choice) => {
      const count = list.filter((i) => i.repeatChoice === choice).length;
      const pct = total ? Math.round((count / total) * 100) : 0;
      repeatDistribution.innerHTML += `
        <div class="dist-item">
          <span>${choice}</span>
          <div class="dist-bar-bg"><div class="dist-bar-fill" style="width:${pct}%"></div></div>
          <span>${pct}%</span>
        </div>
      `;
    });

    // جدول التقييمات
    evaluationsBody.innerHTML = "";
    if (total === 0) {
      evaluationsEmpty.classList.remove("hidden");
    } else {
      evaluationsEmpty.classList.add("hidden");
      list.forEach((ev) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${escapeHtml(ev.employeeName)}</strong></td>
          <td>${escapeHtml(ev.project)}</td>
          <td>${escapeHtml(ev.mealName)}</td>
          <td><span style="color:#f59e0b">${"★".repeat(ev.rating)}</span> (${ev.rating})</td>
          <td>${escapeHtml(ev.repeatChoice)}</td>
          <td>${escapeHtml(ev.notes || "—")}</td>
         
        `;
        evaluationsBody.appendChild(tr);
      });
    }
  }

  // تصدير CSV
  exportCsvBtn.addEventListener("click", () => {
    const list = getFilteredEvaluations();
    if (!list.length) return showToast("لا توجد بيانات للتصدير", "error");

    const headers = ["الموظف", "المشروع", "التاريخ", "الوجبة", "التقييم", "تكرار الوجبة", "الملاحظات", "الوقت"];
    const rows = list.map((ev) => [
      ev.employeeName,
      ev.project,
      ev.date,
      ev.mealName,
      ev.rating,
      ev.repeatChoice,
      ev.notes,
      ev.timestamp
    ]);

    const csvContent =
      "\uFEFF" +
      [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `meal_evaluations_${state.today || "export"}.csv`;
    link.click();
  });

  // ==================== إدارة وجبة اليوم ====================
  function renderTodayMealPanel() {
    todayDateDisplay.textContent = `تاريخ اليوم: ${state.today}`;
    imageAction = "keep";
    compressedImageBase64 = "";
    mealImageInput.value = "";

    const meal = state.todayMeal;
    if (!meal) {
      todayStatusBadge.textContent = "لم تُضف وجبة اليوم";
      todayStatusBadge.className = "badge badge-neutral";
      toggleStatusBtn.classList.add("hidden");
      deleteMealBtn.classList.add("hidden");

      mealNameInput.value = "";
      mealDescInput.value = "";
      imagePreviewWrapper.classList.add("hidden");
      imagePreview.src = "";
      return;
    }

    mealNameInput.value = meal.name;
    mealDescInput.value = meal.description || "";

    if (meal.status === "Active") {
      todayStatusBadge.textContent = "التقييم مفتوح";
      todayStatusBadge.className = "badge badge-success";
      toggleStatusBtn.textContent = "🔒 إغلاق التقييم";
    } else {
      todayStatusBadge.textContent = "التقييم مغلق";
      todayStatusBadge.className = "badge badge-danger";
      toggleStatusBtn.textContent = "🔓 فتح التقييم";
    }

    toggleStatusBtn.classList.remove("hidden");
    deleteMealBtn.classList.remove("hidden");

    if (meal.imageUrl) {
      imagePreview.src = meal.imageUrl;
      imagePreviewWrapper.classList.remove("hidden");
    } else {
      imagePreviewWrapper.classList.add("hidden");
      imagePreview.src = "";
    }
  }

  // ضغط الصورة من الهاتف قبل الرفع
  mealImageInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      compressedImageBase64 = await compressImage(file, 900, 0.78);
      imageAction = "upload";
      imagePreview.src = compressedImageBase64;
      imagePreviewWrapper.classList.remove("hidden");
      showToast("تم تجهيز الصورة وضغطها بنجاح");
    } catch (err) {
      showToast("تعذر معالجة الصورة المختارة", "error");
    }
  });

  removeImageBtn.addEventListener("click", () => {
    imageAction = "remove";
    compressedImageBase64 = "";
    mealImageInput.value = "";
    imagePreview.src = "";
    imagePreviewWrapper.classList.add("hidden");
  });

  mealForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = mealNameInput.value.trim();
    const description = mealDescInput.value.trim();

    if (!name) return showToast("يرجى كتابة اسم الوجبة", "error");

    saveMealBtn.disabled = true;
    saveMealBtn.textContent = "جاري الحفظ والرفع...";

    try {
      const res = await API.post({
        action: "saveTodayMeal",
        pin: adminPin,
        name,
        description,
        imageAction,
        imageBase64: compressedImageBase64,
        imageMimeType: "image/jpeg"
      });

      if (res.success) {
        showToast(res.message || "تم حفظ وجبة اليوم", "success");
        await loadDashboardData();
      } else {
        showToast(res.error || "فشل الحفظ", "error");
      }
    } catch (err) {
      showToast("حدث خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      saveMealBtn.disabled = false;
      saveMealBtn.textContent = "حفظ ونشر وجبة اليوم";
    }
  });

  toggleStatusBtn.addEventListener("click", async () => {
    if (!state.todayMeal) return;
    toggleStatusBtn.disabled = true;
    try {
      const res = await API.post({
        action: "toggleMealStatus",
        pin: adminPin,
        mealId: state.todayMeal.mealId
      });
      if (res.success) {
        showToast(res.newStatus === "Active" ? "تم فتح التقييم" : "تم إغلاق التقييم", "success");
        await loadDashboardData();
      }
    } finally {
      toggleStatusBtn.disabled = false;
    }
  });

  deleteMealBtn.addEventListener("click", async () => {
    if (!state.todayMeal) return;
    if (!confirm("هل أنت متأكد من حذف وجبة اليوم؟")) return;

    deleteMealBtn.disabled = true;
    try {
      const res = await API.post({
        action: "deleteMeal",
        pin: adminPin,
        mealId: state.todayMeal.mealId
      });
      if (res.success) {
        showToast("تم حذف وجبة اليوم", "success");
        await loadDashboardData();
      }
    } finally {
      deleteMealBtn.disabled = false;
    }
  });

  // ==================== إدارة المشاريع ====================
  function renderProjects() {
    projectsList.innerHTML = "";
    if (!state.projects.length) {
      projectsList.innerHTML = '<li class="empty-msg">لا توجد مشاريع مضافة حالياً</li>';
      return;
    }

    state.projects.forEach((proj) => {
      const li = document.createElement("li");
      li.className = "project-item";
      li.innerHTML = `
        <span>📍 ${escapeHtml(proj.name)}</span>
        <button class="btn btn-danger-ghost btn-sm" data-id="${escapeHtml(proj.id)}">حذف</button>
      `;
      li.querySelector("button").addEventListener("click", () => handleDeleteProject(proj.id, proj.name));
      projectsList.appendChild(li);
    });
  }

  addProjectForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const projectName = newProjectName.value.trim();
    if (!projectName) return;

    addProjectBtn.disabled = true;
    try {
      const res = await API.post({
        action: "addProject",
        pin: adminPin,
        projectName
      });
      if (res.success) {
        newProjectName.value = "";
        showToast("تم إضافة المشروع بنجاح", "success");
        await loadDashboardData();
      } else {
        showToast(res.error || "تعذر الإضافة", "error");
      }
    } finally {
      addProjectBtn.disabled = false;
    }
  });

  async function handleDeleteProject(projectId, projectName) {
    if (!confirm(`هل تريد حذف "${projectName}" من القائمة؟`)) return;
    try {
      const res = await API.post({
        action: "deleteProject",
        pin: adminPin,
        projectId
      });
      if (res.success) {
        showToast("تم حذف المشروع", "success");
        await loadDashboardData();
      }
    } catch (err) {
      showToast("تعذر حذف المشروع", "error");
    }
  }

  // ==================== دوال مساعدة ====================
  function compressImage(file, maxWidth, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = reject;
        img.src = event.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
});