function adminDashboard() {
    return {
        currentUser: null,
        authError: false,
        sidebarOpen: window.innerWidth > 768,
        activeSection: 'dashboard',
        loading: true,
        serviceError: false,
        serviceErrorMessage: '',
        dynamicContent: '',
        servicesReady: false,
        stats: {
            products: 0,
            categories: 0,
            revenue: 250000,
            customers: 0
        },
        recentActivity: [
            { id: 1, type: 'product', icon: 'fas fa-check', text: 'Dashboard initialized successfully', time: 'Just now' },
            { id: 2, type: 'content', icon: 'fas fa-user', text: 'Admin user authenticated', time: 'Just now' },
            { id: 3, type: 'order', icon: 'fas fa-database', text: 'Connected to Appwrite database', time: '1 minute ago' }
        ],
        
        sectionFiles: {
            'products': 'components/products.html',
            'orders': 'components/orders.html',
            'customers': 'components/customers.html',
            'content': 'components/content.html',
            'media': 'components/media.html',
            'categories': 'components/categories.html',
            'settings': 'components/settings.html',
            'analytics': 'components/analytics.html'
        },
        
        async init() {
            console.log('Dashboard initialized');
            
            // Listen for authentication events
            window.addEventListener('appwrite-ready', async (event) => {
                this.currentUser = event.detail.user;
                this.servicesReady = true;
                await this.loadDashboardData();
            });
            
            window.addEventListener('appwrite-error', (event) => {
                this.serviceError = true;
                this.serviceErrorMessage = event.detail.error;
                this.loading = false;
            });
            
            // Check if services are already ready
            if (window.dbService && window.authService) {
                const authState = await window.authService.checkAuthState();
                if (authState.authenticated) {
                    this.currentUser = authState.user;
                    this.servicesReady = true;
                    await this.loadDashboardData();
                } else {
                    this.authError = true;
                    this.loading = false;
                }
            }
            
            this.initializeFromState();
            window.addEventListener('hashchange', () => this.handleHashChange());
            window.addEventListener('resize', () => {
                this.sidebarOpen = window.innerWidth > 768;
            });
        },
        
        async loadDashboardData() {
            this.loading = true;
            this.serviceError = false;
            
            try {
                // Load basic stats
                const [productsResult, categoriesResult] = await Promise.all([
                    window.dbService.getProducts({ limit: 100 }),
                    window.dbService.getCategories()
                ]);
                
                this.stats.products = productsResult.total || 0;
                this.stats.categories = categoriesResult.total || 0;
                
                console.log('Dashboard data loaded:', this.stats);
                
            } catch (error) {
                console.error('Error loading dashboard data:', error);
                this.serviceError = true;
                this.serviceErrorMessage = `Failed to load dashboard data: ${error.message}`;
            } finally {
                this.loading = false;
            }
        },
        
        async retryServiceConnection() {
            this.loading = true;
            this.serviceError = false;
            
            try {
                if (window.dbService && window.authService) {
                    const authState = await window.authService.checkAuthState();
                    if (authState.authenticated) {
                        this.currentUser = authState.user;
                        await this.loadDashboardData();
                    } else {
                        this.authError = true;
                        this.loading = false;
                    }
                } else {
                    throw new Error('Services still not available');
                }
            } catch (error) {
                this.serviceError = true;
                this.serviceErrorMessage = 'Connection retry failed. Please refresh the page.';
                this.loading = false;
            }
        },
        
        goToLogin() {
            window.location.href = 'login.html';
        },
        
        initializeFromState() {
            let initialSection = window.location.hash.substring(1);
            if (!initialSection) {
                initialSection = localStorage.getItem('dashboardActiveSection') || 'dashboard';
            }
            const validSections = ['dashboard','products','orders','customers','content','media','categories','settings','analytics'];
            if (validSections.includes(initialSection)) {
                this.setActiveSection(initialSection, false);
            }
        },
        
        handleHashChange() {
            const section = window.location.hash.substring(1);
            if (section && section !== this.activeSection) {
                this.setActiveSection(section, false);
            }
        },
        
        toggleSidebar() {
            this.sidebarOpen = !this.sidebarOpen;
        },
        
        async setActiveSection(section, updateUrl = true) {
            if (!this.servicesReady && section !== 'dashboard') {
                alert('Services are not yet ready. Please wait or refresh the page.');
                return;
            }
            
            this.activeSection = section;
            if (updateUrl) {
                window.location.hash = section === 'dashboard' ? '' : section;
            }
            localStorage.setItem('dashboardActiveSection', section);
            if (window.innerWidth <= 768) {
                this.sidebarOpen = false;
            }
            if (section !== 'dashboard') {
                await this.loadSectionContent(section);
            }
        },
        
        async loadSectionContent(section) {
            this.loading = true;
            this.dynamicContent = '';
            
            try {
                const filePath = this.sectionFiles[section];
                if (!filePath) {
                    this.dynamicContent = this.getPlaceholderContent(section);
                    this.loading = false;
                    return;
                }

                const response = await fetch(filePath);
                if (!response.ok) {
                    this.dynamicContent = this.getPlaceholderContent(section);
                    this.loading = false;
                    return;
                }

                const content = await response.text();
                
                // Create temporary container to parse HTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = content;
                
                // Extract scripts
                const scripts = Array.from(tempDiv.querySelectorAll('script'));
                const scriptContents = [];
                
                scripts.forEach(script => {
                    if (!script.src) {
                        scriptContents.push(script.textContent);
                        script.remove();
                    }
                });
                
                // Get the container element
                const container = document.querySelector('[x-html="dynamicContent"]');
                if (!container) {
                    console.error('Dynamic content container not found');
                    this.loading = false;
                    return;
                }
                
                // Clear any existing content and Alpine instances
                container.innerHTML = '';
                
                // Insert the HTML WITHOUT Alpine processing it yet
                // We use innerHTML directly on container instead of x-html
                container.innerHTML = tempDiv.innerHTML;
                
                // Execute scripts synchronously to define component functions
                for (const scriptContent of scriptContents) {
                    try {
                        // Use Function constructor for better scope control
                        const scriptFunc = new Function(scriptContent);
                        scriptFunc.call(window);
                    } catch (error) {
                        console.error('Error executing script:', error);
                        this.dynamicContent = this.getErrorContent(section, error.message);
                        this.loading = false;
                        return;
                    }
                }
                
                // Give scripts time to register functions
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Now initialize Alpine on the loaded content
                try {
                    const firstChild = container.firstElementChild;
                    if (firstChild) {
                        // Check if the component function exists
                        const xDataAttr = firstChild.getAttribute('x-data');
                        if (xDataAttr) {
                            const funcName = xDataAttr.split('(')[0].trim();
                            if (funcName && typeof window[funcName] === 'undefined') {
                                throw new Error(`Component function '${funcName}' is not defined. Make sure the script executed properly.`);
                            }
                        }
                        
                        Alpine.initTree(firstChild);
                        console.log(`Successfully initialized ${section} component`);
                    }
                } catch (error) {
                    console.error('Error initializing Alpine:', error);
                    this.dynamicContent = this.getErrorContent(section, error.message);
                    this.loading = false;
                    return;
                }
                
            } catch (error) {
                console.error('Error loading content:', error);
                this.dynamicContent = this.getErrorContent(section, error.message);
            } finally {
                this.loading = false;
            }
        },
        
        getPlaceholderContent(section) {
            return `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">🚧</div>
                    <h2 style="font-size: 24px; margin-bottom: 12px; color: #374151;">${this.getPageTitle(section)}</h2>
                    <p style="color: #6b7280;">This section is under development. Coming soon!</p>
                </div>
            `;
        },
        
        getErrorContent(section, errorMessage) {
            return `
                <div style="text-align: center; padding: 60px 20px; max-width: 600px; margin: 0 auto;">
                    <div style="font-size: 48px; margin-bottom: 20px; color: #ef4444;">⚠️</div>
                    <h2 style="font-size: 24px; margin-bottom: 12px; color: #374151;">Failed to Load ${this.getPageTitle(section)}</h2>
                    <p style="color: #6b7280; margin-bottom: 20px;">There was an error loading this section. Please try refreshing the page.</p>
                    <div style="background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px; text-align: left;">
                        <p style="font-family: monospace; font-size: 12px; color: #991b1b; margin: 0; word-break: break-word;">${errorMessage}</p>
                    </div>
                    <div style="display: flex; gap: 12px; justify-content: center;">
                        <button onclick="location.reload()" style="background: #8B4A87; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer;">
                            <i class="fas fa-sync-alt"></i> Reload Page
                        </button>
                        <button onclick="console.clear()" style="background: #6b7280; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer;">
                            <i class="fas fa-eraser"></i> Clear Console
                        </button>
                    </div>
                </div>
            `;
        },
        
        getPageTitle(section = null) {
            const currentSection = section || this.activeSection;
            const titles = {
                dashboard: 'Dashboard',
                products: 'Products Management',
                orders: 'Orders Management',
                customers: 'Customers',
                content: 'Site Content',
                media: 'Media Library',
                categories: 'Categories',
                settings: 'Settings',
                analytics: 'Analytics'
            };
            return titles[currentSection] || 'Dashboard';
        },
        
        async handleLogout() {
            try {
                if (window.authService) {
                    await window.authService.logout();
                }
                localStorage.removeItem('dashboardActiveSection');
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Logout error:', error);
                // Force redirect even if logout fails
                window.location.href = 'login.html';
            }
        }
    }
}

// Make adminDashboard available globally for debugging
window.adminDashboard = adminDashboard;