
const productsContainer = document.getElementById("products");
const resultsCount = document.getElementById("resultsCount");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const sortProducts = document.getElementById("sortProducts");
const maxPrice = document.getElementById("maxPrice");
const resetFilters = document.getElementById("resetFilters");

const pagination = document.getElementById("pagination");
const prevPage = document.getElementById("prevPage");
const nextPage = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");

const PAGE_SIZE = 12;
let currentPage = 1;

const cartLink = document.getElementById("cartLink");
const cartCount = document.getElementById("cartCount");
const cartPanel = document.getElementById("cartPanel");
const cartOverlay = document.getElementById("cartOverlay");
const closeCart = document.getElementById("closeCart");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const checkoutButton = document.getElementById("checkoutButton");

const productModalOverlay = document.getElementById("productModalOverlay");
const closeProductModal = document.getElementById("closeProductModal");
const modalProductImage = document.getElementById("modalProductImage");
const modalProductTitle = document.getElementById("modalProductTitle");
const modalProductCategory = document.getElementById("modalProductCategory");
const modalProductDescription = document.getElementById("modalProductDescription");
const modalProductRating = document.getElementById("modalProductRating");
const modalProductPrice = document.getElementById("modalProductPrice");
const modalAddToCart = document.getElementById("modalAddToCart");

const electronicCategories = [
    "smartphones",
    "laptops",
    "tablets",
    "mobile-accessories"
];

let allProducts = [];
let currentModalProduct = null;
// Recover safely if the saved cart is missing or invalid.
let cart = [];
try {
    const storedCart = JSON.parse(localStorage.getItem("cart") || "[]");
    if (Array.isArray(storedCart)) {
        cart = storedCart.filter(function(item) {
            return item && Number.isFinite(Number(item.price)) &&
                Number.isInteger(item.quantity) && item.quantity > 0 &&
                typeof item.id === "number" && typeof item.title === "string";
        });
    }
} catch (error) {
    console.warn("Stored cart could not be loaded:", error);
}

let lastModalFocus = null;

function formatPrice(price) {
    return Number(price).toFixed(2);
}

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function(char) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[char];
    });
}

// Loading products and handling errors
async function getProducts() {
    productsContainer.innerHTML = '<p class="loading-message">Loading products...</p>';
    resultsCount.textContent = "";

    try {
        const response = await fetch("https://dummyjson.com/products?limit=0");

        if (!response.ok) {
            throw new Error("Failed to load products");
        }

        const data = await response.json();

        if (!Array.isArray(data.products)) {
            throw new Error("Invalid product data");
        }

        allProducts = data.products.filter(function(product) {
            return electronicCategories.includes(product.category);
        });

        applyFilters();

    } catch (error) {
        productsContainer.innerHTML = `
            <div class="load-error">
                <p>Something went wrong while loading products.</p>
                <button type="button" id="retryProducts">Try Again</button>
            </div>
        `;

        console.error(error);
    }
}

// Product categories
function createCategoryOptions() {
    electronicCategories.forEach(function(category) {
        const option = document.createElement("option");

        option.value = category;
        option.textContent = category.replace(/-/g, " ");

        categoryFilter.appendChild(option);
    });
}

// Display products
function displayProducts(products) {
    productsContainer.innerHTML = "";
    resultsCount.textContent = `${products.length} products found`;

    if (products.length === 0) {
        productsContainer.innerHTML = `
            <p class="no-results">
                No products found. Try another search.
            </p>
        `;
        return;
    }

    products.forEach(function(product) {
        const productCard = document.createElement("div");
        productCard.classList.add("product-card");

        productCard.innerHTML = `
            <img src="${escapeHtml(product.thumbnail)}" alt="${escapeHtml(product.title)}" loading="lazy">

            <h3>${escapeHtml(product.title)}</h3>

            <p class="category">${escapeHtml(product.category.replace(/-/g, " "))}</p>

            <p class="price">$${formatPrice(product.price)}</p>

            <p class="rating">⭐ ${Number(product.rating).toFixed(1)} / 5</p>

            <button type="button" class="add-to-cart" data-id="${product.id}">
                Add to Cart
            </button>

            <button type="button" class="view-details" data-id="${product.id}">
                View Details
            </button>
        `;

        productsContainer.appendChild(productCard);
    });
}

// Search, category, price and sorting
function applyFilters() {
    const searchText = searchInput.value.toLowerCase().trim();
    const selectedCategory = categoryFilter.value;
    const selectedSort = sortProducts.value;
    const selectedMaxPrice = maxPrice.value;

    const filteredProducts = allProducts.filter(function(product) {
        const matchesSearch = product.title.toLowerCase().includes(searchText);

        const matchesCategory =
            selectedCategory === "all" ||
            product.category === selectedCategory;

        const matchesPrice =
            selectedMaxPrice === "all" ||
            product.price <= Number(selectedMaxPrice);

        return matchesSearch && matchesCategory && matchesPrice;
    });

    if (selectedSort === "price-low") {
        filteredProducts.sort(function(a, b) {
            return a.price - b.price;
        });
    } else if (selectedSort === "price-high") {
        filteredProducts.sort(function(a, b) {
            return b.price - a.price;
        });
    } else if (selectedSort === "rating-high") {
        filteredProducts.sort(function(a, b) {
            return b.rating - a.rating;
        });
    }

    
const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));

currentPage = Math.min(currentPage, totalPages);

const start = (currentPage - 1) * PAGE_SIZE;
const pageProducts = filteredProducts.slice(start, start + PAGE_SIZE);

displayProducts(pageProducts);

resultsCount.textContent = `${filteredProducts.length} products found`;
pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

pagination.style.display = totalPages > 1 ? "flex" : "none";

prevPage.disabled = currentPage === 1;
nextPage.disabled = currentPage === totalPages;

}

// Filter event listeners
searchInput.addEventListener("input", applyFilters);
categoryFilter.addEventListener("change", applyFilters);
sortProducts.addEventListener("change", applyFilters);
maxPrice.addEventListener("change", applyFilters);

// Reset all filters
resetFilters.addEventListener("click", function() {
    searchInput.value = "";
    categoryFilter.value = "all";
    sortProducts.value = "default";
    maxPrice.value = "all";

    applyFilters();
});

// Save cart in localStorage
function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
}

// Update cart count
function updateCartCount() {
    let totalQuantity = 0;

    cart.forEach(function(product) {
        totalQuantity += product.quantity || 1;
    });

    cartCount.textContent = totalQuantity;
}

// Add a product to the cart
function addToCart(product) {
    if (!product) return;

    const existingProduct = cart.find(function(item) {
        return item.id === product.id;
    });

    if (existingProduct) {
        existingProduct.quantity = (existingProduct.quantity || 1) + 1;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }

    saveCart();
    updateCartCount();

    if (cartPanel.classList.contains("open")) {
        renderCart();
    }
}

// Display cart contents
function renderCart() {
    cartItems.innerHTML = "";

    if (cart.length === 0) {
        cartItems.innerHTML = "<p>Your cart is empty.</p>";
        cartTotal.textContent = "0.00";
        return;
    }

    let total = 0;

    cart.forEach(function(product, index) {
        const quantity = product.quantity || 1;
        const cartItem = document.createElement("div");

        cartItem.classList.add("cart-item");

        cartItem.innerHTML = `
            <img src="${escapeHtml(product.thumbnail)}" alt="${escapeHtml(product.title)}">

            <div class="cart-item-info">
                <h4>${escapeHtml(product.title)}</h4>

                <p>$${formatPrice(product.price)}</p>

                <div class="quantity-controls">
                    <button type="button" class="decrease-quantity" data-index="${index}">−</button>

                    <span>${quantity}</span>

                    <button type="button" class="increase-quantity" data-index="${index}">+</button>
                </div>

                <button type="button" class="remove-item" data-index="${index}">
                    Remove
                </button>
            </div>
        `;

        cartItems.appendChild(cartItem);

        total += product.price * quantity;
    });

    cartTotal.textContent = total.toFixed(2);
}

// Open shopping cart
function openCart() {
    renderCart();
    cartPanel.inert = false;
    cartPanel.setAttribute("aria-hidden", "false");
    cartLink.setAttribute("aria-expanded", "true");
    cartPanel.classList.add("open");
    cartOverlay.classList.add("open");
    closeCart.focus();
}

// Close shopping cart
function closeCartPanel() {
    if (!cartPanel.classList.contains("open")) return;
    if (cartPanel.contains(document.activeElement)) cartLink.focus();
    cartPanel.classList.remove("open");
    cartOverlay.classList.remove("open");
    cartPanel.inert = true;
    cartPanel.setAttribute("aria-hidden", "true");
    cartLink.setAttribute("aria-expanded", "false");
}

cartLink.addEventListener("click", function(event) {
    event.preventDefault();
    openCart();
});

closeCart.addEventListener("click", closeCartPanel);
cartOverlay.addEventListener("click", closeCartPanel);

// Increase, decrease and remove cart items
cartItems.addEventListener("click", function(event) {
    const button = event.target.closest("button[data-index]");

    if (!button) return;

    const index = Number(button.dataset.index);

    if (!cart[index]) return;

    if (button.classList.contains("remove-item")) {
        cart.splice(index, 1);

    } else if (button.classList.contains("increase-quantity")) {
        cart[index].quantity = (cart[index].quantity || 1) + 1;

    } else if (button.classList.contains("decrease-quantity")) {
        cart[index].quantity = (cart[index].quantity || 1) - 1;

        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
    }

    saveCart();
    updateCartCount();
    renderCart();
});

// Demo checkout
checkoutButton.addEventListener("click", function() {
    if (cart.length === 0) {
        alert("Your cart is empty.");
        return;
    }

    if (confirm("Are you sure you want to place this demo order?")) {
        cart = [];

        saveCart();
        updateCartCount();
        renderCart();

        alert("Demo order placed! No payment was made.");
    }
});

// Open product details
function openProductModal(product) {
    lastModalFocus = document.activeElement;
    currentModalProduct = product;

    modalProductImage.src = product.thumbnail;
    modalProductImage.alt = product.title;

    modalProductTitle.textContent = product.title;
    modalProductCategory.textContent = product.category;
    modalProductDescription.textContent = product.description;
    modalProductRating.textContent = `Rating: ${Number(product.rating).toFixed(1)} / 5`;
    modalProductPrice.textContent = formatPrice(product.price);

    productModalOverlay.inert = false;
    productModalOverlay.setAttribute("aria-hidden", "false");
    productModalOverlay.classList.add("open");
    closeProductModal.focus();
}

// Close product details
function closeModal() {
    if (!productModalOverlay.classList.contains("open")) return;
    productModalOverlay.classList.remove("open");
    productModalOverlay.inert = true;
    productModalOverlay.setAttribute("aria-hidden", "true");
    currentModalProduct = null;
    if (lastModalFocus && lastModalFocus.isConnected) lastModalFocus.focus();
}

// Product buttons and retry functionality
productsContainer.addEventListener("click", function(event) {
    const button = event.target.closest("button");

    if (!button) return;

    if (button.id === "retryProducts") {
        getProducts();
        return;
    }

    const productId = Number(button.dataset.id);

    const product = allProducts.find(function(item) {
        return item.id === productId;
    });

    if (!product) return;

    if (button.classList.contains("add-to-cart")) {
        addToCart(product);

    } else if (button.classList.contains("view-details")) {
        openProductModal(product);
    }
});

closeProductModal.addEventListener("click", closeModal);

productModalOverlay.addEventListener("click", function(event) {
    if (event.target === productModalOverlay) {
        closeModal();
    }
});

modalAddToCart.addEventListener("click", function() {
    addToCart(currentModalProduct);
});

// STEP 27 - ESCAPE KEY FIX
document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        if (productModalOverlay.classList.contains("open")) {
            closeModal();
        } else {
            closeCartPanel();
        }
    }
});

// Start the store
createCategoryOptions();
updateCartCount();
getProducts();
