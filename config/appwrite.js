// Appwrite Configuration
import { Client, Account, Databases, Storage, Query, Permission, Role } from 'https://cdn.skypack.dev/appwrite@13.0.0';

// Appwrite configuration
const APPWRITE_CONFIG = {
    endpoint: 'https://cloud.appwrite.io/v1', // Replace with your Appwrite endpoint
    projectId: 'your-project-id', // Replace with your Appwrite project ID
    databaseId: 'teetee-fabulous-db',
    collections: {
        products: 'products',
        categories: 'categories',
        content: 'content',
        orders: 'orders',
        settings: 'settings',
        users: 'users'
    },
    bucketId: 'cake-images'
};

// Initialize Appwrite
const client = new Client()
    .setEndpoint(APPWRITE_CONFIG.endpoint)
    .setProject(APPWRITE_CONFIG.projectId);

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

// Admin Authentication Functions
class AuthService {
    async login(email, password) {
        try {
            const session = await account.createEmailSession(email, password);
            
            // Check if user has admin privileges
            const user = await account.get();
            if (!this.isAdmin(user)) {
                await account.deleteSession('current');
                throw new Error('Access denied. Admin privileges required.');
            }
            
            return { user, session };
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
            return user;
        } catch (error) {
            return null;
        }
    }

    async createAdminUser(email, password, name) {
        try {
            const user = await account.create('unique()', email, password, name);
            
            // Create user document with admin role
            await databases.createDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.users,
                user.$id,
                {
                    email,
                    name,
                    role: 'admin',
                    created_at: new Date().toISOString()
                }
            );
            
            return user;
        } catch (error) {
            throw new Error(`User creation failed: ${error.message}`);
        }
    }

    isAdmin(user) {
        // Check user labels or custom attributes for admin role
        return user.labels && user.labels.includes('admin');
    }

    async checkAuthState() {
        try {
            const user = await this.getCurrentUser();
            if (user && this.isAdmin(user)) {
                return { authenticated: true, user };
            }
            return { authenticated: false, user: null };
        } catch (error) {
            return { authenticated: false, user: null };
        }
    }
}

// Database Service for CRUD operations
class DatabaseService {
    // Product Management
    async createProduct(productData, imageFiles = []) {
        try {
            // Upload images first
            const imageIds = [];
            for (const file of imageFiles) {
                const fileResponse = await storage.createFile(
                    APPWRITE_CONFIG.bucketId,
                    'unique()',
                    file
                );
                imageIds.push(fileResponse.$id);
            }

            // Create product document
            const product = await databases.createDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.products,
                'unique()',
                {
                    ...productData,
                    images: imageIds,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
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
            const queries = [Query.orderDesc('created_at')];
            
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

            return products;
        } catch (error) {
            throw new Error(`Failed to fetch products: ${error.message}`);
        }
    }

    async updateProduct(productId, updateData, newImages = []) {
        try {
            // Upload new images if provided
            if (newImages.length > 0) {
                const imageIds = [];
                for (const file of newImages) {
                    const fileResponse = await storage.createFile(
                        APPWRITE_CONFIG.bucketId,
                        'unique()',
                        file
                    );
                    imageIds.push(fileResponse.$id);
                }
                updateData.images = [...(updateData.images || []), ...imageIds];
            }

            const product = await databases.updateDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.products,
                productId,
                {
                    ...updateData,
                    updated_at: new Date().toISOString()
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

    // Content Management
    async updateSiteContent(section, contentData) {
        try {
            // Try to update existing content
            try {
                const existingContent = await databases.listDocuments(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.collections.content,
                    [Query.equal('section_name', section)]
                );

                if (existingContent.documents.length > 0) {
                    // Update existing
                    return await databases.updateDocument(
                        APPWRITE_CONFIG.databaseId,
                        APPWRITE_CONFIG.collections.content,
                        existingContent.documents[0].$id,
                        {
                            content_data: JSON.stringify(contentData),
                            updated_at: new Date().toISOString()
                        }
                    );
                }
            } catch (error) {
                // Content doesn't exist, create new
            }

            // Create new content entry
            return await databases.createDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.content,
                'unique()',
                {
                    section_name: section,
                    content_type: 'json',
                    content_data: JSON.stringify(contentData),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                [
                    Permission.read(Role.any()),
                    Permission.update(Role.user('admin'))
                ]
            );
        } catch (error) {
            throw new Error(`Content update failed: ${error.message}`);
        }
    }

    async getSiteContent(section) {
        try {
            const content = await databases.listDocuments(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.content,
                [Query.equal('section_name', section)]
            );

            if (content.documents.length > 0) {
                return JSON.parse(content.documents[0].content_data);
            }
            
            return null;
        } catch (error) {
            throw new Error(`Failed to fetch content: ${error.message}`);
        }
    }

    // Categories Management
    async createCategory(categoryData) {
        try {
            return await databases.createDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.categories,
                'unique()',
                {
                    ...categoryData,
                    created_at: new Date().toISOString()
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
                'unique()',
                {
                    ...orderData,
                    status: 'pending',
                    order_date: new Date().toISOString()
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

    async getOrders(status = null) {
        try {
            const queries = [Query.orderDesc('order_date')];
            
            if (status) {
                queries.push(Query.equal('status', status));
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

    // File/Image Management
    async uploadImage(file, folder = 'general') {
        try {
            const fileResponse = await storage.createFile(
                APPWRITE_CONFIG.bucketId,
                'unique()',
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
}

// Initialize services
const authService = new AuthService();
const dbService = new DatabaseService();

// Export services and config
export {
    APPWRITE_CONFIG,
    client,
    account,
    databases,
    storage,
    authService,
    dbService,
    Query,
    Permission,
    Role
};