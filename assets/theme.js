/* ================================
   SHOPIFY HELPERS
================================ */
if (!window.Shopify) window.Shopify = {};

/* ================================
   CART STORE
================================ */
const CartStore = (() => {
  let cart = null;
  const subscribers = [];

  function notify() {
    subscribers.forEach((fn) => fn(cart));
    document.dispatchEvent(new CustomEvent("cart:updated", { detail: cart }));
  }

  async function update() {
    try {
      const res = await fetch("/cart.js");
      cart = await res.json();
      notify();
      document.dispatchEvent(new CustomEvent("cart:ready"));
    } catch (e) {
      console.error("Store update failed", e);
    }
  }

  return {
    get: () => cart,
    update,
    set: (data) => {
      cart = data;
      notify();
    },
    subscribe: (fn) => {
      subscribers.push(fn);
      if (cart) fn(cart);
      return () => subscribers.splice(subscribers.indexOf(fn), 1);
    },
  };
})();

window.CartStore = CartStore;

/* ================================
   WISHLIST STORE
================================ */
const WishlistStore = (() => {
  let items = [];
  const subscribers = [];

  function notify() {
    subscribers.forEach((fn) => fn(items));
    document.dispatchEvent(
      new CustomEvent("wishlist:updated", { detail: items }),
    );
  }

  function load() {
    try {
      items = JSON.parse(localStorage.getItem("wishlist")) || [];
    } catch {
      items = [];
    }
  }

  return {
    init: () => {
      load();
      notify();
    },
    toggle: (item) => {
      const id = String(item.id);

      const exists = items.find((i) => i.id === id);

      let action;

      if (exists) {
        items = items.filter((i) => i.id !== id);
        action = "removed";
      } else {
        items.push({
          id,
          handle: item.handle,
        });
        action = "added";
      }

      localStorage.setItem("wishlist", JSON.stringify(items));
      notify();

      return action;
    },
    get: () => items,
    subscribe: (fn) => {
      subscribers.push(fn);
      fn(items);
      return () => subscribers.splice(subscribers.indexOf(fn), 1);
    },

    clear: () => {
      items = [];
      localStorage.removeItem("wishlist");
      notify();
    },
  };
})();

window.WishlistStore = WishlistStore;

function formatPrice(cents) {
  return new Intl.NumberFormat(document.documentElement.lang, {
    style: "currency",
    currency: window.currency?.code || "USD",
  }).format(cents / 100);
}

const productCache = new Map();

async function loadWishlistPage() {
  const grid = document.querySelector('[data-component="wishlist-grid"]');
  if (!grid) return;

  if (grid.dataset.subscribed) return;
  grid.dataset.subscribed = "1";

  const root = grid.closest('[data-component="wishlist"]') || document;

  const emptyState = root.querySelector('[data-component="wishlist-empty"]');
  const clearBtn = root.querySelector('[data-component="clear-button"]');

  let requestId = 0;

  if (grid._unsubscribe) {
    grid._unsubscribe();
    grid._unsubscribe = null;
  }

  grid._unsubscribe = WishlistStore.subscribe(async (items) => {
    const current = ++requestId;
    const hasItems = items.length > 0;
    if (emptyState) emptyState.hidden = hasItems;
    if (clearBtn) clearBtn.hidden = !hasItems;

    if (!hasItems) {
      grid.innerHTML = "";
      return;
    }

    const promises = items.map(async (item) => {
      if (productCache.has(item.handle)) {
        return {
          ...productCache.get(item.handle),
          wishlistId: item.id,
        };
      }

      try {
        const res = await fetch(`/products/${item.handle}.js`);
        if (!res.ok) return null;

        const data = await res.json();

        if (productCache.size > 50) {
          productCache.clear();
        }

        productCache.set(item.handle, data);

        return {
          ...data,
          wishlistId: item.id,
        };
      } catch (e) {
        console.warn("Product fetch failed", item.handle);
        return null;
      }
    });

    const products = (await Promise.all(promises)).filter(Boolean);

    if (current !== requestId) return;

    grid.innerHTML = products
      .map(
        (product) => `
      <div class="wishlist-card" data-component="wishlist-card" data-state="idle">
        <div class="image-wrapper-container">
          <a href="/products/${product.handle}">
            <img src="${product.images[0]}" class="img-cover" loading="lazy">
          </a>
          <div class="actions-overlay">
            <button class="icon-btn" data-action="wishlist-remove" data-id="${product.wishlistId}">✕</button>
            <button class="icon-btn" data-action="cart-add" data-variant-id="${product.variants[0].id}" data-title="${product.title}">🛒</button>
          </div>
        </div>
        <div class="card-info">
          <a href="/products/${product.handle}" class="product-title">${product.title}</a>
          <span class="product-price">${formatPrice(product.price)}</span>
        </div>
      </div>
    `,
      )
      .join("");
  });
}

function updateWishlistEmptyState() {
  const container = document.querySelector('[data-component="wishlist-grid"]');
  const empty = document.querySelector('[data-component="wishlist-empty"]');
  const clearBtn = document.querySelector('[data-component="clear-button"]');

  if (!container || !empty) return;

  const hasItems = container.querySelectorAll(".wishlist-card").length > 0;

  empty.hidden = hasItems;

  if (clearBtn) {
    clearBtn.hidden = !hasItems;
  }
}

function showNotification(data) {
  const note = document.querySelector('[data-component="cart-notification"]');
  if (!note || !data) return;

  const item = data.items
    ? data.items[0]
    : data.cart?.items
      ? data.cart.items[0]
      : data;
  if (!item) return;

  const msgSpan = document.querySelector(
    '[data-element="notification-message"]',
  );
  const titleSpan = document.querySelector(
    '[data-element="notification-title"]',
  );
  const imgDiv = document.querySelector('[data-element="notification-image"]');

  msgSpan.textContent =
    data.message || window.themeStrings?.cartAdded || "Added:";
  titleSpan.textContent = item.product_title || item.title || data.title || "";

  let imgUrl =
    item.image ||
    (item.featured_image && item.featured_image.url) ||
    item.featured_image ||
    "";
  if (imgUrl) {
    imgDiv.innerHTML = `<img src="${imgUrl.startsWith("//") ? "https:" + imgUrl : imgUrl}" width="50" height="40" class="notification-image">`;
    imgDiv.hidden = false;
  }

  const price = item.final_price || item.price;
  const metaSpan = document.querySelector('[data-element="notification-meta"]');

  if (metaSpan && price) {
    metaSpan.textContent = `${item.quantity || 1} × ${formatPrice(price)}`;
  }

  if (!note.open) {
    note.show();
  }

  clearTimeout(window.cartNoteTimer);
  window.cartNoteTimer = setTimeout(() => {
    note.close();
  }, 4000);
}

const actions = {
  /* --- HEADER --- */
  "mobile-menu-toggle": (el) => {
    const root = el.closest('[data-component="header"]');
    const menu =
      root?.querySelector('[data-component="mobile-menu"]') ||
      document.querySelector('[data-component="mobile-menu"]');
    if (!menu) return;
    const isOpen = menu.dataset.state === "open";

    const nextState = isOpen ? "closed" : "open";

    menu.dataset.state = nextState;
    menu.hidden = false;
    const firstLink = menu.querySelector("a");
    setTimeout(() => firstLink?.focus(), 200);
    el.dataset.state = nextState;

    el.setAttribute("aria-expanded", nextState === "open");

    document.body.style.overflow = nextState === "open" ? "hidden" : "";
  },

  "mobile-menu-close": (el) => {
    const root = el.closest('[data-component="header"]');
    const menu =
      root?.querySelector('[data-component="mobile-menu"]') ||
      document.querySelector('[data-component="mobile-menu"]');
    if (!menu) return;
    const burger =
      root?.querySelector('[data-action="mobile-menu-toggle"]') ||
      document.querySelector('[data-action="mobile-menu-toggle"]');

    menu.dataset.state = "closed";

    if (burger) {
      burger.dataset.state = "closed";
      burger.setAttribute("aria-expanded", "false");
    }

    document.body.style.overflow = "";

    setTimeout(() => {
      menu.hidden = true;
    }, 300);
  },
  /* --- WISHLIST --- */
  "wishlist-remove": (el) => {
    const id = el.dataset.id;
    const item = WishlistStore.get().find((i) => i.id === id);
    const card = el.closest('[data-component="wishlist-card"]');
    if (item && card) {
      card.dataset.state = "removing";
      setTimeout(() => WishlistStore.toggle(item), 200);
    }
  },

  "wishlist-clear": (el) => {
    if (el.dataset.state !== "confirming") {
      el.dataset.state = "confirming";
      clearTimeout(el._timer);
      el._timer = setTimeout(() => (el.dataset.state = "idle"), 3000);
      return;
    }
    WishlistStore.clear();
    el.dataset.state = "idle";
  },

  "notification-close": (el) => {
    el.closest('[data-component="cart-notification"]').close();
  },

  /* --- CART --- */
  "cart-add": async (el) => {
    const id = el.dataset.variantId;
    el.dataset.loading = "true";
    el.disabled = true;

    try {
      const added = await fetch("/cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ id: Number(id), quantity: 1 }],
        }),
      }).then((r) => r.json());

      let cart = null;

      try {
        cart = await fetch("/cart.js").then((r) => r.json());
      } catch (e) {
        console.warn("Cart fetch failed");
      }

      document.dispatchEvent(
        new CustomEvent("cart:item-added", {
          detail: added.items[0],
        }),
      );

      if (cart) {
        CartStore.set(cart);
      }
    } catch (err) {
      console.error("Cart add error:", err);
    } finally {
      delete el.dataset.loading;
      el.disabled = false;
    }
  },

  "cart-clear": (el) => {
    if (el.dataset.state !== "confirming") {
      el.dataset.state = "confirming";

      if (!el._originalText) el._originalText = el.textContent;

      el.textContent =
        window.themeStrings?.confirmClearTitle || "Are you sure?";

      clearTimeout(el._timer);
      el._timer = setTimeout(() => {
        el.dataset.state = "idle";
        el.textContent = el._originalText;
      }, 3000);
      return;
    }

    Cart.clear();
    el.dataset.state = "idle";
    if (el._originalText) el.textContent = el._originalText;
  },

  "cart-clear-confirm": () => {
    Cart.clear();
  },

  "qty-plus": (el) => {
    const input = el
      .closest('[data-component="cart-item"]')
      .querySelector('[data-element="quantity-input"]');
    input.value = parseInt(input.value) + 1;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  },

  "qty-minus": (el) => {
    const row = el.closest('[data-component="cart-item"]');
    const input = row.querySelector('[data-element="quantity-input"]');
    let val = parseInt(input.value);

    if (val === 1) {
      row.dataset.state = "confirm-delete";

      const confirmBox = row.querySelector('[data-element="confirm-delete"]');

      if (confirmBox) {
        confirmBox.hidden = false;
      }

      return;
    }
    input.value = val - 1;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  },

  "cart-remove-confirm": (el) => {
    const key = el.dataset.key;
    const row = el.closest('[data-component="cart-item"]');
    row.dataset.state = "removing";
    setTimeout(() => Cart.changeItem(key, 0), 300);
  },

  "cart-remove-cancel": (el) => {
    const row = el.closest('[data-component="cart-item"]');

    row.dataset.state = "idle";

    const confirmBox = row.querySelector('[data-element="confirm-delete"]');

    if (confirmBox) {
      confirmBox.hidden = true;
    }
  },

  "wishlist-toggle": (el) => {
    const id = el.dataset.id;
    const handle = el.dataset.handle;

    if (!id || !handle) return;

    const action = WishlistStore.toggle({ id, handle });

    el.classList.toggle("is-active", action === "added");

    const title = el.dataset.title || "Product";

    document.dispatchEvent(
      new CustomEvent(`wishlist:${action}`, {
        detail: { title },
      }),
    );
  },
};

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;

  const action = el.dataset.action;
  if (actions[action]) actions[action](el, e);
});
/* ================================
   CART CONTROLLER
================================ */
const Cart = (() => {
  async function changeItem(id, quantity) {
    const form = document.querySelector('[data-component="cart-form"]');
    const row = document.querySelector(`[data-key="${CSS.escape(id)}"]`);

    if (form) form.classList.add("is-loading");

    try {
      const res = await fetch("/cart/change.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, quantity }),
      });
      const data = await res.json();

      if (quantity > 0 && row) {
        row.classList.add("updated");
        setTimeout(() => row.classList.remove("updated"), 300);
      }

      CartStore.set(data);

      if (quantity === 0 && row) {
        row.remove();
      }
    } catch (err) {
      console.error("Update failed", err);
    } finally {
      if (form) form.classList.remove("is-loading");
    }
  }

  async function clear() {
    try {
      const res = await fetch("/cart/clear.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      CartStore.set(data);
    } catch (err) {
      console.error("Clear cart failed", err);
    }
  }

  return {
    init: () => {
      document.addEventListener("input", (e) => {
        if (!e.target.matches('[data-element="quantity-input"]')) return;
        const input = e.target;
        clearTimeout(input._timer);
        input._timer = setTimeout(
          () =>
            changeItem(input.dataset.key, Math.max(0, parseInt(input.value))),
          400,
        );
      });
    },
    changeItem,
    clear,
  };
})();

/* ================================
   GLOBAL LISTENERS & INITIALIZATION
================================ */
document.addEventListener("cart:updated", (event) => {
  const cart = event.detail;
  if (!cart) return;

  document.querySelectorAll("[data-line-price]").forEach((el) => {
    const itemKey = el.dataset.linePrice;
    const item = cart.items.find((i) => i.key === itemKey);

    if (item) {
      const newPrice = formatPrice(item.final_line_price);
      if (el.innerHTML !== newPrice) {
        el.innerHTML = newPrice;
        el.classList.add("price-updated");
        setTimeout(() => el.classList.remove("price-updated"), 300);
      }
    }
  });

  const totalEl = document.querySelector('[data-element="cart-total-value"]');
  if (totalEl) {
    const newTotal = formatPrice(cart.total_price);

    if (totalEl.innerHTML !== newTotal) {
      totalEl.innerHTML = newTotal;

      totalEl.classList.add("price-updated");
      setTimeout(() => totalEl.classList.remove("price-updated"), 400);
    }
  }
  if (cart.item_count === 0 && window.location.pathname.includes("/cart")) {
    const root = window.Shopify.routes.root || "/";
    window.location.replace(`${root}collections/all`);
  }
});

document.addEventListener("wishlist:updated", (e) => {
  const items = e.detail || [];
  const clBtn = document.querySelector('[data-component="clear-button"]');
  const ids = new Set(items.map((i) => String(i.id)));

  document.querySelectorAll("[data-wishlist-count]").forEach((el) => {
    el.textContent = items.length;
    el.classList.toggle("hidden", items.length === 0);
  });

  document
    .querySelectorAll('[data-action="wishlist-toggle"]')
    .forEach((btn) => {
      btn.classList.toggle("is-active", ids.has(String(btn.dataset.id)));
    });

  if (clBtn) {
    clBtn.hidden = items.length === 0;
  }
});

document.addEventListener("DOMContentLoaded", () => {
  Cart.init();
  WishlistStore.init();

  if (!window.Shopify.designMode) {
    CartStore.update();
  } else {
    setTimeout(() => CartStore.update(), 1000);
  }

  if (document.querySelector('[data-component="wishlist-grid"]')) {
    loadWishlistPage();
  }
});

document.addEventListener("cart:item-added", (event) => {
  const data = event.detail.product || event.detail;
  if (data) {
    showNotification(data);
  }
});

document.addEventListener("wishlist:added", (event) => {
  showNotification({
    title: event.detail.title,
    message: window.themeStrings?.wishlistAdded,
  });
});

document.addEventListener("shopify:section:load", (e) => {
  const section = e.target;

  if (section.querySelector('[data-component="wishlist-grid"]')) {
    loadWishlistPage();
  }
});

let ticking = false;

document.addEventListener("scroll", () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      const header = document.querySelector("[data-component='header']");
      if (header) {
        header.dataset.scrolled = window.scrollY > 10 ? "true" : "false";
      }
      ticking = false;
    });
    ticking = true;
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;

  const menu = document.querySelector('[data-component="mobile-menu"]');
  if (!menu || menu.dataset.state !== "open") return;

  const root = menu.closest('[data-component="header"]');

  const burger =
    root?.querySelector('[data-action="mobile-menu-toggle"]') ||
    document.querySelector('[data-action="mobile-menu-toggle"]');

  menu.dataset.state = "closed";
  document.body.style.overflow = "";

  if (burger) {
    burger.dataset.state = "closed";
    burger.setAttribute("aria-expanded", "false");
  }

  setTimeout(() => (menu.hidden = true), 300);
});
