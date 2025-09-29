
        import { Client, Account, Databases, Storage, Query, Permission, Role, ID } from 'https://cdn.skypack.dev/appwrite@13.0.0';

        // Appwrite configuration
        const APPWRITE_CONFIG = {
            endpoint: 'https://cloud.appwrite.io/v1', 
            projectId: '68ca0f1c00035ab92fa8', 
            databaseId: '68cdb1dc00266358cd6b',
            collections: {
                products: 'products',
                categories: 'categories',
                site_content: 'site_content',
                orders: 'orders',
                users: 'users',
                settings: 'settings'
            },
            bucketId: '68cdb9ef003cf2887d53'
        };

        // Initialize Appwrite
        const client = new Client()
            .setEndpoint(APPWRITE_CONFIG.endpoint)
            .setProject(APPWRITE_CONFIG.projectId);

        const account = new Account(client);
        const databases = new Databases(client);
        const storage = new Storage(client);

        // Auth Service
        class AuthService {
            async getCurrentUser() {
                try {
                    const user = await account.get();
                    return user;
                } catch (error) {
                    return null;
                }
            }

            async logout() {
                try {
                    await account.deleteSession('current');
                    return true;
                } catch (error) {
                    throw new Error(`Logout failed: ${error.message}`);
                }
            }

            async checkAuthState() {
                try {
                    const user = await this.getCurrentUser();
                    return { authenticated: !!user, user };
                } catch (error) {
                    return { authenticated: false, user: null };
                }
            }
        }

        // Database Service
        class DatabaseService {
            async createProduct(productData, imageFiles = []) {
                try {
                    const imageIds = [];
                    for (const file of imageFiles) {
                        const fileResponse = await storage.createFile(
                            APPWRITE_CONFIG.bucketId,
                            ID.unique(),
                            file
                        );
                        imageIds.push(fileResponse.$id);
                    }

                    const product = await databases.createDocument(
                        APPWRITE_CONFIG.databaseId,
                        APPWRITE_CONFIG.collections.products,
                        ID.unique(),
                        {
                            name: productData.name,
                            description: productData.description,
                            price: parseInt(productData.price),
                            category: productData.category,
                            status: productData.status || 'active',
                            images: imageIds,
                            $createdAt: new Date().toISOString(),
                            $updatedAt: new Date().toISOString()
                        }
                    );

                    return product;
                } catch (error) {
                    throw new Error(`Product creation failed: ${error.message}`);
                }
            }

            async getProducts(filters = {}) {
                try {
                    const queries = [Query.orderDesc('$createdAt')];
                    
                    if (filters.category) {
                        queries.push(Query.equal('category', filters.category));
                    }
                    
                    if (filters.status) {
                        queries.push(Query.equal('status', filters.status));
                    }

                    if (filters.limit) {
                        queries.push(Query.limit(filters.limit));
                    }

                    const products = await databases.listDocuments(
                        APPWRITE_CONFIG.databaseId,
                        APPWRITE_CONFIG.collections.products,
                        queries
                    );

                    // Add image URLs to products
                    products.documents = products.documents.map(product => ({
                        ...product,
                        imageUrls: product.images?.map(imageId => this.getImageUrl(imageId)) || []
                    }));

                    return products;
                } catch (error) {
                    throw new Error(`Failed to fetch products: ${error.message}`);
                }
            }

            async updateProduct(productId, updateData, newImages = []) {
                try {
                    const newImageIds = [];
                    for (const file of newImages) {
                        const fileResponse = await storage.createFile(
                            APPWRITE_CONFIG.bucketId,
                            ID.unique(),
                            file
                        );
                        newImageIds.push(fileResponse.$id);
                    }

                    const existingImages = updateData.existingImages || [];
                    const allImages = [...existingImages, ...newImageIds];

                    const product = await databases.updateDocument(
                        APPWRITE_CONFIG.databaseId,
                        APPWRITE_CONFIG.collections.products,
                        productId,
                        {
                            name: updateData.name,
                            description: updateData.description,
                            price: parseInt(updateData.price),
                            category: updateData.category,
                            status: updateData.status,
                            images: allImages,
                            $updatedAt: new Date().toISOString()
                        }
                    );

                    return product;
                } catch (error) {
                    throw new Error(`Product update failed: ${error.message}`);
                }
            }

            async deleteProduct(productId) {
                try {
                    const product = await databases.getDocument(
                        APPWRITE_CONFIG.databaseId,
                        APPWRITE_CONFIG.collections.products,
                        productId
                    );

                    if (product.images && product.images.length > 0) {
                        for (const imageId of product.images) {
                            try {
                                await storage.deleteFile(APPWRITE_CONFIG.bucketId, imageId);
                            } catch (imageError) {
                                console.warn(`Failed to delete image ${imageId}:`, imageError);
                            }
                        }
                    }

                    await databases.deleteDocument(
                        APPWRITE_CONFIG.databaseId,
                        APPWRITE_CONFIG.collections.products,
                        productId
                    );

                    return true;
                } catch (error) {
                    throw new Error(`Product deletion failed: ${error.message}`);
                }
            }

            async getCategories() {
                try {
                    return await databases.listDocuments(
                        APPWRITE_CONFIG.databaseId,
                        APPWRITE_CONFIG.collections.categories,
                        [Query.orderAsc('$createdAt')]
                    );
                } catch (error) {
                    throw new Error(`Failed to fetch categories: ${error.message}`);
                }
            }

            async createCategory(categoryData) {
                try {
                    return await databases.createDocument(
                        APPWRITE_CONFIG.databaseId,
                        APPWRITE_CONFIG.collections.categories,
                        ID.unique(),
                        {
                            name: categoryData.name,
                            description: categoryData.description || '',
                            color: categoryData.color || '#8B4A87',
                            display_order: categoryData.display_order || 0,
                            status: categoryData.status || 'active',
                            $createdAt: new Date().toISOString()
                        }
                    );
                } catch (error) {
                    throw new Error(`Category creation failed: ${error.message}`);
                }
            }

            async uploadImage(file) {
                try {
                    const fileResponse = await storage.createFile(
                        APPWRITE_CONFIG.bucketId,
                        ID.unique(),
                        file
                    );

                    return {
                        id: fileResponse.$id,
                        url: this.getImageUrl(fileResponse.$id),
                        name: file.name,
                        size: file.size
                    };
                } catch (error) {
                    throw new Error(`Image upload failed: ${error.message}`);
                }
            }

            getImageUrl(fileId) {
                if (!fileId) return null;
                return `${APPWRITE_CONFIG.endpoint}/storage/buckets/${APPWRITE_CONFIG.bucketId}/files/${fileId}/view?project=${APPWRITE_CONFIG.projectId}`;
            }

            async deleteImage(fileId) {
                try {
                    await storage.deleteFile(APPWRITE_CONFIG.bucketId, fileId);
                    return true;
                } catch (error) {
                    throw new Error(`Image deletion failed: ${error.message}`);
                }
            }

            // Initialize default categories if none exist
            async initializeDefaultData() {
                try {
                    const categories = await this.getCategories();
                    
                    if (categories.total === 0) {
                        console.log('Creating default categories...');
                        
                        await this.createCategory({
                            name: 'Premium',
                            description: 'High-quality cakes with premium ingredients',
                            color: '#D4A574',
                            display_order: 1
                        });
                        
                        await this.createCategory({
                            name: 'VIP',
                            description: 'Luxury cakes with premium decorations',
                            color: '#8B4A87',
                            display_order: 2
                        });
                        
                        await this.createCategory({
                            name: 'Special',
                            description: 'Limited edition and special occasion cakes',
                            color: '#e74c3c',
                            display_order: 3
                        });
                        
                        console.log('Default categories created successfully');
                    }
                } catch (error) {
                    console.error('Error initializing default data:', error);
                }
            }
        }

        // Initialize services
        const authService = new AuthService();
        const dbService = new DatabaseService();
        
        // Expose to global scope
        window.APPWRITE_CONFIG = APPWRITE_CONFIG;
        window.dbService = dbService;
        window.authService = authService;
        window.appwriteClient = client;
        window.appwriteAccount = account;
        window.appwriteDatabases = databases;
        window.appwriteStorage = storage;
        window.Query = Query;
        window.Permission = Permission;
        window.Role = Role;
        window.ID = ID;

        // Check authentication and initialize
        window.addEventListener('DOMContentLoaded', async () => {
            try {
                const authState = await authService.checkAuthState();
                
                if (!authState.authenticated) {
                    console.log('User not authenticated, redirecting to login');
                    window.location.href = 'login.html';
                    return;
                }
                
                console.log('User authenticated:', authState.user);
                
                // Initialize default data
                await dbService.initializeDefaultData();
                console.log('Appwrite services initialized successfully');
                
                // Dispatch custom event to notify Alpine components
                window.dispatchEvent(new CustomEvent('appwrite-ready', {
                    detail: { user: authState.user }
                }));
                
            } catch (error) {
                console.error('Failed to initialize services:', error);
                // Still allow access if authentication fails, but show error
                window.dispatchEvent(new CustomEvent('appwrite-error', {
                    detail: { error: error.message }
                }));
            }
        });
  
   