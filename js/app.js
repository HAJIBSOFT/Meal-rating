document.addEventListener("DOMContentLoaded", () => {
  const loadingState = document.getElementById("loadingState");
  const unavailableState = document.getElementById("unavailableState");
  const unavailableIcon = document.getElementById("unavailableIcon");
  const unavailableTitle = document.getElementById("unavailableTitle");
  const unavailableDesc = document.getElementById("unavailableDesc");
  const alreadyVotedState = document.getElementById("alreadyVotedState");
  const votedMealBadge = document.getElementById("votedMealBadge");
  const evaluationSection = document.getElementById("evaluationSection");

  const mealImageContainer = document.getElementById("mealImageContainer");
  const mealImage = document.getElementById("mealImage");
  const mealName = document.getElementById("mealName");
  const mealDescription = document.getElementById("mealDescription");
  const mealDateBadge = document.getElementById("mealDateBadge");

  const evalForm = document.getElementById("evalForm");
  const projectSelect = document.getElementById("projectSelect");
  const starButtons = document.querySelectorAll(".star-btn");
  const ratingValueInput = document.getElementById("ratingValue");
  const ratingText = document.getElementById("ratingText");
  const submitBtn = document.getElementById("submitBtn");

  let currentMeal = null;

  const ratingLabels = {
    1: "سيئة جداً 😞",
    2: "مقبولة 😐",
    3: "جيدة 🙂",
    4: "جيدة جداً 😊",
    5: "ممتازة 🤩"
  };

  // ==================== دوال الكوكيز ====================
  function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${date.toUTCString()}; path=/; SameSite=Lax`;
  }

  function getCookie(name) {
    const key = encodeURIComponent(name) + "=";
    const parts = document.cookie.split(";");
    for (let part of parts) {
      part = part.trim();
      if (part.indexOf(key) === 0) {
        return decodeURIComponent(part.substring(key.length));
      }
    }
    return null;
  }

  function hasEvaluatedMeal(mealId) {
    const key = `meal_evaluated_${mealId}`;
    return getCookie(key) === "1" || localStorage.getItem(key) === "1";
  }

  function markMealEvaluated(mealId) {
    const key = `meal_evaluated_${mealId}`;
    setCookie(key, "1", 7);
    try {
      localStorage.setItem(key, "1");
    } catch (_) {}
  }

  // ==================== تفاعل النجوم ====================
  starButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = Number(btn.dataset.value);
      ratingValueInput.value = val;
      ratingText.textContent = ratingLabels[val];
      starButtons.forEach((b) => {
        b.classList.toggle("active", Number(b.dataset.value) <= val);
      });
    });
  });

  // ==================== تحميل وجبة اليوم ====================
  async function initPage() {
    try {
      const res = await API.get({ action: "getTodayMeal" });
      loadingState.classList.add("hidden");

      if (!res.success) {
        showUnavailable("تنبيه", res.error || "تعذر تحميل البيانات");
        return;
      }

      if (!res.meal) {
        showUnavailable(
          "انتهى وقت التقييم",
          "لم يتم إضافة وجبة لهذا اليوم بعد أو انتهى وقت التقييم.",
          "🍽️"
        );
        return;
      }

      if (res.meal.status !== "Active") {
        showUnavailable(
          "انتهى وقت التقييم",
          `تم إغلاق التقييم لوجبة اليوم (${res.meal.name}). نراكم في الوجبة القادمة!`,
          "⏰"
        );
        return;
      }

      currentMeal = res.meal;

      // التحقق من الكوكيز لمنع تكرار التقييم
      if (hasEvaluatedMeal(currentMeal.mealId)) {
        votedMealBadge.textContent = `الوجبة: ${currentMeal.name}`;
        votedMealBadge.classList.remove("hidden");
        alreadyVotedState.classList.remove("hidden");
        return;
      }

      // تعبئة بيانات الوجبة
      mealName.textContent = currentMeal.name;
      mealDateBadge.textContent = currentMeal.date;

      if (currentMeal.description) {
        mealDescription.textContent = currentMeal.description;
        mealDescription.classList.remove("hidden");
      }

      if (currentMeal.imageUrl) {
        mealImage.src = currentMeal.imageUrl;
        mealImage.onerror = () => mealImageContainer.classList.add("hidden");
        mealImageContainer.classList.remove("hidden");
      }

      // تعبئة المشاريع في القائمة المنسدلة
      projectSelect.innerHTML = '<option value="">اختر المشروع أو الموقع...</option>';
      (res.projects || []).forEach((proj) => {
        const opt = document.createElement("option");
        opt.value = proj.name;
        opt.textContent = proj.name;
        projectSelect.appendChild(opt);
      });

      evaluationSection.classList.remove("hidden");
    } catch (err) {
      loadingState.classList.add("hidden");
      showUnavailable("خطأ في الاتصال", "يرجى التأكد من الاتصال بالإنترنت وإعادة المحاولة.", "⚠️");
    }
  }

  function showUnavailable(title, desc, icon = "⏰") {
    if (unavailableIcon) unavailableIcon.textContent = icon;
    unavailableTitle.textContent = title;
    unavailableDesc.textContent = desc;
    unavailableState.classList.remove("hidden");
  }

  // ==================== إرسال التقييم ====================
  evalForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentMeal) return;

    const employeeName = document.getElementById("employeeName").value.trim();
    const project = projectSelect.value;
    const rating = Number(ratingValueInput.value);
    const repeatInput = document.querySelector('input[name="repeatChoice"]:checked');
    const notes = document.getElementById("notes").value.trim();

    if (!employeeName) return showToast("يرجى إدخال اسمك", "error");
    if (!project) return showToast("يرجى اختيار المشروع / الموقع", "error");
    if (!rating) return showToast("يرجى تقييم الوجبة بالنجوم", "error");
    if (!repeatInput) return showToast("يرجى تحديد احتمالية تكرار الوجبة", "error");

    submitBtn.disabled = true;
    submitBtn.textContent = "جاري الإرسال...";

    try {
      const res = await API.post({
        action: "submitEvaluation",
        mealId: currentMeal.mealId,
        employeeName,
        project,
        rating,
        repeatChoice: repeatInput.value,
        notes
      });

      if (!res.success) {
        showToast(res.error || "حدث خطأ أثناء الحفظ", "error");
        submitBtn.disabled = false;
        submitBtn.textContent = "إرسال التقييم";
        return;
      }

      // حفظ الكوكيز بعد نجاح التقييم
      markMealEvaluated(currentMeal.mealId);
      evaluationSection.classList.add("hidden");
      votedMealBadge.textContent = `الوجبة: ${currentMeal.name}`;
      votedMealBadge.classList.remove("hidden");
      alreadyVotedState.classList.remove("hidden");
      showToast("تم تسجيل تقييمك بنجاح، شكراً لك!", "success");
    } catch (err) {
      showToast("تعذر الإرسال، يرجى المحاولة مجدداً", "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "إرسال التقييم";
    }
  });

  initPage();
});