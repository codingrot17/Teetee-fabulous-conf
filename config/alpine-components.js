// Alpine.js Component Registry - Save as js/alpine-components.js

// Products Management Component
window.registerProductsComponent = function() {
    Alpine.data('productsManager', () => ({
        // State
        products: [],
        categories: [],
        filteredProducts: [],
        searchQuery: '',
        selectedCategory: '',
        selectedStatus: '',
        loading: false,
        
        // Modal state
        showAddProductModal: false,
        showEditProductModal: false,
        editingProduct: null,
        saving: false,
        
        // Form data
        productForm: {
            name: '',
            description: '',
            price: '',
            category: '',
            active: true,
            imageFiles: [],
            imagePreviews: [],
            existingImages: []
        },

        async init() {
            await this.loadData();
        },

        async loadData() {
            this.loading = true;
            try {
                if (!window.dbService) {
                    throw new Error('Appwrite services not loaded. Please refresh the page.');
                }
                
                const [productsResult, categoriesResult] = await Promise.all([
                    window.dbService.getProducts(),
                    window.dbService.getCategories()
                ]);
                
                this.products = productsResult.documents || [];
                this.categories = categoriesResult.documents || [];
                this.filteredProducts = [...this.products];
                
                console.log('Loaded products:', this.products.length);
                console.log('Loaded categories:', this.categories.length);
                
            } catch (error) {
                console.error('Error loading data:', error);
                this.showNotification('Failed to load data. Please check your Appwrite configuration and refresh the page.', 'error');
            } finally {
                this.loading = false;
            }
        },

        filterProducts() {
            let filtered = [...this.products];

            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase();
                filtered = filtered.filter(product => 
                    product.name.toLowerCase().includes(query) ||
                    product.description.toLowerCase().includes(query)
                );
            }

            if (this.selectedCategory) {
                filtered = filtered.filter(product => product.category === this.selectedCategory);
            }

            if (this.selectedStatus) {
                filtered = filtered.filter(product => product.status === this.selectedStatus);
            }

            this.filteredProducts = filtered;
        },

        getCategoryColor(category) {
            const categoryObj = this.categories.find(cat => cat.name.toLowerCase() === category.toLowerCase());
            if (categoryObj) return categoryObj.color;
            
            const colors = {
                premium: '#D4A574',
                vip: '#8B4A87',
                special: '#e74c3c'
            };
            return colors[category] || '#6b7280';
        },

        editProduct(product) {
            this.editingProduct = product;
            this.productForm = {
                name: product.name,
                description: product.description,
                price: product.price,
                category: product.category,
                active: product.status === 'active',
                imageFiles: [],
                imagePreviews: [],
                existingImages: product.images || []
            };
            this.showEditProductModal = true;
        },

        async saveProduct() {
            this.saving = true;
            try {
                if (!window.dbService) {
                    throw new Error('Database service not available');
                }

                if (this.showEditProductModal) {
                    await window.dbService.updateProduct(
                        this.editingProduct.$id,
                        {
                            name: this.productForm.name,
                            description: this.productForm.description,
                            price: this.productForm.price,
                            category: this.productForm.category,
                            status: this.productForm.active ? 'active' : 'inactive',
                            existingImages: this.productForm.existingImages
                        },
                        this.productForm.imageFiles
                    );
                } else {
                    await window.dbService.createProduct(
                        {
                            name: this.productForm.name,
                            description: this.productForm.description,
                            price: this.productForm.price,
                            category: this.productForm.category,
                            status: this.productForm.active ? 'active' : 'inactive'
                        },
                        this.productForm.imageFiles
                    );
                }

                this.closeModal();
                await this.loadData();
                this.showNotification('Product saved successfully!', 'success');
                
            } catch (error) {
                console.error('Save error:', error);
                this.showNotification('Failed to save product. Please try again.', 'error');
            } finally {
                this.saving = false;
            }
        },

        async toggleProductStatus(product) {
            try {
                if (!window.dbService) {
                    throw new Error('Database service not available');
                }
                
                const newStatus = product.status === 'active' ? 'inactive' : 'active';
                
                await window.dbService.updateProduct(product.$id, {
                    name: product.name,
                    description: product.description,
                    price: product.price,
                    category: product.category,
                    status: newStatus,
                    existingImages: product.images || []
                });
                
                product.status = newStatus;
                this.showNotification(`Product ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`, 'success');
                
            } catch (error) {
                console.error('Status toggle error:', error);
                this.showNotification('Failed to update product status.', 'error');
            }
        },

        async deleteProduct(product) {
            if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
                try {
                    if (!window.dbService) {
                        throw new Error('Database service not available');
                    }
                    
                    await window.dbService.deleteProduct(product.$id);
                    
                    const index = this.products.findIndex(p => p.$id === product.$id);
                    if (index !== -1) {
                        this.products.splice(index, 1);
                        this.filterProducts();
                    }
                    
                    this.showNotification('Product deleted successfully!', 'success');
                    
                } catch (error) {
                    console.error('Delete error:', error);
                    this.showNotification('Failed to delete product.', 'error');
                }
            }
        },

        closeModal() {
            this.showAddProductModal = false;
            this.showEditProductModal = false;
            this.editingProduct = null;
            this.productForm = {
                name: '',
                description: '',
                price: '',
                category: '',
                active: true,
                imageFiles: [],
                imagePreviews: [],
                existingImages: []
            };
        },

        handleImageUpload(event) {
            const files = Array.from(event.target.files);
            
            files.forEach(file => {
                this.productForm.imageFiles.push(file);
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.productForm.imagePreviews.push(e.target.result);
                };
                reader.readAsDataURL(file);
            });
        },

        removeNewImage(index) {
            this.productForm.imageFiles.splice(index, 1);
            this.productForm.imagePreviews.splice(index, 1);
        },

        async removeExistingImage(imageId, index) {
            try {
                if (!window.dbService) {
                    throw new Error('Database service not available');
                }
                
                await window.dbService.deleteImage(imageId);
                this.productForm.existingImages.splice(index, 1);
                this.showNotification('Image removed successfully!', 'success');
                
            } catch (error) {
                console.error('Image removal error:', error);
                this.showNotification('Failed to remove image.', 'error');
            }
        },

        getImageUrl(imageId) {
            if (!imageId) return 'https://via.placeholder.com/300x200/8B4A87/FFFFFF?text=No+Image';
            
            const { APPWRITE_CONFIG } = window;
            if (APPWRITE_CONFIG) {
                return `${APPWRITE_CONFIG.endpoint}/storage/buckets/${APPWRITE_CONFIG.bucketId}/files/${imageId}/view?project=${APPWRITE_CONFIG.projectId}`;
            }
            
            return 'https://via.placeholder.com/300x200/8B4A87/FFFFFF?text=Loading...';
        },

        showNotification(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.innerHTML = `
                <span>${message}</span>
                <button onclick='this.parentElement.remove()' style='margin-left: 12px; background: none; border: none; color: white; cursor: pointer;'>×</button>
            `;
            
            if (!document.querySelector('#toast-styles')) {
                const style = document.createElement('style');
                style.id = 'toast-styles';
                style.textContent = `
                    .toast {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        padding: 12px 20px;
                        border-radius: 8px;
                        color: white;
                        font-weight: 500;
                        z-index: 10000;
                        animation: slideIn 0.3s ease;
                    }
                    .toast-success { background: #22c55e; }
                    .toast-error { background: #ef4444; }
                    .toast-info { background: #3b82f6; }
                    @keyframes slideIn {
                        from { transform: translateX(400px); }
                        to { transform: translateX(0); }
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 5000);
        }
    }));
};

// Content Manager Component
window.registerContentComponent = function() {
    Alpine.data('contentManager', () => ({
        loading: true,
        saving: false,
        activeTab: 'hero',
        toast: { show: false, message: '', type: '' },

        content: {
            hero: {
                text1: 'Your Dream Cake Unfolds Before Your Eyes',
                text2: 'Order Amazing Cakes From The Best Price',
                text3: 'Enjoy Fast Free Delivery',
                text3_highlight: 'And Great Discounts!',
                cta_button: 'Book Now!',
                background_image: '../asset/images/hero2banner.png'
            },
            about: {
                title: 'About Us',
                subtitle: 'Who We Are',
                main_text: 'We are TEETEE FABULOUS',
                typing_text: 'CONFECTIONARY, CATERING, EVENT PLANNING...',
                mission_title: 'Our Mission',
                mission_text: 'TEETEE FABULOUS inspires and innovates...',
                vision_title: 'Our Vision',
                vision_text: 'To build a leading international company...',
                values_title: 'Our Values',
                values: [
                    'Entrepreneurship – We are proactive and seek opportunities',
                    'Respect – We respect one another and the planet',
                    'Passion – We are enthusiastic and strive for quality'
                ],
                cta_button: 'Contact Us'
            },
            skills: {
                title: 'Our Expertise',
                subtitle: 'What We Excel At',
                main_text: 'Our creative skills & experiences.',
                description: 'We combine traditional baking with innovation.',
                highlights: [
                    { icon: 'fas fa-award', text: '5+ Years Experience' },
                    { icon: 'fas fa-users', text: '500+ Happy Customers' }
                ],
                skills: [
                    { name: 'Creativity with Flavor', percentage: 95 },
                    { name: 'Advanced Baking Skills', percentage: 90 }
                ],
                cta_button: 'Get Custom Quote'
            },
            contact: {
                title: 'Contact Us',
                subtitle: 'Get in Touch',
                main_text: 'Ready to order your dream cake?',
                description: 'Have questions? We would love to hear from you!',
                contact_person: 'Adeniran Titilope Comfort',
                address: '68, Ebute Kekere Street, Off Afolabi Bus-Stop',
                email: 'adenirantitilope09@gmail.com',
                whatsapp: '+234 XXX XXX XXXX',
                business_hours: 'Mon-Sat: 8AM-8PM | Sun: 10AM-6PM',
                form_title: 'Send us a Message',
                services: ['Cake Order', 'Custom Design', 'Bulk Order']
            },
            footer: {
                company_name: 'TEETEE FABULOUS',
                tagline: 'Creating memorable moments with cakes.',
                quick_links: [
                    { name: 'Home', url: '#home' },
                    { name: 'About', url: '#about' }
                ],
                services_links: [
                    { name: 'Wedding Cakes', url: '#products' },
                    { name: 'Birthday Cakes', url: '#products' }
                ],
                social_links: [
                    { name: 'Facebook', icon: 'fab fa-facebook-f', url: '#' },
                    { name: 'Instagram', icon: 'fab fa-instagram', url: '#' }
                ],
                copyright: '© 2025 TEETEE FABULOUS'
            },
            navigation: {
                logo_text: 'TEETEE FABULOUS',
                menu_items: [
                    { name: 'Home', url: '#home' },
                    { name: 'About', url: '#about' },
                    { name: 'Contact', url: '#contact' }
                ]
            }
        },

        async init() {
            await this.loadContent();
        },

        async loadContent() {
            this.loading = true;
            try {
                if (!window.dbService) {
                    console.warn('Database service not available, using default content');
                    this.loading = false;
                    return;
                }
                
                const sections = ['hero', 'about', 'skills', 'contact', 'footer', 'navigation'];
                
                for (const section of sections) {
                    try {
                        const sectionContent = await window.dbService.getSiteContent(section);
                        if (sectionContent) {
                            this.content[section] = { ...this.content[section], ...sectionContent };
                        }
                    } catch (error) {
                        console.warn(`Failed to load ${section} content:`, error);
                    }
                }
            } catch (error) {
                console.error('Error loading content:', error);
                this.showNotification('Failed to load content', 'error');
            } finally {
                this.loading = false;
            }
        },

        setActiveTab(tab) { 
            this.activeTab = tab;
        },

        async saveContent() {
            this.saving = true;
            try {
                if (!window.dbService) {
                    throw new Error('Database service not available');
                }
                
                await window.dbService.updateSiteContent(this.activeTab, this.content[this.activeTab]);
                this.showNotification('Content saved successfully!', 'success');
            } catch (error) {
                console.error('Save error:', error);
                this.showNotification('Failed to save content.', 'error');
            } finally {
                this.saving = false;
            }
        },

        async saveAllContent() {
            this.saving = true;
            try {
                if (!window.dbService) {
                    throw new Error('Database service not available');
                }
                
                const sections = ['hero', 'about', 'skills', 'contact', 'footer', 'navigation'];
                
                for (const section of sections) {
                    await window.dbService.updateSiteContent(section, this.content[section]);
                }
                
                this.showNotification('All content saved successfully!', 'success');
            } catch (error) {
                console.error('Save all error:', error);
                this.showNotification('Failed to save content.', 'error');
            } finally {
                this.saving = false;
            }
        },

        async handleImageUpload(event) {
            const file = event.target.files[0];
            if (file) {
                try {
                    if (!window.dbService) {
                        throw new Error('Database service not available');
                    }
                    
                    this.showNotification('Uploading image...', 'info');
                    
                    const uploadResult = await window.dbService.uploadImage(file);
                    
                    this.content.hero.background_image = uploadResult.id;
                    this.content.hero.imagePreview = uploadResult.url;
                    
                    this.showNotification('Image uploaded successfully!', 'success');
                } catch (error) {
                    console.error('Image upload error:', error);
                    this.showNotification('Failed to upload image', 'error');
                }
            }
        },

        removeImage() {
            this.content.hero.background_image = '';
            this.content.hero.imagePreview = '';
        },

        // Dynamic list helpers
        addHighlight() { 
            this.content.skills.highlights.push({ icon: 'fas fa-star', text: '' });
        },
        removeHighlight(i) { 
            this.content.skills.highlights.splice(i, 1);
        },
        addSkill() { 
            this.content.skills.skills.push({ name: '', percentage: 50 });
        },
        removeSkill(i) { 
            this.content.skills.skills.splice(i, 1);
        },
        addMenuItem() { 
            this.content.navigation.menu_items.push({ name: '', url: '' });
        },
        removeMenuItem(i) { 
            this.content.navigation.menu_items.splice(i, 1);
        },
        addQuickLink() { 
            this.content.footer.quick_links.push({ name: '', url: '' });
        },
        removeQuickLink(i) { 
            this.content.footer.quick_links.splice(i, 1);
        },
        addServiceLink() { 
            this.content.footer.services_links.push({ name: '', url: '' });
        },
        removeServiceLink(i) { 
            this.content.footer.services_links.splice(i, 1);
        },
        addSocialLink() { 
            this.content.footer.social_links.push({ name: '', icon: '', url: '' });
        },
        removeSocialLink(i) { 
            this.content.footer.social_links.splice(i, 1);
        },

        showNotification(message, type) {
            this.toast.message = message;
            this.toast.type = type;
            this.toast.show = true;
            setTimeout(() => { this.toast.show = false }, 3000);
        }
    }));
};