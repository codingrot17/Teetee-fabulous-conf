// Enhanced Appwrite Configuration for TEETEE FABULOUS
import { Client, Account, Databases, Storage, Query, Permission, Role, ID } from 'https://cdn.skypack.dev/appwrite@13.0.0';

// Appwrite configuration - UPDATE THESE VALUES
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

// Enhanced Authentication Service
class AuthService {
    async login(email, password) {
        try {
            // Create session
            const session = await account.createEmailSession(email, password);
            
            // Get user details
            const user = await account.get();
            
            // Verify admin role by checking user document
            const userDoc = await databases.getDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.users,
                user.$id
            );
            
            if (userDoc.role !== 'admin') {
                await account.deleteSession('current');
                throw new Error('Access denied. Admin privileges required.');
            }
            
            // Update last login
            await databases.updateDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.users,
                user.$id,
                { last_login: new Date().toISOString() }
            );
            
            return { user: userDoc, session };
        } catch (error) {
            throw new Error(`Login failed: ${error.message}`);
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

    async getCurrentUser() {
        try {
            const user = await account.get();
            
            // Get full user document with role information
            const userDoc = await databases.getDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.users,
                user.$id
            );
            
            return userDoc;
        } catch (error) {
            return null;
        }
    }

    async createAdminUser(email, password, name) {
        try {
            // Create Appwrite auth user
            const user = await account.create(ID.unique(), email, password, name);
            
            // Create user document with admin role
            await databases.createDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.users,
                user.$id,
                {
                    email,
                    name,
                    role: 'admin',
                    status: 'active',
                    $createdAt: new Date().toISOString()
                },
                [
                    Permission.read(Role.user(user.$id)),
                    Permission.update(Role.user(user.$id))
                ]
            );
            
            return user;
        } catch (error) {
            throw new Error(`User creation failed: ${error.message}`);
        }
    }

    async checkAuthState() {
        try {
            const user = await this.getCurrentUser();
            if (user && user.role === 'admin' && user.status === 'active') {
                return { authenticated: true, user };
            }
            return { authenticated: false, user: null };
        } catch (error) {
            return { authenticated: false, user: null };
        }
    }
}

// Enhanced Database Service
class DatabaseService {
    // Products Management
    async createProduct(productData, imageFiles = []) {
        try {
            // Upload images first
            const imageIds = [];
            for (const file of imageFiles) {
                const fileResponse = await storage.createFile(
                    APPWRITE_CONFIG.bucketId,
                    ID.unique(),
                    file
                );
                imageIds.push(fileResponse.$id);
            }

            // Create product document
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
                },
                [
                    Permission.read(Role.any()),
                    Permission.update(Role.user('admin')),
                    Permission.delete(Role.user('admin'))
                ]
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
            // Upload new images if provided
            const newImageIds = [];
            for (const file of newImages) {
                const fileResponse = await storage.createFile(
                    APPWRITE_CONFIG.bucketId,
                    ID.unique(),
                    file
                );
                newImageIds.push(fileResponse.$id);
            }

            // Combine existing and new images
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
            // Get product first to delete associated images
            const product = await databases.getDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.products,
                productId
            );

            // Delete associated images
            if (product.images && product.images.length > 0) {
                for (const imageId of product.images) {
                    try {
                        await storage.deleteFile(APPWRITE_CONFIG.bucketId, imageId);
                    } catch (imageError) {
                        console.warn(`Failed to delete image ${imageId}:`, imageError);
                    }
                }
            }

            // Delete product document
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

    // Site Content Management
    async updateSiteContent(section, contentData) {
        try {
            const user = await authService.getCurrentUser();
            
            // Try to find existing content
            const existingContent = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.site_content,
                [Query.equal('section_name', section)]
            );

            const contentPayload = {
                section_name: section,
                content_type: 'json',
                content_data: JSON.stringify(contentData),
                $updatedAt: new Date().toISOString(),
                updated_by: user?.$id || 'unknown'
            };

            if (existingContent.documents.length > 0) {
                // Update existing
                return await databases.updateDocument(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.collections.site_content,
                    existingContent.documents[0].$id,
                    contentPayload
                );
            } else {
                // Create new
                return await databases.createDocument(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.collections.site_content,
                    ID.unique(),
                    contentPayload,
                    [
                        Permission.read(Role.any()),
                        Permission.update(Role.user('admin'))
                    ]
                );
            }
        } catch (error) {
            throw new Error(`Content update failed: ${error.message}`);
        }
    }

    async getSiteContent(section) {
        try {
            const content = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.site_content,
                [Query.equal('section_name', section)]
            );

            if (content.documents.length > 0) {
                return JSON.parse(content.documents[0].content_data);
            }
            
            return null;
        } catch (error) {
            console.warn(`Failed to fetch content for ${section}:`, error);
            return null;
        }
    }

    // Categories Management
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
                },
                [
                    Permission.read(Role.any()),
                    Permission.update(Role.user('admin')),
                    Permission.delete(Role.user('admin'))
                ]
            );
        } catch (error) {
            throw new Error(`Category creation failed: ${error.message}`);
        }
    }

    async getCategories() {
        try {
            return await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.categories,
                [Query.orderAsc('display_order')]
            );
        } catch (error) {
            throw new Error(`Failed to fetch categories: ${error.message}`);
        }
    }

    // Order Management
    async createOrder(orderData) {
        try {
            return await databases.createDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.orders,
                ID.unique(),
                {
                    customer_name: orderData.customer_name,
                    customer_email: orderData.customer_email,
                    customer_phone: orderData.customer_phone || '',
                    service_type: orderData.service_type,
                    message: orderData.message,
                    status: 'pending',
                    notes: '',
                    order_date: new Date().toISOString(),
                    $updatedAt: new Date().toISOString()
                },
                [
                    Permission.read(Role.user('admin')),
                    Permission.update(Role.user('admin'))
                ]
            );
        } catch (error) {
            throw new Error(`Order creation failed: ${error.message}`);
        }
    }

    async getOrders(filters = {}) {
        try {
            const queries = [Query.orderDesc('order_date')];
            
            if (filters.status) {
                queries.push(Query.equal('status', filters.status));
            }

            if (filters.limit) {
                queries.push(Query.limit(filters.limit));
            }

            return await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.orders,
                queries
            );
        } catch (error) {
            throw new Error(`Failed to fetch orders: ${error.message}`);
        }
    }

    async updateOrderStatus(orderId, status, notes = '') {
        try {
            return await databases.updateDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.orders,
                orderId,
                {
                    status,
                    notes,
                    $updatedAt: new Date().toISOString()
                }
            );
        } catch (error) {
            throw new Error(`Order update failed: ${error.message}`);
        }
    }

    // File Management
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

    // Settings Management
    async updateSetting(key, value, type = 'text', description = '') {
        try {
            // Check if setting exists
            const existing = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.settings,
                [Query.equal('setting_key', key)]
            );

            const settingData = {
                setting_key: key,
                setting_value: value,
                setting_type: type,
                description: description,
                $updatedAt: new Date().toISOString()
            };

            if (existing.documents.length > 0) {
                // Update existing
                return await databases.updateDocument(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.collections.settings,
                    existing.documents[0].$id,
                    settingData
                );
            } else {
                // Create new
                return await databases.createDocument(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.collections.settings,
                    ID.unique(),
                    settingData,
                    [
                        Permission.read(Role.any()),
                        Permission.update(Role.user('admin'))
                    ]
                );
            }
        } catch (error) {
            throw new Error(`Setting update failed: ${error.message}`);
        }
    }

    async getSetting(key) {
        try {
            const setting = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.settings,
                [Query.equal('setting_key', key)]
            );

            if (setting.documents.length > 0) {
                const doc = setting.documents[0];
                let value = doc.setting_value;
                
                // Parse based on type
                if (doc.setting_type === 'json') {
                    value = JSON.parse(value);
                } else if (doc.setting_type === 'number') {
                    value = parseFloat(value);
                } else if (doc.setting_type === 'boolean') {
                    value = value === 'true';
                }
                
                return value;
            }
            
            return null;
        } catch (error) {
            console.warn(`Failed to fetch setting ${key}:`, error);
            return null;
        }
    }
}

// Initialize services
const authService = new AuthService();
const dbService = new DatabaseService();

// Utility function to initialize default data
async function initializeDefaultData() {
    try {
        // Check if we have any products
        const products = await dbService.getProducts({ limit: 1 });
        
        if (products.total === 0) {
            console.log('No products found, creating sample data...');
            
            // Create default categories
            await dbService.createCategory({
                name: 'Premium',
                description: 'High-quality cakes with premium ingredients',
                color: '#D4A574',
                display_order: 1
            });
            
            await dbService.createCategory({
                name: 'VIP',
                description: 'Luxury cakes with premium decorations',
                color: '#8B4A87',
                display_order: 2
            });
            
            await dbService.createCategory({
                name: 'Special',
                description: 'Limited edition and special occasion cakes',
                color: '#e74c3c',
                display_order: 3
            });
            
            console.log('Default data initialized successfully');
        }
    } catch (error) {
        console.error('Error initializing default data:', error);
    }
}

// Export services and config
export {
    APPWRITE_CONFIG,
    client,
    account,
    databases,
    storage,
    authService,
    dbService,
    initializeDefaultData,
    Query,
    Permission,
    Role,
    ID
};