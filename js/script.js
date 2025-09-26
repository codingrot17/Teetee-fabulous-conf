// ===== CART MANAGEMENT (In-Memory Only) =====
function initializeCart() {
    updateCartCounter();
    updateCartDisplay();
    
    // Cart icon click
    $('#cartLink').click(function(e) {
        e.preventDefault();
        toggleCart();
    });
    
    // Close cart
    $('#cartCloseBtn, #cartOverlay').click(function() {
        closeCart();
    });
    
    // Checkout button
    $('#checkoutBtn').click(function() {
        checkout();
    });
    
    // Cart item controls (delegated events)
    $('#cartItemsList').on('click', '.quantity-btn', function() {
        const productId = $(this).data('product');
        const action = $(this).data('action');
        updateQuantity(productId, action);
    });
    
    $('#cartItemsList').on('click', '.remove-item-btn', function() {
        const productId = $(this).data('product');
        removeFromCart(productId);
    });
}

function toggleCart() {
    $('#cartSidebar').toggleClass('active');
    $('#cartOverlay').toggleClass('active');
    
    if ($('#cartSidebar').hasClass('active')) {
        $('body').css('overflow', 'hidden');
    } else {
        $('body').css('overflow', 'auto');
    }
}

function closeCart() {
    $('#cartSidebar').removeClass('active');
    $('#cartOverlay').removeClass('active');
    $('body').css('overflow', 'auto');
}

function addToCart(productId) {
    const product = AppState.products.find(p => (p.$id || p.id) === productId);
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }

    const existingItem = AppState.cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
        showNotification(`Increased ${product.name} quantity to ${existingItem.quantity}`, 'success');
    } else {
        AppState.cart.push({
            id: productId,
            name: product.name,
            price: product.price,
            image: product.imageUrls?.[0] || 'https://via.placeholder.com/80x80',
            category: product.category,
            quantity: 1
        });
        showNotification(`${product.name} added to cart!`, 'success');
    }
    
    updateCartCounter();
    updateCartDisplay();
}

function removeFromCart(productId) {
    const item = AppState.cart.find(item => item.id === productId);
    const itemName = item ? item.name : 'Item';
    
    AppState.cart = AppState.cart.filter(item => item.id !== productId);
    
    updateCartCounter();
    updateCartDisplay();
    showNotification(`${itemName} removed from cart`, 'info');
}

function updateQuantity(productId, action) {
    const item = AppState.cart.find(item => item.id === productId);
    
    if (!item) return;
    
    if (action === 'increase') {
        item.quantity += 1;
    } else if (action === 'decrease') {
        item.quantity -= 1;
        if (item.quantity <= 0) {
            removeFromCart(productId);
            return;
        }
    }
    
    updateCartCounter();
    updateCartDisplay();
}

function updateCartCounter() {
    const totalItems = AppState.cart.reduce((sum, item) => sum + item.quantity, 0);
    const counter = $('#cartCounter');
    
    if (totalItems > 0) {
        counter.text(totalItems).show();
    } else {
        counter.hide();
    }
}

function updateCartDisplay() {
    const cartItemsList = $('#cartItemsList');
    const cartFooter = $('#cartFooter');
    
    if (AppState.cart.length === 0) {
        cartItemsList.html(`
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <h4>Your cart is empty</h4>
                <p>Add some delicious cakes to get started!</p>
            </div>
        `);
        cartFooter.hide();
        return;
    }
    
    cartFooter.show();
    
    let cartHTML = '';
    AppState.cart.forEach(item => {
        const price = window.productService ? 
            window.productService.formatPrice(item.price) : 
            `₦${item.price.toLocaleString()}`;
        
        const itemTotal = window.productService ? 
            window.productService.formatPrice(item.price * item.quantity) : 
            `₦${(item.price * item.quantity).toLocaleString()}`;
        
        cartHTML += `
            <div class="cart-item" data-product-id="${item.id}">
                <div class="cart-item-image">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-category">${item.category}</div>
                    <div class="cart-item-price">${price} × ${item.quantity}</div>
                    <div class="cart-item-controls">
                        <button class="quantity-btn" data-product="${item.id}" data-action="decrease">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="quantity-display">${item.quantity}</span>
                        <button class="quantity-btn" data-product="${item.id}" data-action="increase">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="remove-item-btn" data-product="${item.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    cartItemsList.html(cartHTML);
    
    // Update totals
    const total = getCartTotal();
    const formattedTotal = window.productService ? 
        window.productService.formatPrice(total) : 
        `₦${total.toLocaleString()}`;
    
    $('#cartSubtotal').text(formattedTotal);
    $('#cartTotal').text(formattedTotal);
}

function getCartTotal() {
    return AppState.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function checkout() {
    if (AppState.cart.length === 0) {
        showNotification('Your cart is empty', 'error');
        return;
    }
    
    closeCart();
    
    // Scroll to contact form
    $('html, body').animate({
        scrollTop: $('#contact').offset().top - 80
    }, 1000, 'swing');
    
    setTimeout(() => {
        const total = getCartTotal();
        const formattedTotal = window.productService ? 
            window.productService.formatPrice(total) : 
            `₦${total.toLocaleString()}`;
        
        let orderDetails = 'I would like to order the following items:\n\n';
        AppState.cart.forEach((item, index) => {
            const itemPrice = window.productService ? 
                window.productService.formatPrice(item.price) : 
                `₦${item.price.toLocaleString()}`;
            orderDetails += `${index + 1}. ${item.name} - ${itemPrice} × ${item.quantity}\n`;
        });
        orderDetails += `\nTotal: ${formattedTotal}\n\nPlease contact me to complete this order.`;
        
        $('#contactService').val('cake-order');
        $('#contactMessage').val(orderDetails);
        
        showNotification('Please fill out the contact form to complete your order.', 'info');
    }, 1200);
}

function initiateOrder(productId) {
    const product = AppState.products.find(p => (p.$id || p.id) === productId);
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }

    addToCart(productId);
    
    $('html, body').animate({
        scrollTop: $('#contact').offset().top - 80
    }, 1000, 'swing');
    
    setTimeout(() => {
        const price = window.productService ? 
            window.productService.formatPrice(product.price) : 
            `₦${product.price.toLocaleString()}`;
            
        $('#contactService').val('cake-order');
        $('#contactMessage').val(
            `I would like to order: ${product.name} - ${price}\n\nPlease contact me with more details.`
        );
        showNotification('Please fill out the contact form to complete your order.', 'info');
    }, 1200);
}/* Enhanced TEETEE FABULOUS JavaScript */

// ===== STATE MANAGEMENT (No localStorage - using in-memory storage) =====
const AppState = {
    products: [],
    filteredProducts: [],
    categories: [],
    cart: [],
    currentFilter: 'all',
    searchQuery: '',
    currentProduct: null,
    countersAnimated: false,
    skillsAnimated: false
};

// ===== INITIALIZE ON DOM READY =====
$(document).ready(function() {
    initializeApp();
});

// ===== MAIN INITIALIZATION =====
function initializeApp() {
    initializePreloader();
    initializeNavigation();
    initializeScrollEffects();
    initializeHero();
    initializeProducts();
    initializeAnimations();
    initializeContactForm();
    initializeNewsletter();
    initializeModal();
    initializeCart();
    
    console.log('✅ TEETEE FABULOUS initialized successfully!');
}

// ===== PRELOADER =====
function initializePreloader() {
    $(window).on('load', function() {
        setTimeout(() => {
            $('#preloader').addClass('fade-out');
            setTimeout(() => {
                $('#preloader').remove();
            }, 500);
        }, 1000);
    });
    
    // Fallback
    setTimeout(() => {
        $('#preloader').addClass('fade-out');
    }, 5000);
}

// ===== NAVIGATION =====
function initializeNavigation() {
    // Mobile menu toggle - FIXED
    $('#menuBtn').click(function() {
        const menu = $('#navMenu');
        const icon = $(this).find('i');
        
        menu.toggleClass('active');
        
        // Toggle between bars and times icon
        if (menu.hasClass('active')) {
            icon.removeClass('fa-bars').addClass('fa-times active');
            $('body').css('overflow', 'hidden');
        } else {
            icon.removeClass('fa-times active').addClass('fa-bars');
            $('body').css('overflow', 'auto');
        }
    });

    // Close menu on link click
    $('.menu-link').click(function() {
        $('#navMenu').removeClass('active');
        $('#menuBtn i').removeClass('fa-times active').addClass('fa-bars');
        $('body').css('overflow', 'auto');
    });

    // Smooth scrolling
    $('a[href^="#"]').on('click', function(e) {
        const href = $(this).attr('href');
        if (href === '#') return;
        
        e.preventDefault();
        const target = $(href);
        
        if (target.length) {
            $('html, body').animate({
                scrollTop: target.offset().top - 80
            }, 800, 'swing');
        }
    });
}

// ===== SCROLL EFFECTS =====
function initializeScrollEffects() {
    const navbar = $('#navbar');
    const scrollUpBtn = $('#scrollUpBtn');
    
    $(window).scroll(function() {
        const scrollY = $(this).scrollTop();
        
        // Sticky navbar
        if (scrollY > 20) {
            navbar.addClass('sticky');
        } else {
            navbar.removeClass('sticky');
        }
        
        // Scroll up button
        if (scrollY > 500) {
            scrollUpBtn.addClass('show');
        } else {
            scrollUpBtn.removeClass('show');
        }
        
        // Update active nav
        updateActiveNav();
        
        // Animate elements
        animateOnScroll();
        
        // Animate counters
        if (!AppState.countersAnimated && isInViewport($('.stats-row'))) {
            animateCounters();
            AppState.countersAnimated = true;
        }
        
        // Animate skill bars
        if (!AppState.skillsAnimated && isInViewport($('.skills'))) {
            animateSkillBars();
            AppState.skillsAnimated = true;
        }
    });

    // Scroll to top - FIXED smooth scroll
    scrollUpBtn.click(function() {
        $('html, body').animate({ 
            scrollTop: 0 
        }, 1000, 'swing');
        return false;
    });
}

function updateActiveNav() {
    const scrollPos = $(window).scrollTop() + 100;
    
    $('section[id]').each(function() {
        const section = $(this);
        const sectionTop = section.offset().top;
        const sectionBottom = sectionTop + section.outerHeight();
        const sectionId = section.attr('id');
        
        if (scrollPos >= sectionTop && scrollPos < sectionBottom) {
            $('.menu-link').removeClass('active');
            $(`.menu-link[href="#${sectionId}"]`).addClass('active');
        }
    });
}

// ===== HERO SECTION =====
function initializeHero() {
    if (typeof Typed !== 'undefined') {
        new Typed(".typing", {
            strings: [
                "CONFECTIONARY INT'L", 
                "CATERING SERVICES", 
                "EVENT PLANNING", 
                "CUSTOM CAKE DESIGNS",
                "PREMIUM BAKERY"
            ],
            typeSpeed: 100,
            backSpeed: 60,
            backDelay: 1500,
            loop: true
        });
    }

    // Parallax effect
    $(window).scroll(function() {
        const scrolled = $(window).scrollTop();
        $('.home').css('background-position', `center ${scrolled * 0.5}px`);
    });
}

// ===== PRODUCTS =====
function initializeProducts() {
    // Search functionality
    let searchTimeout;
    $('#productSearch').on('input', function() {
        clearTimeout(searchTimeout);
        AppState.searchQuery = $(this).val().toLowerCase().trim();
        
        if (AppState.searchQuery) {
            $('#searchClear').addClass('show');
        } else {
            $('#searchClear').removeClass('show');
        }
        
        searchTimeout = setTimeout(() => {
            filterProducts();
        }, 300);
    });

    // Clear search
    $('#searchClear').click(function() {
        $('#productSearch').val('');
        AppState.searchQuery = '';
        $(this).removeClass('show');
        filterProducts();
    });

    // Filter buttons
    $(document).on('click', '.filter-btn', function() {
        AppState.currentFilter = $(this).data('filter');
        $('.filter-btn').removeClass('active');
        $(this).addClass('active');
        filterProducts();
    });

    // Clear filters
    $('#clearFilters').click(function() {
        $('#productSearch').val('');
        $('#searchClear').removeClass('show');
        AppState.searchQuery = '';
        AppState.currentFilter = 'all';
        $('.filter-btn').removeClass('active');
        $('.filter-btn[data-filter="all"]').addClass('active');
        filterProducts();
    });

    // Product card actions
    $(document).on('click', '.quick-view-btn', function(e) {
        e.preventDefault();
        const productId = $(this).data('product');
        showProductModal(productId);
    });

    $(document).on('click', '.add-to-cart-btn', function(e) {
        e.preventDefault();
        const productId = $(this).data('product');
        addToCart(productId);
    });

    $(document).on('click', '.buy-now-btn', function(e) {
        e.preventDefault();
        const productId = $(this).data('product');
        initiateOrder(productId);
    });
}

// Load products from Appwrite
async function loadDynamicProducts() {
    try {
        showProductsLoading(true);
        
        if (!window.productService) {
            throw new Error('Product service not available');
        }

        const [productsResult, categoriesResult] = await Promise.all([
            window.productService.getProducts(),
            window.productService.getCategories()
        ]);

        AppState.products = productsResult.documents || [];
        AppState.categories = categoriesResult.documents || [];
        AppState.filteredProducts = [...AppState.products];

        updateCategoryFilters();
        renderProducts();
        
        showNotification(`Loaded ${AppState.products.length} products!`, 'success');
        
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Failed to load products. Showing samples.', 'error');
        loadSampleProducts();
    } finally {
        showProductsLoading(false);
    }
}

// Make available globally
window.loadDynamicProducts = loadDynamicProducts;

// Update category filters
function updateCategoryFilters() {
    const container = $('#categoryFilters');
    container.find('.filter-btn:not([data-filter="all"])').remove();
    
    AppState.categories.forEach(category => {
        const btn = $(`
            <button class="filter-btn" data-filter="${category.name.toLowerCase()}">
                ${category.name}
            </button>
        `);
        container.append(btn);
    });
}

// Filter products
function filterProducts() {
    AppState.filteredProducts = AppState.products.filter(product => {
        const matchesSearch = !AppState.searchQuery || 
            product.name.toLowerCase().includes(AppState.searchQuery) ||
            product.description.toLowerCase().includes(AppState.searchQuery) ||
            product.category.toLowerCase().includes(AppState.searchQuery);

        const matchesCategory = AppState.currentFilter === 'all' || 
            product.category.toLowerCase() === AppState.currentFilter;

        return matchesSearch && matchesCategory;
    });

    renderProducts();
}

// Render products
function renderProducts() {
    const grid = $('#productsGrid');
    const noResults = $('#noResults');
    
    grid.find('.products-loading').remove();
    grid.find('.product-card').remove();
    
    if (AppState.filteredProducts.length === 0) {
        grid.hide();
        noResults.addClass('show');
        return;
    }
    
    noResults.removeClass('show');
    grid.show();
    
    AppState.filteredProducts.forEach((product, index) => {
        const card = createProductCard(product);
        grid.append(card);
        
        setTimeout(() => {
            card.addClass('show');
        }, index * 50);
    });
}

// Create product card
function createProductCard(product) {
    const imageUrl = product.imageUrls?.[0] || 
        'https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=No+Image';
    
    const price = window.productService ? 
        window.productService.formatPrice(product.price) : 
        `₦${product.price?.toLocaleString() || '0'}`;
    
    const categoryColor = getCategoryColor(product.category);
    const productId = product.$id || product.id;
    
    return $(`
        <div class="product-card" data-category="${product.category.toLowerCase()}" data-product-id="${productId}">
            <div class="product-image">
                <img src="${imageUrl}" alt="${product.name}" loading="lazy">
                <div class="product-overlay">
                    <div class="overlay-buttons">
                        <button class="quick-view-btn" data-product="${productId}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="add-to-cart-btn" data-product="${productId}">
                            <i class="fas fa-shopping-cart"></i>
                        </button>
                    </div>
                </div>
                <div class="product-badge" style="background: ${categoryColor}">${product.category}</div>
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-description">${truncateText(product.description, 100)}</p>
                <div class="product-price">${price}</div>
                <button class="buy-now-btn" data-product="${productId}">
                    <i class="fas fa-shopping-cart"></i>
                    Order Now
                </button>
            </div>
        </div>
    `);
}

function getCategoryColor(category) {
    const colors = {
        premium: 'linear-gradient(135deg, #D4A574, #f39c12)',
        vip: 'linear-gradient(135deg, #8B4A87, #c44569)',
        special: 'linear-gradient(135deg, #e74c3c, #c0392b)'
    };
    return colors[category.toLowerCase()] || 'linear-gradient(135deg, #6b7280, #9ca3af)';
}

function showProductsLoading(show) {
    if (show) {
        $('#productsLoading').show();
    } else {
        $('#productsLoading').hide();
    }
}

function loadSampleProducts() {
    AppState.products = [
        {
            id: 'sample1',
            name: 'Premium Vanilla Cake',
            description: 'Rich vanilla sponge with premium cream frosting and delicate decorations',
            price: 15000,
            category: 'Premium',
            imageUrls: ['https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=Vanilla+Cake']
        },
        {
            id: 'sample2',
            name: 'VIP Chocolate Supreme',
            description: 'Luxurious chocolate masterpiece with gold accents and premium ingredients',
            price: 28000,
            category: 'VIP',
            imageUrls: ['https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=Chocolate+Cake']
        },
        {
            id: 'sample3',
            name: 'Special Red Velvet',
            description: 'Artisan red velvet with unique decorations and cream cheese frosting',
            price: 22000,
            category: 'Special',
            imageUrls: ['https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=Red+Velvet']
        }
    ];
    
    AppState.filteredProducts = [...AppState.products];
    renderProducts();
}

// ===== MODAL =====
function initializeModal() {
    $('#modalClose').click(closeModal);
    
    $('#productModal').click(function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
    
    $(document).keydown(function(e) {
        if (e.key === 'Escape' && $('#productModal').hasClass('show')) {
            closeModal();
        }
    });
    
    $('#modalOrderBtn').click(function() {
        if (AppState.currentProduct) {
            initiateOrder(AppState.currentProduct.$id || AppState.currentProduct.id);
            closeModal();
        }
    });
    
    $('#modalAddCartBtn').click(function() {
        if (AppState.currentProduct) {
            addToCart(AppState.currentProduct.$id || AppState.currentProduct.id);
        }
    });
}

function showProductModal(productId) {
    const product = AppState.products.find(p => (p.$id || p.id) === productId);
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }

    AppState.currentProduct = product;
    
    const imageUrl = product.imageUrls?.[0] || 'https://via.placeholder.com/600x400';
    const price = window.productService ? 
        window.productService.formatPrice(product.price) : 
        `₦${product.price.toLocaleString()}`;
    
    $('#modalTitle').text(product.name);
    $('#modalImage').attr('src', imageUrl);
    $('#modalCategory').text(product.category).css('background', getCategoryColor(product.category));
    $('#modalPrice').text(price);
    $('#modalDescription').text(product.description);
    
    $('#productModal').addClass('show');
    $('body').css('overflow', 'hidden');
}

function closeModal() {
    $('#productModal').removeClass('show');
    $('body').css('overflow', 'auto');
    AppState.currentProduct = null;
}

// ===== CART MANAGEMENT (In-Memory Only) =====
function initializeCart() {
    updateCartCounter();
}

function addToCart(productId) {
    const product = AppState.products.find(p => (p.$id || p.id) === productId);
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }

    const existingItem = AppState.cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
        showNotification(`Increased ${product.name} quantity to ${existingItem.quantity}`, 'success');
    } else {
        AppState.cart.push({
            id: productId,
            name: product.name,
            price: product.price,
            image: product.imageUrls?.[0],
            category: product.category,
            quantity: 1
        });
        showNotification(`${product.name} added to cart!`, 'success');
    }
    
    updateCartCounter();
}

function removeFromCart(productId) {
    AppState.cart = AppState.cart.filter(item => item.id !== productId);
    updateCartCounter();
}

function updateCartCounter() {
    const totalItems = AppState.cart.reduce((sum, item) => sum + item.quantity, 0);
    const counter = $('#cartCounter');
    
    if (totalItems > 0) {
        counter.text(totalItems).show();
    } else {
        counter.hide();
    }
}

function getCartTotal() {
    return AppState.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function initiateOrder(productId) {
    const product = AppState.products.find(p => (p.$id || p.id) === productId);
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }

    addToCart(productId);
    
    $('html, body').animate({
        scrollTop: $('#contact').offset().top - 80
    }, 1000, 'swing');
    
    setTimeout(() => {
        const price = window.productService ? 
            window.productService.formatPrice(product.price) : 
            `₦${product.price.toLocaleString()}`;
            
        $('#contactService').val('cake-order');
        $('#contactMessage').val(
            `I would like to order: ${product.name} - ${price}\n\nPlease contact me with more details.`
        );
        showNotification('Please fill out the contact form to complete your order.', 'info');
    }, 1200);
}

// ===== CONTACT FORM =====
function initializeContactForm() {
    $('#contactForm').submit(function(e) {
        e.preventDefault();
        
        const formData = {
            name: $('#contactName').val().trim(),
            email: $('#contactEmail').val().trim(),
            phone: $('#contactPhone').val().trim(),
            service: $('#contactService').val(),
            message: $('#contactMessage').val().trim()
        };
        
        if (validateContactForm(formData)) {
            submitContactForm(formData);
        }
    });
}

function validateContactForm(data) {
    const errors = [];
    
    if (!data.name || data.name.length < 2) {
        errors.push('Please enter a valid name');
    }
    if (!validateEmail(data.email)) {
        errors.push('Please enter a valid email address');
    }
    if (!data.phone || data.phone.length < 10) {
        errors.push('Please enter a valid phone number');
    }
    if (!data.service) {
        errors.push('Please select a service');
    }
    if (!data.message || data.message.length < 10) {
        errors.push('Please enter a message (minimum 10 characters)');
    }
    
    if (errors.length > 0) {
        showNotification(errors.join('<br>'), 'error');
        return false;
    }
    
    return true;
}

function submitContactForm(data) {
    const submitBtn = $('#submitBtn');
    const originalHtml = submitBtn.html();
    
    submitBtn.html('<i class="fas fa-spinner fa-spin"></i> Sending...').prop('disabled', true);
    
    // Simulate form submission
    setTimeout(() => {
        submitBtn.html('<i class="fas fa-check"></i> Message Sent!');
        showNotification('Thank you! Your message has been sent successfully. We\'ll get back to you soon!', 'success');
        
        $('#contactForm')[0].reset();
        
        setTimeout(() => {
            submitBtn.html(originalHtml).prop('disabled', false);
        }, 2000);
    }, 2000);
}

// ===== NEWSLETTER =====
function initializeNewsletter() {
    $('#newsletterForm').submit(function(e) {
        e.preventDefault();
        
        const email = $('#newsletterEmail').val().trim();
        
        if (validateEmail(email)) {
            submitNewsletter(email);
        } else {
            showNotification('Please enter a valid email address.', 'error');
        }
    });
}

function submitNewsletter(email) {
    const form = $('#newsletterForm');
    const button = form.find('button');
    const originalHtml = button.html();
    
    button.html('<i class="fas fa-spinner fa-spin"></i>').prop('disabled', true);
    
    setTimeout(() => {
        showNotification('Thank you for subscribing to our newsletter!', 'success');
        $('#newsletterEmail').val('');
        button.html(originalHtml).prop('disabled', false);
    }, 1500);
}

// ===== ANIMATIONS =====
function initializeAnimations() {
    animateOnScroll();
}

function animateOnScroll() {
    $('.product-card, .stat-item, .highlight-item, .info-row').each(function() {
        if (isInViewport($(this))) {
            $(this).addClass('fade-in-up');
        }
    });
}

function isInViewport($element) {
    if (!$element.length) return false;
    
    const elementTop = $element.offset().top;
    const elementBottom = elementTop + $element.outerHeight();
    const viewportTop = $(window).scrollTop();
    const viewportBottom = viewportTop + $(window).height();
    
    return elementBottom > viewportTop && elementTop < viewportBottom - 100;
}

// ===== COUNTER ANIMATION =====
function animateCounters() {
    $('.stat-number').each(function() {
        const $counter = $(this);
        const target = parseInt($counter.attr('data-count'));
        const duration = 2000;
        const steps = 60;
        const increment = target / steps;
        const stepTime = duration / steps;
        let current = 0;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            $counter.text(Math.floor(current));
        }, stepTime);
    });
}

// ===== SKILL BARS ANIMATION =====
function animateSkillBars() {
    $('.skills .line').each(function() {
        const $line = $(this);
        const progress = $line.data('progress');
        $line.css('--progress-width', progress + '%');
        $line.addClass('animated');
    });
}

// ===== NOTIFICATION SYSTEM =====
function showNotification(message, type = 'info') {
    $('.notification').remove();
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    
    const notification = $(`
        <div class="notification notification-${type}">
            <i class="fas ${icons[type]}"></i>
            <span>${message}</span>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `);
    
    $('body').append(notification);
    
    setTimeout(() => notification.addClass('show'), 100);
    
    const autoHideTimer = setTimeout(() => {
        hideNotification(notification);
    }, 5000);
    
    notification.find('.notification-close').click(function() {
        clearTimeout(autoHideTimer);
        hideNotification(notification);
    });
}

function hideNotification($notification) {
    $notification.removeClass('show');
    setTimeout(() => $notification.remove(), 400);
}

// ===== UTILITY FUNCTIONS =====
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// ===== ERROR HANDLING =====
window.addEventListener('error', function(e) {
    console.error('JavaScript Error:', e.error);
    showNotification('Something went wrong. Please refresh if issues persist.', 'error');
});

// ===== EXPORT FUNCTIONS =====
window.showNotification = showNotification;
window.closeModal = closeModal;
window.addToCart = addToCart;

console.log('🎂 Enhanced TEETEE FABULOUS loaded successfully!');