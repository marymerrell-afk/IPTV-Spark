const PLAN_LABELS = {
  "1-month": "1 Month",
  "3-months": "3 Months",
  "6-months": "6 Months",
  "12-months": "12 Months",
};

const SELLER_WHATSAPP = "212629917205";
const SELLER_EMAIL = "m3808206@gmail.com";

// Optional: auto-send orders to your WhatsApp (customer does NOT need to tap Send).
// CallMeBot numbers change often. Current bot: +34 623 78 64 49
// 1) Save that number in Contacts, then WhatsApp: I allow callmebot to send me messages
// 2) If the bot is full / not on WhatsApp, skip this — orders still email to SELLER_EMAIL.
// 3) Paste the API key they reply with into the quotes below.
const CALLMEBOT_API_KEY = "";

const formatOrderMessage = (payload) =>
  [
    "New TVFlex order",
    `Plan: ${payload.plan}`,
    `Amount: ${payload.amount}`,
    `Name: ${payload.name || "—"}`,
    `WhatsApp: ${payload.whatsapp || "—"}`,
    `Email: ${payload.email || "—"}`,
    `Device: ${payload.device}`,
  ].join("\n");

(() => {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.getElementById("mobile-nav");

  if (toggle && nav) {
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      nav.hidden = !open;
    };

    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      setOpen(open);
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });
  }
})();

(() => {
  if (!document.body.classList.contains("order-page")) return;

  const params = new URLSearchParams(window.location.search);
  const planKey = params.get("plan") || "";
  const priceRaw = params.get("price") || "";
  const planLabel = PLAN_LABELS[planKey] || "TVFlex subscription";
  const amount = priceRaw ? `$${priceRaw}` : "";

  const planEl = document.getElementById("order-plan");
  const priceEl = document.getElementById("order-price");
  if (planEl) planEl.textContent = planLabel;
  if (priceEl) priceEl.textContent = amount || "See pricing on homepage";

  const form = document.getElementById("order-form");
  const deviceSelect = document.getElementById("customer-device");
  const otherGroup = document.getElementById("device-other-group");
  const otherInput = document.getElementById("device-other");
  const errorEl = document.getElementById("form-error");
  const submitBtn = document.getElementById("order-submit");

  deviceSelect?.addEventListener("change", () => {
    const isOther = deviceSelect.value === "Other";
    if (otherGroup) otherGroup.hidden = !isOther;
    if (otherInput) otherInput.required = isOther;
  });

  const showError = (message) => {
    if (!errorEl) return;
    errorEl.hidden = !message;
    errorEl.textContent = message || "";
  };

  const setSubmitting = (busy) => {
    if (!submitBtn) return;
    submitBtn.disabled = busy;
    submitBtn.textContent = busy ? "Sending your details…" : "Continue to payment";
  };

  const sendOrderEmail = async (payload) => {
    const response = await fetch(`https://formsubmit.co/ajax/${SELLER_EMAIL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        _subject: `New TVFlex order – ${payload.plan} (${payload.amount})`,
        _template: "table",
        _replyto: payload.email || SELLER_EMAIL,
        name: payload.name || "TVFlex customer",
        email: payload.email || SELLER_EMAIL,
        customer_whatsapp: payload.whatsapp || "Not provided",
        customer_email: payload.email || "Not provided",
        device: payload.device,
        plan: payload.plan,
        amount: payload.amount,
        message: formatOrderMessage(payload),
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === "false" || data.success === false) {
      throw new Error(data.message || "Email notification failed");
    }
  };

  const sendOrderWhatsApp = async (payload) => {
    if (!CALLMEBOT_API_KEY) return;

    const url =
      "https://api.callmebot.com/whatsapp.php?" +
      new URLSearchParams({
        phone: SELLER_WHATSAPP,
        text: formatOrderMessage(payload),
        apikey: CALLMEBOT_API_KEY,
      }).toString();

    await fetch(url, { method: "GET", mode: "no-cors" });
  };

  const goToThankYou = (order) => {
    sessionStorage.setItem("tvflexOrder", JSON.stringify(order));

    const next = new URLSearchParams({
      plan: planKey || "custom",
      price: priceRaw || "",
      device: order.device,
      contact: order.whatsapp || order.email,
    });

    window.location.href = `thank-you.html?${next.toString()}`;
  };

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    showError("");

    const name = document.getElementById("customer-name")?.value.trim() || "";
    const whatsapp = document.getElementById("customer-whatsapp")?.value.trim() || "";
    const email = document.getElementById("customer-email")?.value.trim() || "";
    let device = deviceSelect?.value || "";

    if (!whatsapp && !email) {
      showError("Please enter a WhatsApp number or an email so we can contact you.");
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError("Please enter a valid email address.");
      return;
    }

    if (!device) {
      showError("Please select your device.");
      return;
    }

    if (device === "Other") {
      const other = otherInput?.value.trim() || "";
      if (!other) {
        showError("Please describe your device.");
        return;
      }
      device = `Other – ${other}`;
    }

    const order = {
      name,
      whatsapp,
      email,
      device,
      plan: planLabel,
      planKey,
      amount: amount || "TBD",
      priceRaw,
      createdAt: new Date().toISOString(),
    };

    setSubmitting(true);

    try {
      await sendOrderEmail(order);
      await sendOrderWhatsApp(order);
      goToThankYou(order);
    } catch {
      showError(
        "We could not save your details yet. Please try again in a moment. If this is the first order, open m3808206@gmail.com and confirm the FormSubmit activation email, then submit again."
      );
      setSubmitting(false);
    }
  });
})();

(() => {
  if (!document.body.classList.contains("thank-you-page")) return;

  const params = new URLSearchParams(window.location.search);
  let saved = null;
  try {
    saved = JSON.parse(sessionStorage.getItem("tvflexOrder") || "null");
  } catch {
    saved = null;
  }

  const planKey = params.get("plan") || saved?.planKey || "";
  const priceRaw = params.get("price") || saved?.priceRaw || "";
  const planLabel = PLAN_LABELS[planKey] || saved?.plan || "TVFlex subscription";
  const amount = priceRaw ? `$${priceRaw}` : saved?.amount || "";
  const device = params.get("device") || saved?.device || "—";
  const contact =
    params.get("contact") ||
    saved?.whatsapp ||
    saved?.email ||
    "—";

  const planEl = document.getElementById("order-plan");
  const priceEl = document.getElementById("order-price");
  const deviceEl = document.getElementById("order-device");
  const contactEl = document.getElementById("order-contact");
  const amountEl = document.getElementById("bank-amount");
  const toast = document.getElementById("toast");

  if (planEl) planEl.textContent = planLabel;
  if (priceEl) priceEl.textContent = amount || "See pricing on homepage";
  if (deviceEl) deviceEl.textContent = device;
  if (contactEl) contactEl.textContent = contact;
  if (amountEl) {
    amountEl.textContent = amount || "Select a plan";
    amountEl.dataset.copy = amount || "";
  }

  const waBase =
    "https://wa.me/+" +
    SELLER_WHATSAPP +
    "?text=" +
    encodeURIComponent(
      [
        "Hi, I completed the order form and will send the bank transfer.",
        `Plan: ${planLabel}`,
        `Amount: ${amount || "TBD"}`,
        `Device: ${device}`,
        `My WhatsApp: ${saved?.whatsapp || "—"}`,
        `My email: ${saved?.email || "—"}`,
      ].join("\n")
    );
  const waLink = document.getElementById("wa-link");
  if (waLink) waLink.href = waBase;

  const emailLink = document.getElementById("email-link");
  if (emailLink) {
    const subject = encodeURIComponent(`TVFlex order – ${planLabel}`);
    const body = encodeURIComponent(
      [
        "Hi,",
        "",
        "I completed the order form and will send / have sent the bank transfer.",
        "",
        `Plan: ${planLabel}`,
        `Amount: ${amount || "TBD"}`,
        `Device: ${device}`,
        `My WhatsApp: ${saved?.whatsapp || "—"}`,
        `My email: ${saved?.email || "—"}`,
        `My name: ${saved?.name || ""}`,
        "",
        "Thank you.",
      ].join("\n")
    );
    emailLink.href = `mailto:${SELLER_EMAIL}?subject=${subject}&body=${body}`;
  }

  const showToast = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(() => {
      toast.hidden = true;
    }, 1800);
  };

  const copyText = async (text, button) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "absolute";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }

    if (button) {
      const previous = button.textContent;
      button.textContent = "Copied";
      button.classList.add("is-copied");
      window.setTimeout(() => {
        button.textContent = previous;
        button.classList.remove("is-copied");
      }, 1200);
    }
    showToast("Copied");
  };

  document.querySelectorAll("[data-copy-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const valueEl = button.parentElement?.querySelector("[data-copy]");
      const text = valueEl?.getAttribute("data-copy") || valueEl?.textContent || "";
      copyText(text.trim(), button);
    });
  });

  const copyAll = document.getElementById("copy-all-bank");
  if (copyAll) {
    copyAll.addEventListener("click", () => {
      const block = [
        "Beneficiary: PERIOD ZERO",
        "Routing number: 064209588",
        "Account number: 200003074176",
        amount ? `Amount: ${amount}` : null,
        "Reference: TVFlex subscription",
      ]
        .filter(Boolean)
        .join("\n");
      copyText(block, copyAll);
    });
  }
})();
