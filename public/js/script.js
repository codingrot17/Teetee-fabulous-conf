$(document).ready(function(){
    
    // Navbar scroll effect
    $(window).scroll(function(){
        if(this.scrollY > 20){
            $('.navbar').addClass("sticky");
        } else {
            $('.navbar').removeClass("sticky");
        }
        
        // Scroll up button visibility
        if(this.scrollY > 500){
            $('.scroll-up-btn').addClass("show");
        } else {
            $('.scroll-up-btn').removeClass("show");
        }
    });

    // Smooth scroll to top
    $('.scroll-up-btn').click(function(){
        $('html, body').animate({scrollTop: 0}, 800);
    });

    // Mobile menu toggle
    $('.menu-btn').click(function(){
        $('.navbar .menu').toggleClass("active");
        $('.menu-btn i').toggleClass("active");
        
        // Prevent body scroll when menu is open
        if($('.navbar .menu').hasClass('active')) {
            $('body').css('overflow', 'hidden');
        } else {
            $('body').css('overflow', 'auto');
        }
    });

    // Close mobile menu when clicking on menu items
    $('.navbar .menu li a').click(function(){
        $('.navbar .menu').removeClass("active");
        $('.menu-btn i').removeClass("active");
        $('body').css('overflow', 'auto');
    });

    // Typing animation for about section
    var typed = new Typed(".typing", {
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

    // Smooth scrolling for navigation links
    $('.navbar .menu li a[href^="#"], .cta-btn[href^="#"], .view-all-btn[href^="#"], .read-more-btn[href^="#"], .contact-btn[href^="#"]').click(function(e) {
        e.preventDefault();
        
        var target = this.hash;
        var $target = $(target);
        
        if($target.length) {
            $('html, body').animate({
                'scrollTop': $target.offset().top - 70
            }, 800, 'swing');
        }
    });

    // Active navigation highlighting
    $(window).scroll(function() {
        var scrollDistance = $(window).scrollTop();
        
        $('section').each(function(i) {
            if ($(this).position().top <= scrollDistance + 100) {
                $('.navbar .menu li a.active').removeClass('active');
                $('.navbar .menu li a').eq(i).addClass('active');
            }
        });
    }).scroll();

    // Product filter functionality
    $('.filter-btn').click(function() {
        var filterValue = $(this).attr('data-filter');
        
        // Update active button
        $('.filter-btn').removeClass('active');
        $(this).addClass('active');
        
        // Filter products
        if (filterValue === 'all') {
            $('.product-card').removeClass('hide').addClass('show');
        } else {
            $('.product-card').each(function() {
                var productCategory = $(this).attr('data-category');
                if (productCategory === filterValue) {
                    $(this).removeClass('hide').addClass('show');
                } else {
                    $(this).removeClass('show').addClass('hide');
                }
            });
        }
    });

    // Product card interactions
    $('.quick-view-btn').click(function(e) {
        e.preventDefault();
        var productId = $(this).attr('data-product');
        showProductModal(productId);
    });

    $('.add-to-cart-btn').click(function(e) {
        e.preventDefault();
        var productId = $(this).attr('data-product');
        addToCart(productId);
        showNotification('Product added to cart!', 'success');
    });

    $('.buy-now-btn').click(function(e) {
        e.preventDefault();
        var productId = $(this).attr('data-product');
        initiateOrder(productId);
    });

    // Contact form submission
    $('.contact-form').submit(function(e) {
        e.preventDefault();
        
        // Get form data
        var formData = {
            name: $('input[type="text"]').val(),
            email: $('input[type="email"]').val(),
            phone: $('input[type="tel"]').val(),
            service: $('select').val(),
            message: $('textarea').val()
        };
        
        // Validate form
        if (validateContactForm(formData)) {
            // Show loading state
            var $submitBtn = $('.form-button button');
            var originalText = $submitBtn.html();
            $submitBtn.html('<i class="fas fa-spinner fa-spin"></i> Sending...');
            $submitBtn.prop('disabled', true);
            
            // Simulate form submission (replace with actual form handler)
            setTimeout(function() {
                $submitBtn.html('<i class="fas fa-check"></i> Message Sent!');
                showNotification('Thank you! Your message has been sent successfully.', 'success');
                
                // Reset form
                $('.contact-form')[0].reset();
                
                setTimeout(function() {
                    $submitBtn.html(originalText);
                    $submitBtn.prop('disabled', false);
                }, 2000);
            }, 2000);
        }
    });

    // Animate skill bars when in view
    $(window).scroll(function() {
        var skillsTop = $('.skills').offset().top;
        var skillsBottom = skillsTop + $('.skills').outerHeight();
        var scrollTop = $(window).scrollTop();
        var windowHeight = $(window).height();
        
        if (scrollTop + windowHeight > skillsTop + 100 && scrollTop < skillsBottom) {
            $('.skills .line').each(function() {
                if (!$(this).hasClass('animated')) {
                    $(this).addClass('animated');
                    $(this).find('::before').css('animation-play-state', 'running');
                }
            });
        }
    });

    // Initialize AOS (Animate On Scroll) effects
    function initScrollAnimations() {
        $('.product-card, .about .column, .skills .column').each(function() {
            var $element = $(this);
            var elementTop = $element.offset().top;
            var elementBottom = elementTop + $element.outerHeight();
            var viewportTop = $(window).scrollTop();
            var viewportBottom = viewportTop + $(window).height();
            
            if (elementBottom > viewportTop && elementTop < viewportBottom) {
                $element.addClass('animate-in');
            }
        });
    }

    $(window).scroll(initScrollAnimations);
    initScrollAnimations(); // Run on page load

    // Lazy loading for images
    function lazyLoadImages() {
        $('img[data-src]').each(function() {
            var $img = $(this);
            var imgTop = $img.offset().top;
            var scrollTop = $(window).scrollTop();
            var windowHeight = $(window).height();
            
            if (imgTop < scrollTop + windowHeight + 200) {
                $img.attr('src', $img.attr('data-src'));
                $img.removeAttr('data-src');
            }
        });
    }

    $(window).scroll(lazyLoadImages);
    lazyLoadImages(); // Run on page load

    // Show loading overlay on page load
    $(window).on('load', function() {
        $('.loading-overlay').fadeOut(500);
    });

    // Product search functionality (if search input exists)
    $('#product-search').on('input', function() {
        var searchTerm = $(this).val().toLowerCase();
        
        $('.product-card').each(function() {
            var productTitle = $(this).find('.product-title').text().toLowerCase();
            var productDescription = $(this).find('.product-description').text().toLowerCase();
            
            if (productTitle.includes(searchTerm) || productDescription.includes(searchTerm)) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    });

    // Newsletter subscription (if newsletter form exists)
    $('#newsletter-form').submit(function(e) {
        e.preventDefault();
        var email = $('#newsletter-email').val();
        
        if (validateEmail(email)) {
            showNotification('Thank you for subscribing to our newsletter!', 'success');
            $('#newsletter-email').val('');
        } else {
            showNotification('Please enter a valid email address.', 'error');
        }
    });

});

// Utility Functions

// Show product modal
function showProductModal(productId) {
    // This would typically fetch product data and show a modal
    console.log('Showing modal for product:', productId);
    showNotification('Product details coming soon!', 'info');
}

// Add product to cart
function addToCart(productId) {
    // This would typically add the product to a cart system
    console.log('Adding to cart:', productId);
    
    // Update cart counter if exists
    var currentCount = parseInt($('.cart-counter').text()) || 0;
    $('.cart-counter').text(currentCount + 1).show();
}

// Initiate order process
function initiateOrder(productId) {
    // This would typically redirect to order form or open order modal
    console.log('Initiating order for:', productId);
    
    // For now, scroll to contact form
    $('html, body').animate({
        scrollTop: $('#contact').offset().top - 70
    }, 800);
    
    // Pre-fill the service selection
    $('#contact select').val('cake-order');
    
    showNotification('Please fill out the contact form to place your order.', 'info');
}

// Form validation
function validateContactForm(formData) {
    var errors = [];
    
    if (!formData.name.trim()) {
        errors.push('Name is required');
    }
    
    if (!validateEmail(formData.email)) {
        errors.push('Valid email is required');
    }
    
    if (!formData.phone.trim()) {
        errors.push('Phone number is required');
    }
    
    if (!formData.service) {
        errors.push('Please select a service');
    }
    
    if (!formData.message.trim()) {
        errors.push('Message is required');
    }
    
    if (errors.length > 0) {
        showNotification(errors.join('<br>'), 'error');
        return false;
    }
    
    return true;
}

// Email validation
function validateEmail(email) {
    var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Show notification
function showNotification(message, type) {
    // Remove existing notifications
    $('.notification').remove();
    
    var notificationClass = 'notification notification-' + type;
    var iconClass = type === 'success' ? 'fa-check-circle' : 
                   type === 'error' ? 'fa-exclamation-circle' : 
                   'fa-info-circle';
    
    var notification = $('<div class="' + notificationClass + '">' +
        '<i class="fas ' + iconClass + '"></i>' +
        '<span>' + message + '</span>' +
        '<button class="notification-close"><i class="fas fa-times"></i></button>' +
        '</div>');
    
    $('body').append(notification);
    
    // Show notification
    setTimeout(function() {
        notification.addClass('show');
    }, 100);
    
    // Auto hide after 5 seconds
    setTimeout(function() {
        hideNotification(notification);
    }, 5000);
    
    // Close button functionality
    notification.find('.notification-close').click(function() {
        hideNotification(notification);
    });
}

// Hide notification
function hideNotification(notification) {
    notification.removeClass('show');
    setTimeout(function() {
        notification.remove();
    }, 300);
}

// Preloader
$(window).on('load', function() {
    $('#preloader').fadeOut('slow');
});

// Back to top button smooth scroll
$('.scroll-up-btn').click(function() {
    $('html, body').animate({scrollTop: 0}, 1000);
    return false;
});

// Initialize everything when document is ready
$(document).ready(function() {
    // Set initial product filter to show all
    $('.product-card').addClass('show');
    
    // Add CSS for notifications if not already present
    if (!$('#notification-styles').length) {
        $('<style id="notification-styles">' +
            '.notification {' +
                'position: fixed;' +
                'top: 20px;' +
                'right: 20px;' +
                'min-width: 300px;' +
                'padding: 15px 20px;' +
                'border-radius: 8px;' +
                'color: #fff;' +
                'z-index: 10000;' +
                'display: flex;' +
                'align-items: center;' +
                'gap: 10px;' +
                'transform: translateX(400px);' +
                'transition: transform 0.3s ease;' +
                'box-shadow: 0 4px 15px rgba(0,0,0,0.2);' +
            '}' +
            '.notification.show {' +
                'transform: translateX(0);' +
            '}' +
            '.notification-success {' +
                'background: linear-gradient(135deg, #27ae60, #2ecc71);' +
            '}' +
            '.notification-error {' +
                'background: linear-gradient(135deg, #e74c3c, #c0392b);' +
            '}' +
            '.notification-info {' +
                'background: linear-gradient(135deg, #3498db, #2980b9);' +
            '}' +
            '.notification-close {' +
                'background: none;' +
                'border: none;' +
                'color: #fff;' +
                'cursor: pointer;' +
                'margin-left: auto;' +
                'padding: 5px;' +
            '}' +
            '@media (max-width: 768px) {' +
                '.notification {' +
                    'right: 10px;' +
                    'left: 10px;' +
                    'min-width: auto;' +
                    'transform: translateY(-100px);' +
                '}' +
                '.notification.show {' +
                    'transform: translateY(0);' +
                '}' +
            '}' +
        '</style>').appendTo('head');
    }
    
    console.log('TEETEE FABULOUS website initialized successfully!');
});